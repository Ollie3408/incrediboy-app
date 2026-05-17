#!/usr/bin/env python3
"""Ingest a music pack into normalized 9.6 second game loops.

Default usage:
    python3 tools/ingest_audio_pack.py

Install dependencies:
    python3 -m pip install librosa soundfile pydub numpy
    brew install ffmpeg

Drop source WAV files into:
    src/assets/audio/Trance pack 1

The script writes normalized loops to:
    src/assets/audio/generated/trance-pack-1

It also writes a TypeScript pad config to:
    src/generated/audioPacks/trancePack1.ts
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import soundfile as sf

from prepare_audio_loops import (
    TARGET_BPM,
    TARGET_LOOP_SECONDS,
    TARGET_SAMPLE_RATE,
    estimate_bpm,
    fit_to_target_bpm,
    load_audio,
    make_exact_loop_length,
    normalize_audio,
    trim_silence,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PACK_DIR = PROJECT_ROOT / "src" / "assets" / "audio" / "Trance pack 1"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "audio" / "generated" / "trance-pack-1"
DEFAULT_CONFIG_OUT = PROJECT_ROOT / "src" / "generated" / "audioPacks" / "trancePack1.ts"

PACK_ID = "trance-pack-1"
PACK_NAME = "Trance Pack 1"
CATEGORIES = ("beat", "bass", "melody", "fx", "voice")

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
        "hi-hat",
        "top",
        "perc",
        "percussion",
        "groove",
        "rhythm",
    ),
    "bass": (
        "bass",
        "sub",
        "low",
        "reese",
        "acid",
        "303",
    ),
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
        "uplifter",
        "downlifter",
        "sweep",
        "transition",
        "noise",
        "crash",
        "reverse",
        "atmos",
        "ambience",
    ),
    "voice": (
        "voice",
        "vocal",
        "vox",
        "chant",
        "phrase",
        "spoken",
        "speech",
    ),
}


@dataclass(frozen=True)
class IngestedLoop:
    source: Path
    category: str
    output_name: str
    output_path: Path
    source_duration: float
    output_duration: float
    source_bpm: float | None


def find_wav_files(pack_dir: Path) -> list[Path]:
    """Find all WAV files in a source pack folder."""
    if not pack_dir.exists():
        pack_dir.mkdir(parents=True, exist_ok=True)
        return []

    return sorted(
        (path for path in pack_dir.rglob("*") if path.is_file() and path.suffix.lower() == ".wav"),
        key=lambda path: path.name.lower(),
    )


def detect_category(path: Path) -> str:
    """Categorize a loop from filename keywords."""
    filename = path.stem.lower()
    for category in CATEGORIES:
        if any(keyword in filename for keyword in CATEGORY_KEYWORDS[category]):
            return category
    return "melody"


def process_loop(source: Path, category: str, output_path: Path) -> IngestedLoop:
    """Normalize one WAV to a 9.6 second 100 BPM loop."""
    samples, sample_rate = load_audio(source)
    source_duration = samples.size / sample_rate if sample_rate else 0.0

    samples = trim_silence(samples)
    source_bpm = estimate_bpm(samples, sample_rate)
    samples = fit_to_target_bpm(samples, source_bpm)
    samples = make_exact_loop_length(samples, sample_rate)
    samples = normalize_audio(samples)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output_path, samples, TARGET_SAMPLE_RATE, subtype="PCM_16")

    written, written_sample_rate = sf.read(output_path, always_2d=False)
    output_duration = len(written) / written_sample_rate if written_sample_rate else TARGET_LOOP_SECONDS

    return IngestedLoop(
        source=source,
        category=category,
        output_name=output_path.name,
        output_path=output_path,
        source_duration=source_duration,
        output_duration=output_duration,
        source_bpm=source_bpm,
    )


def ts_string(value: str) -> str:
    """Safely quote a Python string for generated TypeScript."""
    return repr(value).replace("\\'", "'").replace('"', '\\"').replace("'", '"')


def write_typescript_config(config_out: Path, loops: list[IngestedLoop], output_dir: Path) -> None:
    """Write a generated TypeScript config for this pack."""
    config_out.parent.mkdir(parents=True, exist_ok=True)

    entries: list[str] = []
    for index, loop in enumerate(loops):
        audio_path = loop.output_path.relative_to(PROJECT_ROOT / "src").as_posix()
        entries.append(
            "  {\n"
            f"    id: {ts_string(loop.output_path.stem)},\n"
            f"    category: {ts_string(loop.category)},\n"
            f"    label: {ts_string(loop.output_path.stem.replace('-', ' ').title())},\n"
            f"    sourceFile: {ts_string(loop.source.name)},\n"
            f"    audioFile: {ts_string(loop.output_name)},\n"
            f"    audioPath: {ts_string(audio_path)},\n"
            f"    order: {index + 1},\n"
            f"    durationSeconds: {loop.output_duration:.6f},\n"
            "  }"
        )

    output_dir_from_src = output_dir.relative_to(PROJECT_ROOT / "src").as_posix()
    contents = (
        "/* Auto-generated by tools/ingest_audio_pack.py. Do not edit by hand. */\n\n"
        "export type GeneratedAudioCategory = 'beat' | 'bass' | 'melody' | 'fx' | 'voice'\n\n"
        "export type GeneratedPadConfig = {\n"
        "  id: string\n"
        "  category: GeneratedAudioCategory\n"
        "  label: string\n"
        "  sourceFile: string\n"
        "  audioFile: string\n"
        "  audioPath: string\n"
        "  order: number\n"
        "  durationSeconds: number\n"
        "}\n\n"
        "export const trancePack1 = {\n"
        f"  id: {ts_string(PACK_ID)},\n"
        f"  name: {ts_string(PACK_NAME)},\n"
        f"  bpm: {TARGET_BPM},\n"
        f"  loopSeconds: {TARGET_LOOP_SECONDS:.1f},\n"
        f"  audioDirectory: {ts_string(output_dir_from_src)},\n"
        "  pads: [\n"
        + ",\n".join(entries)
        + "\n"
        "  ] satisfies GeneratedPadConfig[],\n"
        "} as const\n"
    )

    config_out.write_text(contents, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest a WAV music pack into categorized 100 BPM 9.6 second loops.",
    )
    parser.add_argument(
        "--pack-dir",
        type=Path,
        default=DEFAULT_PACK_DIR,
        help="Folder containing source WAV files.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Folder where renamed normalized WAV files are written.",
    )
    parser.add_argument(
        "--config-out",
        type=Path,
        default=DEFAULT_CONFIG_OUT,
        help="Generated TypeScript config path.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print detection/rename plan without writing output files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pack_dir = args.pack_dir.resolve()
    output_dir = args.output_dir.resolve()
    config_out = args.config_out.resolve()

    print("Trance audio pack ingestion")
    print("===========================")
    print(f"Scan folder: {pack_dir}")
    print(f"Output folder: {output_dir}")
    print(f"Config output: {config_out}")
    print()

    source_files = find_wav_files(pack_dir)
    if not source_files:
        print("No WAV files detected.")
        print(f"Drop .wav files into: {pack_dir}")
        return

    print("Detected files:")
    for source in source_files:
        print(f"  {source.name}")
    print()

    counters: defaultdict[str, int] = defaultdict(int)
    plan: list[tuple[Path, str, Path]] = []
    for source in source_files:
        category = detect_category(source)
        counters[category] += 1
        output_name = f"{category}-{counters[category]}.wav"
        plan.append((source, category, output_dir / output_name))

    print("Category and rename plan:")
    for source, category, output_path in plan:
        print(f"  {source.name} -> {category} -> {output_path.name}")

    if args.dry_run:
        print()
        print("Dry run complete. No audio/config files were written.")
        return

    print()
    print("Processing:")
    loops: list[IngestedLoop] = []
    for source, category, output_path in plan:
        loop = process_loop(source, category, output_path)
        loops.append(loop)
        bpm_text = f"{loop.source_bpm:.1f} BPM" if loop.source_bpm else "unknown BPM"
        print(
            f"  detected={loop.source.name} "
            f"category={loop.category} "
            f"duration={loop.source_duration:.3f}s "
            f"bpm={bpm_text} "
            f"renamed={loop.output_name} "
            f"outputDuration={loop.output_duration:.3f}s"
        )

    write_typescript_config(config_out, loops, output_dir)
    print()
    print(f"Done. Wrote {len(loops)} normalized loop(s).")
    print(f"Generated config: {config_out}")


if __name__ == "__main__":
    main()
