#!/usr/bin/env python3
"""Ingest Beats Box audio into 9.6 second synchronized game loops.

Install dependencies:
    python3 -m pip install librosa soundfile pydub numpy
    brew install ffmpeg

Drop source files into:
    src/assets/audio/beats box

Run:
    python3 tools/ingest_beats_box_pack.py

The script never deletes or modifies original source files.
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
SOURCE_DIR = PROJECT_ROOT / "src" / "assets" / "audio" / "beats box"
OUTPUT_DIR = PROJECT_ROOT / "src" / "assets" / "audio" / "generated" / "beats-box-pack-1"
CONFIG_OUT = PROJECT_ROOT / "src" / "generated" / "audioPacks" / "beatsBoxPack1.ts"

PACK_ID = "beats-box-pack-1"
PACK_NAME = "Beats Box Pack 1"
SUPPORTED_EXTENSIONS = {".wav", ".mp3", ".aiff", ".aif", ".m4a"}
CATEGORIES = ("beat", "voice", "fx", "percussion", "melody", "bass")

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "beat": ("kick", "drum", "beat", "beatbox", "mouth", "groove"),
    "voice": ("vocal", "vox", "voice", "chant", "phrase", "acapella"),
    "fx": ("fx", "riser", "sweep", "impact", "noise", "glitch"),
    "percussion": ("clap", "hat", "shaker", "tom", "perc"),
    "melody": ("synth", "arp", "lead", "chord", "melody"),
    "bass": ("bass", "sub", "low"),
}


@dataclass(frozen=True)
class ProcessedLoop:
    source: Path
    category: str
    output_name: str
    output_path: Path
    original_duration: float
    final_duration: float
    estimated_bpm: float | None


def ensure_folders() -> None:
    """Create source/output/config folders if missing."""
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_OUT.parent.mkdir(parents=True, exist_ok=True)


def find_source_files(source_dir: Path) -> list[Path]:
    """Find supported audio files recursively."""
    return sorted(
        (
            path
            for path in source_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
        ),
        key=lambda path: path.name.lower(),
    )


def detect_category(path: Path) -> str:
    """Assign a game category from filename keywords."""
    name = path.stem.lower()
    for category in CATEGORIES:
        if any(keyword in name for keyword in CATEGORY_KEYWORDS[category]):
            return category
    return "melody"


def process_source(source: Path, category: str, output_path: Path) -> ProcessedLoop:
    """Convert one source file to a normalized PCM_16 WAV game loop."""
    samples, sample_rate = load_audio(source)
    original_duration = samples.size / sample_rate if sample_rate else 0.0

    samples = trim_silence(samples)
    estimated_bpm = estimate_bpm(samples, sample_rate)
    samples = fit_to_target_bpm(samples, estimated_bpm)
    samples = make_exact_loop_length(samples, sample_rate)
    samples = normalize_audio(samples)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(output_path, samples, TARGET_SAMPLE_RATE, subtype="PCM_16")

    written, written_sample_rate = sf.read(output_path, always_2d=False)
    final_duration = len(written) / written_sample_rate if written_sample_rate else TARGET_LOOP_SECONDS

    return ProcessedLoop(
        source=source,
        category=category,
        output_name=output_path.name,
        output_path=output_path,
        original_duration=original_duration,
        final_duration=final_duration,
        estimated_bpm=estimated_bpm,
    )


def ts_string(value: str) -> str:
    """Quote a string for generated TypeScript."""
    return repr(value).replace("\\'", "'").replace('"', '\\"').replace("'", '"')


def write_config(loops: list[ProcessedLoop]) -> None:
    """Generate a TypeScript config for the processed pack."""
    entries: list[str] = []
    for index, loop in enumerate(loops, start=1):
        audio_path = loop.output_path.relative_to(PROJECT_ROOT / "src").as_posix()
        entries.append(
            "  {\n"
            f"    id: {ts_string(loop.output_path.stem)},\n"
            f"    packId: {ts_string(PACK_ID)},\n"
            f"    packName: {ts_string(PACK_NAME)},\n"
            f"    category: {ts_string(loop.category)},\n"
            f"    filename: {ts_string(loop.output_name)},\n"
            f"    audioPath: {ts_string(audio_path)},\n"
            f"    duration: {loop.final_duration:.6f},\n"
            f"    bpm: {TARGET_BPM},\n"
            f"    originalFilename: {ts_string(loop.source.name)},\n"
            f"    order: {index},\n"
            "  }"
        )

    audio_directory = OUTPUT_DIR.relative_to(PROJECT_ROOT / "src").as_posix()
    contents = (
        "/* Auto-generated by tools/ingest_beats_box_pack.py. Do not edit by hand. */\n\n"
        "export type BeatsBoxCategory = 'beat' | 'voice' | 'fx' | 'percussion' | 'melody' | 'bass'\n\n"
        "export type BeatsBoxPadConfig = {\n"
        "  id: string\n"
        "  packId: string\n"
        "  packName: string\n"
        "  category: BeatsBoxCategory\n"
        "  filename: string\n"
        "  audioPath: string\n"
        "  duration: number\n"
        "  bpm: number\n"
        "  originalFilename: string\n"
        "  order: number\n"
        "}\n\n"
        "export const beatsBoxPack1 = {\n"
        f"  id: {ts_string(PACK_ID)},\n"
        f"  name: {ts_string(PACK_NAME)},\n"
        f"  bpm: {TARGET_BPM},\n"
        f"  loopSeconds: {TARGET_LOOP_SECONDS:.1f},\n"
        f"  sampleRate: {TARGET_SAMPLE_RATE},\n"
        f"  audioDirectory: {ts_string(audio_directory)},\n"
        "  pads: [\n"
        + ",\n".join(entries)
        + "\n"
        "  ] satisfies BeatsBoxPadConfig[],\n"
        "} as const\n"
    )

    CONFIG_OUT.write_text(contents, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest Beats Box audio into normalized game loops.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print the plan without writing files.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_folders()

    print("Beats Box audio ingestion")
    print("=========================")
    print(f"Scan folder: {SOURCE_DIR}")
    print(f"Output folder: {OUTPUT_DIR}")
    print(f"Config output: {CONFIG_OUT}")
    print()

    source_files = find_source_files(SOURCE_DIR)
    if not source_files:
        print("No supported audio files detected.")
        print("Accepted extensions: .wav, .mp3, .aiff, .aif, .m4a")
        print(f"Drop files into: {SOURCE_DIR}")
        return

    counters: defaultdict[str, int] = defaultdict(int)
    plan: list[tuple[Path, str, Path]] = []

    print("Detected files:")
    for source in source_files:
        category = detect_category(source)
        counters[category] += 1
        output_name = f"{category}-{counters[category]}.wav"
        output_path = OUTPUT_DIR / output_name
        plan.append((source, category, output_path))
        print(f"  detected={source.name} category={category} output={output_name}")

    if args.dry_run:
        print()
        print("Dry run complete. No files were written.")
        return

    print()
    print("Processing:")
    processed: list[ProcessedLoop] = []
    for source, category, output_path in plan:
        loop = process_source(source, category, output_path)
        processed.append(loop)
        bpm_text = f"{loop.estimated_bpm:.1f}" if loop.estimated_bpm else "unknown"
        print(
            f"  detected={loop.source.name} "
            f"originalDuration={loop.original_duration:.3f}s "
            f"estimatedBpm={bpm_text} "
            f"category={loop.category} "
            f"output={loop.output_name} "
            f"finalDuration={loop.final_duration:.3f}s"
        )

    write_config(processed)
    print()
    print(f"Done. Processed {len(processed)} file(s).")
    print(f"Generated config: {CONFIG_OUT}")


if __name__ == "__main__":
    main()
