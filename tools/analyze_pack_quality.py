#!/usr/bin/env python3
"""Analyze generated audio packs for loop quality and compatibility.

Install dependencies (same as other audio tools):
    python3 -m pip install librosa soundfile numpy

Run:
    python3 tools/analyze_pack_quality.py

Writes:
    reports/audio-pack-quality-report.md
"""

from __future__ import annotations

import argparse
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from prepare_audio_loops import TARGET_BPM, TARGET_LOOP_SECONDS, estimate_bpm


PROJECT_ROOT = Path(__file__).resolve().parents[1]
GENERATED_AUDIO_ROOT = PROJECT_ROOT / "src" / "assets" / "audio" / "generated"
PACK_CONFIG_DIR = PROJECT_ROOT / "src" / "generated" / "audioPacks"
REPORT_PATH = PROJECT_ROOT / "reports" / "audio-pack-quality-report.md"

TARGET_DURATION_S = TARGET_LOOP_SECONDS
BPM_TOLERANCE = 4.0
DURATION_TOLERANCE_S = 0.15
SILENCE_DB = 40.0
LOUD_RMS_DBFS = -10.0
QUIET_RMS_DBFS = -28.0

PITCH_CLASSES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

# Krumhansl-Kessler major/minor profiles (rotated by pitch class).
MAJOR_PROFILE = np.array(
    [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
    dtype=np.float32,
)
MINOR_PROFILE = np.array(
    [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17],
    dtype=np.float32,
)

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "beat": (
        "beat",
        "drum",
        "drums",
        "kick",
        "snare",
        "clap",
        "hat",
        "hihat",
        "groove",
        "rhythm",
        "perc",
        "percussion",
    ),
    "bass": ("bass", "sub", "low", "reese", "acid", "303"),
    "melody": (
        "melody",
        "lead",
        "synth",
        "arp",
        "arpeggio",
        "pluck",
        "chord",
        "pad",
        "piano",
        "keys",
        "riff",
        "hook",
    ),
    "fx": (
        "fx",
        "effect",
        "impact",
        "riser",
        "sweep",
        "transition",
        "noise",
        "glitch",
    ),
    "voice": ("voice", "vocal", "vox", "chant", "phrase", "acapella"),
}

# Pairs that usually layer well in an Incredibox-style mix.
COMPATIBLE_CATEGORY_PAIRS = {
    frozenset({"beat", "bass"}),
    frozenset({"beat", "melody"}),
    frozenset({"beat", "voice"}),
    frozenset({"beat", "fx"}),
    frozenset({"beat", "percussion"}),
    frozenset({"bass", "melody"}),
    frozenset({"bass", "fx"}),
    frozenset({"melody", "fx"}),
    frozenset({"melody", "voice"}),
    frozenset({"voice", "fx"}),
    frozenset({"percussion", "bass"}),
    frozenset({"percussion", "melody"}),
}

CLASH_CATEGORY_PAIRS = {
    frozenset({"melody", "melody"}),
    frozenset({"voice", "voice"}),
    frozenset({"fx", "fx"}),
}


@dataclass
class LoopAnalysis:
    pack_id: str
    filename: str
    path: Path
    config_category: str | None
    duration_s: float
    estimated_bpm: float | None
    estimated_key: str | None
    key_confidence: float
    rms_dbfs: float
    peak_linear: float
    silence_start_ms: float
    silence_end_ms: float
    category: str
    suggested_category: str
    energy_level: str
    energy_score: float
    too_busy: bool
    busy_score: float
    suitable_for_layering: bool
    layering_notes: str
    flags: list[str] = field(default_factory=list)


@dataclass
class PairCompatibility:
    pack_id: str
    loop_a: str
    loop_b: str
    score: float
    verdict: str
    reasons: list[str]


def load_mono(path: Path) -> tuple[np.ndarray, int]:
    """Load WAV as mono float32."""
    samples, sample_rate = sf.read(path, always_2d=True)
    mono = samples.mean(axis=1).astype(np.float32)
    peak = float(np.max(np.abs(mono)))
    if peak > 1.0:
        mono = mono / peak
    return mono, int(sample_rate)


def measure_edge_silence_ms(samples: np.ndarray, sample_rate: int, top_db: float = SILENCE_DB) -> tuple[float, float]:
    """Estimate leading/trailing silence in milliseconds."""
    if samples.size == 0:
        return 0.0, 0.0

    trimmed, _ = librosa.effects.trim(samples, top_db=top_db)
    if trimmed.size == 0:
        return float(samples.size / sample_rate * 1000), float(samples.size / sample_rate * 1000)

    nonzero = np.where(np.abs(samples) > librosa.db_to_amplitude(-top_db))[0]
    if nonzero.size == 0:
        return 0.0, 0.0
    lead = float(nonzero[0] / sample_rate * 1000)
    trail = float((samples.size - 1 - nonzero[-1]) / sample_rate * 1000)
    return lead, trail


def estimate_key(samples: np.ndarray, sample_rate: int) -> tuple[str | None, float]:
    """Estimate musical key from chroma (major/minor template correlation)."""
    if samples.size < sample_rate // 2:
        return None, 0.0

    try:
        chroma = librosa.feature.chroma_cqt(y=samples, sr=sample_rate)
        chroma_mean = np.mean(chroma, axis=1)
        if float(np.sum(chroma_mean)) < 1e-6:
            return None, 0.0
        chroma_mean = chroma_mean / np.linalg.norm(chroma_mean)
    except Exception:
        return None, 0.0

    best_key: str | None = None
    best_corr = -1.0
    for shift in range(12):
        rotated = np.roll(chroma_mean, -shift)
        major_corr = float(np.corrcoef(rotated, MAJOR_PROFILE)[0, 1])
        minor_corr = float(np.corrcoef(rotated, MINOR_PROFILE)[0, 1])
        if major_corr > best_corr:
            best_corr = major_corr
            best_key = f"{PITCH_CLASSES[shift]} major"
        if minor_corr > best_corr:
            best_corr = minor_corr
            best_key = f"{PITCH_CLASSES[shift]} minor"

    if best_key is None or not math.isfinite(best_corr):
        return None, 0.0
    return best_key, max(0.0, min(1.0, best_corr))


def category_from_filename(stem: str) -> str | None:
    """Infer category prefix from output filename (beat-1, melody-2, etc.)."""
    match = re.match(r"^([a-z]+)-\d+$", stem.lower())
    if match:
        cat = match.group(1)
        if cat == "effect":
            return "fx"
        return cat
    return None


def suggest_category(
    filename: str,
    config_category: str | None,
    onset_rate: float,
    spectral_centroid: float,
    zero_crossing_rate: float,
) -> str:
    """Heuristic category suggestion from name + timbral features."""
    stem = Path(filename).stem.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(k in stem for k in keywords):
            return category

    if config_category:
        return config_category

    if onset_rate > 6.5 and spectral_centroid < 2200:
        return "beat"
    if onset_rate > 5.0 and spectral_centroid < 1600:
        return "bass"
    if zero_crossing_rate > 0.12 and spectral_centroid > 3500:
        return "fx"
    if spectral_centroid > 1800 and onset_rate < 4.0:
        return "melody"
    if spectral_centroid > 2500 and onset_rate > 3.0:
        return "voice"
    return "melody"


def spectral_flux_mean(samples: np.ndarray, sample_rate: int) -> float:
    """Mean positive spectral flux (librosa has no spectral_flux helper)."""
    if samples.size < sample_rate // 8:
        return 0.0
    magnitude = np.abs(librosa.stft(samples))
    if magnitude.shape[1] < 2:
        return 0.0
    diff = np.diff(magnitude, axis=1)
    flux = np.sqrt(np.sum(np.maximum(diff, 0.0) ** 2, axis=0))
    return float(np.mean(flux)) if flux.size else 0.0


def energy_label(score: float) -> str:
    if score < 0.25:
        return "low"
    if score < 0.55:
        return "medium"
    if score < 0.8:
        return "high"
    return "very high"


def analyze_busy(samples: np.ndarray, sample_rate: int) -> tuple[bool, float]:
    """Busy loops have dense onsets and high spectral flux."""
    if samples.size < sample_rate // 4:
        return False, 0.0

    onset_env = librosa.onset.onset_strength(y=samples, sr=sample_rate)
    onset_rate = float(np.mean(onset_env > np.percentile(onset_env, 75)))
    flux_mean = spectral_flux_mean(samples, sample_rate)
    score = float(np.clip(0.55 * onset_rate + 0.45 * min(flux_mean * 8.0, 1.0), 0.0, 1.0))
    return score >= 0.62, score


def analyze_layering(
    category: str,
    too_busy: bool,
    rms_dbfs: float,
    duration_s: float,
    silence_start_ms: float,
    silence_end_ms: float,
) -> tuple[bool, str]:
    """Whether a loop is a good layering candidate."""
    notes: list[str] = []
    ok = True

    if too_busy and category in {"melody", "voice", "fx"}:
        ok = False
        notes.append("dense arrangement competes with other layers")

    if rms_dbfs > LOUD_RMS_DBFS:
        ok = False
        notes.append("very loud relative to typical loop headroom")

    if abs(duration_s - TARGET_DURATION_S) > DURATION_TOLERANCE_S:
        ok = False
        notes.append(f"duration {duration_s:.2f}s != target {TARGET_DURATION_S:.1f}s")

    if silence_start_ms > 80 or silence_end_ms > 80:
        ok = False
        notes.append("noticeable silence at loop edges")

    if category in {"beat", "bass", "percussion"} and rms_dbfs < QUIET_RMS_DBFS:
        notes.append("may be too quiet under drums")

    if not notes:
        notes.append("stable level and density for stacking")
    return ok, "; ".join(notes)


def parse_pack_configs() -> dict[str, dict[str, str]]:
    """Parse pack TS configs for filename -> category."""
    mapping: dict[str, dict[str, str]] = {}
    if not PACK_CONFIG_DIR.is_dir():
        return mapping

    for config_path in sorted(PACK_CONFIG_DIR.glob("*.ts")):
        text = config_path.read_text(encoding="utf-8")
        pack_match = re.search(r'id:\s*"([^"]+)"', text)
        if not pack_match:
            continue
        pack_id = pack_match.group(1)
        entries: dict[str, str] = {}
        blocks = re.findall(
            r'category:\s*"([^"]+)"[\s\S]*?(?:filename|audioFile):\s*"([^"]+)"',
            text,
        )
        for category, filename in blocks:
            entries[filename] = category
        mapping[pack_id] = entries
    return mapping


def discover_packs() -> list[tuple[str, Path]]:
    """Return (pack_id, directory) for each generated pack folder."""
    packs: list[tuple[str, Path]] = []
    if not GENERATED_AUDIO_ROOT.is_dir():
        return packs
    for pack_dir in sorted(GENERATED_AUDIO_ROOT.iterdir()):
        if pack_dir.is_dir():
            packs.append((pack_dir.name, pack_dir))
    return packs


def analyze_loop(
    pack_id: str,
    path: Path,
    config_categories: dict[str, str],
) -> LoopAnalysis:
    samples, sample_rate = load_mono(path)
    duration_s = float(samples.size / sample_rate) if sample_rate else 0.0

    rms = float(np.sqrt(np.mean(samples**2))) if samples.size else 0.0
    rms_dbfs = float(20.0 * np.log10(max(rms, 1e-9)))
    peak = float(np.max(np.abs(samples))) if samples.size else 0.0

    bpm = estimate_bpm(samples, sample_rate)
    key, key_conf = estimate_key(samples, sample_rate)
    silence_start_ms, silence_end_ms = measure_edge_silence_ms(samples, sample_rate)

    config_category = config_categories.get(path.name)
    filename_category = category_from_filename(path.stem)
    category = config_category or filename_category or "unknown"

    onset_env = librosa.onset.onset_strength(y=samples, sr=sample_rate) if samples.size else np.array([])
    onset_rate = float(np.mean(onset_env)) if onset_env.size else 0.0
    centroid = float(np.mean(librosa.feature.spectral_centroid(y=samples, sr=sample_rate))) if samples.size else 0.0
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(samples))) if samples.size else 0.0

    suggested = suggest_category(path.name, category if category != "unknown" else None, onset_rate, centroid, zcr)

    flux_mean = spectral_flux_mean(samples, sample_rate) if samples.size else 0.0
    energy_score = float(
        np.clip(
            0.4 * (rms_dbfs + 40.0) / 35.0
            + 0.35 * min(onset_rate / 2.0, 1.0)
            + 0.25 * min(flux_mean * 6.0, 1.0),
            0.0,
            1.0,
        )
    )

    too_busy, busy_score = analyze_busy(samples, sample_rate)
    suitable, layering_notes = analyze_layering(
        category, too_busy, rms_dbfs, duration_s, silence_start_ms, silence_end_ms
    )

    flags: list[str] = []
    if abs(duration_s - TARGET_DURATION_S) > DURATION_TOLERANCE_S:
        flags.append("duration-mismatch")
    if bpm is not None and abs(bpm - TARGET_BPM) > BPM_TOLERANCE:
        flags.append("bpm-drift")
    elif bpm is None:
        flags.append("bpm-unknown")
    if peak >= 0.99:
        flags.append("near-clip")
    if rms_dbfs > LOUD_RMS_DBFS:
        flags.append("too-loud")
    if rms_dbfs < QUIET_RMS_DBFS and category in {"beat", "bass"}:
        flags.append("too-quiet")
    if too_busy:
        flags.append("too-busy")
    if category != "unknown" and suggested != category:
        flags.append("category-mismatch")
    if key_conf < 0.35:
        flags.append("weak-key-estimate")

    return LoopAnalysis(
        pack_id=pack_id,
        filename=path.name,
        path=path,
        config_category=config_category,
        duration_s=duration_s,
        estimated_bpm=bpm,
        estimated_key=key,
        key_confidence=key_conf,
        rms_dbfs=rms_dbfs,
        peak_linear=peak,
        silence_start_ms=silence_start_ms,
        silence_end_ms=silence_end_ms,
        category=category,
        suggested_category=suggested,
        energy_level=energy_label(energy_score),
        energy_score=energy_score,
        too_busy=too_busy,
        busy_score=busy_score,
        suitable_for_layering=suitable,
        layering_notes=layering_notes,
        flags=flags,
    )


def key_compatible(key_a: str | None, key_b: str | None, min_conf: float = 0.35) -> bool | None:
    """True if same key, False if likely clash, None if unknown."""
    if not key_a or not key_b:
        return None
    root_a, mode_a = key_a.rsplit(" ", 1)
    root_b, mode_b = key_b.rsplit(" ", 1)
    if root_a == root_b and mode_a == mode_b:
        return True
    # Relative major/minor share pitch classes.
    rel_major = {"A": "F#", "B": "G#", "C": "A", "D": "B", "E": "C#", "F": "D", "G": "E"}
    rel_minor = {v: k for k, v in rel_major.items()}
    if mode_a != mode_b:
        if mode_a == "major" and rel_major.get(root_a) == root_b:
            return True
        if mode_a == "minor" and rel_minor.get(root_a) == root_b:
            return True
    return False


def bpm_compatible(bpm_a: float | None, bpm_b: float | None) -> bool | None:
    if bpm_a is None or bpm_b is None:
        return None
    diff = abs(bpm_a - bpm_b)
    # Account for half/double tempo ambiguity.
    half_double = min(abs(bpm_a - bpm_b * 2), abs(bpm_a * 2 - bpm_b), diff)
    return half_double <= BPM_TOLERANCE


def pair_compatibility(a: LoopAnalysis, b: LoopAnalysis) -> PairCompatibility:
    reasons: list[str] = []
    score = 0.5

    cat_pair = frozenset({a.category, b.category})
    if a.category == "unknown" or b.category == "unknown":
        reasons.append("unknown category")
        score -= 0.05
    elif cat_pair in COMPATIBLE_CATEGORY_PAIRS:
        reasons.append("complementary categories")
        score += 0.2
    elif cat_pair in CLASH_CATEGORY_PAIRS:
        reasons.append("same category may mask each other")
        score -= 0.25

    bpm_ok = bpm_compatible(a.estimated_bpm, b.estimated_bpm)
    if bpm_ok is True:
        reasons.append("tempos align")
        score += 0.15
    elif bpm_ok is False:
        reasons.append("tempo mismatch")
        score -= 0.3

    key_ok = key_compatible(a.estimated_key, b.estimated_key)
    if key_ok is True:
        reasons.append("keys align")
        score += 0.15
    elif key_ok is False:
        reasons.append("key clash risk")
        score -= 0.2

    rms_diff = abs(a.rms_dbfs - b.rms_dbfs)
    if rms_diff > 10:
        reasons.append("large loudness gap")
        score -= 0.15
    elif rms_diff < 4:
        reasons.append("balanced loudness")
        score += 0.05

    if a.too_busy and b.too_busy:
        reasons.append("both loops are busy")
        score -= 0.25

    dur_diff = abs(a.duration_s - b.duration_s)
    if dur_diff > DURATION_TOLERANCE_S:
        reasons.append("duration mismatch")
        score -= 0.2

    if a.suitable_for_layering and b.suitable_for_layering:
        score += 0.1

    score = float(np.clip(score, 0.0, 1.0))
    if score >= 0.72:
        verdict = "works well"
    elif score <= 0.42:
        verdict = "clash"
    else:
        verdict = "neutral"

    return PairCompatibility(
        pack_id=a.pack_id,
        loop_a=a.filename,
        loop_b=b.filename,
        score=score,
        verdict=verdict,
        reasons=reasons,
    )


def loops_to_replace(loops: list[LoopAnalysis]) -> list[LoopAnalysis]:
    """Loops that should be re-ingested or swapped."""
    replace: list[LoopAnalysis] = []
    for loop in loops:
        critical = {
            "duration-mismatch",
            "near-clip",
            "too-loud",
            "too-busy",
            "bpm-drift",
        }
        if critical & set(loop.flags):
            replace.append(loop)
        elif not loop.suitable_for_layering and loop.category in {"beat", "bass", "melody"}:
            replace.append(loop)
    return replace


def format_loop_table(loop: LoopAnalysis) -> str:
    bpm = f"{loop.estimated_bpm:.1f}" if loop.estimated_bpm else "—"
    key = loop.estimated_key or "—"
    if loop.estimated_key:
        key += f" ({loop.key_confidence:.0%})"
    return (
        f"| `{loop.filename}` | {loop.duration_s:.3f}s | {bpm} | {key} | "
        f"{loop.rms_dbfs:.1f} dBFS | {loop.peak_linear:.3f} | "
        f"{loop.silence_start_ms:.0f} / {loop.silence_end_ms:.0f} ms | "
        f"{loop.category} | {loop.suggested_category} | {loop.energy_level} | "
        f"{'yes' if loop.too_busy else 'no'} | "
        f"{'yes' if loop.suitable_for_layering else 'no'} | "
        f"{', '.join(loop.flags) or '—'} |"
    )


def build_report(all_loops: dict[str, list[LoopAnalysis]], pairs_by_pack: dict[str, list[PairCompatibility]]) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines: list[str] = [
        "# Audio Pack Quality Report",
        "",
        f"Generated by `tools/analyze_pack_quality.py` on {now}.",
        "",
        "Target mix reference: **100 BPM**, **9.6 s** loops (4 bars).",
        "",
        "---",
        "",
    ]

    for pack_id, loops in all_loops.items():
        lines.append(f"## Pack: `{pack_id}`")
        lines.append("")
        lines.append(f"Loops analyzed: **{len(loops)}**")
        lines.append("")
        lines.append("### Per-loop metrics")
        lines.append("")
        lines.append(
            "| File | Duration | BPM | Key | RMS | Peak | Silence start/end | "
            "Category | Suggested | Energy | Busy | Layer OK | Flags |"
        )
        lines.append(
            "| --- | ---: | ---: | --- | ---: | ---: | --- | "
            "--- | --- | --- | --- | --- | --- |"
        )
        for loop in sorted(loops, key=lambda item: item.filename):
            lines.append(format_loop_table(loop))
        lines.append("")

        pack_pairs = pairs_by_pack.get(pack_id, [])
        good = [p for p in pack_pairs if p.verdict == "works well"]
        bad = [p for p in pack_pairs if p.verdict == "clash"]
        loud = [loop for loop in loops if "too-loud" in loop.flags or loop.peak_linear >= 0.99]
        replace = loops_to_replace(loops)

        lines.append("### Compatibility")
        lines.append("")
        lines.append("#### Works well together (score ≥ 0.72)")
        lines.append("")
        if good:
            for pair in sorted(good, key=lambda p: -p.score)[:25]:
                reason = "; ".join(pair.reasons) if pair.reasons else "general fit"
                lines.append(
                    f"- `{pair.loop_a}` + `{pair.loop_b}` — **{pair.score:.2f}** ({reason})"
                )
            if len(good) > 25:
                lines.append(f"- … and {len(good) - 25} more pairs")
        else:
            lines.append("- No strong pairings detected.")
        lines.append("")

        lines.append("#### Likely clashes (score ≤ 0.42)")
        lines.append("")
        if bad:
            for pair in sorted(bad, key=lambda p: p.score)[:25]:
                reason = "; ".join(pair.reasons) if pair.reasons else "multiple issues"
                lines.append(
                    f"- `{pair.loop_a}` + `{pair.loop_b}` — **{pair.score:.2f}** ({reason})"
                )
            if len(bad) > 25:
                lines.append(f"- … and {len(bad) - 25} more pairs")
        else:
            lines.append("- No severe clashes flagged.")
        lines.append("")

        lines.append("#### Too loud / near clip")
        lines.append("")
        if loud:
            for loop in loud:
                lines.append(
                    f"- `{loop.filename}` — RMS {loop.rms_dbfs:.1f} dBFS, peak {loop.peak_linear:.3f}"
                )
        else:
            lines.append("- All loops within comfortable headroom.")
        lines.append("")

        lines.append("#### Suggested replacements")
        lines.append("")
        if replace:
            for loop in replace:
                lines.append(
                    f"- `{loop.filename}` — {', '.join(loop.flags) or loop.layering_notes}"
                )
        else:
            lines.append("- No replacements required from automated checks.")
        lines.append("")

        lines.append("#### Category suggestions")
        lines.append("")
        mismatched = [loop for loop in loops if loop.suggested_category != loop.category]
        if mismatched:
            for loop in mismatched:
                lines.append(
                    f"- `{loop.filename}`: configured **{loop.category}** → suggested **{loop.suggested_category}**"
                )
        else:
            lines.append("- Filenames and heuristics agree with configured categories.")
        lines.append("")
        lines.append("---")
        lines.append("")

    lines.append("## Notes")
    lines.append("")
    lines.append(
        "- Key and BPM estimates are heuristic; trust your ears for final pack curation."
    )
    lines.append(
        "- Pair scores weight category fit, tempo, key, loudness balance, and arrangement density."
    )
    lines.append(
        "- This report does not modify game code or audio files."
    )
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze generated audio pack quality.")
    parser.add_argument(
        "--output",
        type=Path,
        default=REPORT_PATH,
        help=f"Markdown report path (default: {REPORT_PATH.relative_to(PROJECT_ROOT)})",
    )
    parser.add_argument(
        "--pack",
        action="append",
        dest="packs",
        help="Only analyze pack folder name(s), e.g. trance-pack-1",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config_map = parse_pack_configs()
    packs = discover_packs()
    if args.packs:
        wanted = set(args.packs)
        packs = [(pid, path) for pid, path in packs if pid in wanted]

    if not packs:
        print(f"No packs found under {GENERATED_AUDIO_ROOT}")
        return

    all_loops: dict[str, list[LoopAnalysis]] = {}
    pairs_by_pack: dict[str, list[PairCompatibility]] = {}

    for pack_id, pack_dir in packs:
        categories = config_map.get(pack_id, {})
        wav_files = sorted(pack_dir.glob("*.wav"))
        loops = [analyze_loop(pack_id, path, categories) for path in wav_files]
        all_loops[pack_id] = loops

        pairs: list[PairCompatibility] = []
        for i, loop_a in enumerate(loops):
            for loop_b in loops[i + 1 :]:
                pairs.append(pair_compatibility(loop_a, loop_b))
        pairs_by_pack[pack_id] = pairs
        print(f"Analyzed {len(loops)} loops in {pack_id}")

    report = build_report(all_loops, pairs_by_pack)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report, encoding="utf-8")
    print(f"Report written to: {args.output}")


if __name__ == "__main__":
    main()
