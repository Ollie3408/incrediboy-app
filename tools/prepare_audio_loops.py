#!/usr/bin/env python3
"""Prepare raw audio files as clean 4-bar WAV loops for the game.

Install dependencies:
    python3 -m pip install librosa soundfile pydub numpy

FFmpeg is also required by pydub for MP3 conversion:
    brew install ffmpeg

How to use:
    1. Put MP3 or WAV files into the raw_audio folder.
    2. Run:
        python3 tools/prepare_audio_loops.py
    3. Processed loops are written to src/assets/audio.

The script never deletes or modifies your original raw_audio files.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from pydub import AudioSegment


PROJECT_ROOT = Path(__file__).resolve().parents[1]
RAW_AUDIO_DIR = PROJECT_ROOT / "raw_audio"
OUTPUT_AUDIO_DIR = PROJECT_ROOT / "src" / "assets" / "audio"

TARGET_BPM = 100
TARGET_SAMPLE_RATE = 44_100
BEATS_PER_LOOP = 16  # 4 bars of 4/4 time.
SECONDS_PER_BEAT = 60.0 / TARGET_BPM
TARGET_LOOP_SECONDS = SECONDS_PER_BEAT * BEATS_PER_LOOP  # 9.6 seconds.
TARGET_LOOP_FRAMES = int(round(TARGET_LOOP_SECONDS * TARGET_SAMPLE_RATE))

OUTPUT_NAMES = [
    *(f"beat-{i}.wav" for i in range(1, 6)),
    *(f"melody-{i}.wav" for i in range(1, 6)),
    *(f"effect-{i}.wav" for i in range(1, 6)),
    *(f"percussion-{i}.wav" for i in range(1, 6)),
    *(f"voice-{i}.wav" for i in range(1, 6)),
]


def print_instructions() -> None:
    """Show beginner-friendly terminal instructions."""
    print("Audio loop preparation")
    print("======================")
    print()
    print("Install dependencies:")
    print("  python3 -m pip install librosa soundfile pydub numpy")
    print("  brew install ffmpeg")
    print()
    print("Add source files:")
    print(f"  Put .mp3 or .wav files in: {RAW_AUDIO_DIR}")
    print()
    print("Run:")
    print("  python3 tools/prepare_audio_loops.py")
    print()


def ensure_folders() -> None:
    """Create the folders used by the script if they do not exist."""
    RAW_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    (PROJECT_ROOT / "tools").mkdir(parents=True, exist_ok=True)


def find_source_files() -> list[Path]:
    """Find MP3/WAV files in raw_audio, sorted by filename."""
    files = [
        path
        for path in RAW_AUDIO_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in {".mp3", ".wav"}
    ]
    return sorted(files, key=lambda path: path.name.lower())


def load_audio(path: Path) -> tuple[np.ndarray, int]:
    """Load MP3/WAV as mono floating point audio.

    pydub handles MP3 decoding. librosa then resamples to the target sample rate.
    """
    audio = AudioSegment.from_file(path)
    audio = audio.set_channels(1).set_frame_rate(TARGET_SAMPLE_RATE)

    samples = np.array(audio.get_array_of_samples()).astype(np.float32)
    peak = float(1 << (8 * audio.sample_width - 1))
    if peak > 0:
        samples /= peak

    return samples, TARGET_SAMPLE_RATE


def trim_silence(samples: np.ndarray) -> np.ndarray:
    """Remove quiet leading/trailing silence.

    This keeps the useful audio and avoids game loops that start with a delay.
    """
    if samples.size == 0:
        return samples

    trimmed, _ = librosa.effects.trim(samples, top_db=40)
    return trimmed if trimmed.size else samples


def normalize_audio(samples: np.ndarray, target_peak: float = 0.92) -> np.ndarray:
    """Normalize peak loudness so loops are audible but do not clip."""
    if samples.size == 0:
        return samples

    peak = float(np.max(np.abs(samples)))
    if peak < 1e-6:
        return samples

    normalized = samples * (target_peak / peak)
    return np.clip(normalized, -1.0, 1.0)


def estimate_bpm(samples: np.ndarray, sample_rate: int) -> float | None:
    """Try to estimate the source tempo with librosa."""
    if samples.size < sample_rate:
        return None

    try:
        tempo = librosa.beat.tempo(y=samples, sr=sample_rate, aggregate=np.median)
        bpm = float(np.atleast_1d(tempo)[0])
    except Exception:
        return None

    if not math.isfinite(bpm) or bpm <= 0:
        return None
    return bpm


def fit_to_target_bpm(samples: np.ndarray, source_bpm: float | None) -> np.ndarray:
    """Time-stretch audio toward the target BPM when tempo detection succeeds."""
    if source_bpm is None or samples.size == 0:
        return samples

    # librosa.effects.time_stretch rate > 1 makes audio shorter/faster.
    rate = TARGET_BPM / source_bpm
    rate = float(np.clip(rate, 0.5, 2.0))

    try:
        return librosa.effects.time_stretch(samples, rate=rate)
    except Exception:
        return samples


def most_energetic_window(samples: np.ndarray, target_length: int) -> np.ndarray:
    """Pick the loudest target-length section from a long source file.

    Many raw files have intros/outros. Taking the first 9.6 seconds can sound
    like a short hit followed by silence, so we search for the most energetic
    4-bar section instead.
    """
    if samples.size <= target_length:
        return samples

    hop = max(1, target_length // 64)
    best_start = 0
    best_energy = -1.0
    for start in range(0, samples.size - target_length + 1, hop):
        window = samples[start : start + target_length]
        energy = float(np.mean(window * window))
        if energy > best_energy:
            best_energy = energy
            best_start = start

    return samples[best_start : best_start + target_length]


def tile_with_crossfades(samples: np.ndarray, target_length: int, sample_rate: int) -> np.ndarray:
    """Repeat a short clip up to target length without inserting silence."""
    if samples.size == 0:
        return np.zeros(target_length, dtype=np.float32)

    if samples.size >= target_length:
        return samples[:target_length]

    crossfade = min(int(sample_rate * 0.025), samples.size // 4)
    if crossfade <= 1:
        repeats = math.ceil(target_length / samples.size)
        return np.tile(samples, repeats)[:target_length]

    output = samples.copy()
    while output.size < target_length:
        needed = target_length - output.size
        next_piece = samples[: needed + crossfade]
        if next_piece.size <= crossfade:
            break

        fade_out = np.linspace(1.0, 0.0, crossfade, dtype=np.float32)
        fade_in = np.linspace(0.0, 1.0, crossfade, dtype=np.float32)
        joined = output[-crossfade:] * fade_out + next_piece[:crossfade] * fade_in
        output = np.concatenate([output[:-crossfade], joined, next_piece[crossfade:]])

    if output.size < target_length:
        output = np.pad(output, (0, target_length - output.size))
    return output[:target_length]


def smooth_loop_boundary(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """Crossfade the end toward the start instead of fading out to silence."""
    if samples.size == 0:
        return samples

    crossfade = min(int(sample_rate * 0.035), samples.size // 8)
    if crossfade <= 1:
        return samples

    looped = samples.copy()
    fade_out = np.linspace(1.0, 0.0, crossfade, dtype=np.float32)
    fade_in = np.linspace(0.0, 1.0, crossfade, dtype=np.float32)

    # Blend the tail into the head shape. This avoids a fade-out ending while
    # reducing clicks when the browser jumps from end back to start.
    looped[-crossfade:] = looped[-crossfade:] * fade_out + looped[:crossfade] * fade_in
    return looped


def make_exact_loop_length(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """Create exactly 9.6 seconds: 4 bars at 100 BPM."""
    if sample_rate != TARGET_SAMPLE_RATE:
        samples = librosa.resample(samples, orig_sr=sample_rate, target_sr=TARGET_SAMPLE_RATE)
        sample_rate = TARGET_SAMPLE_RATE

    target_length = int(round(TARGET_LOOP_SECONDS * sample_rate))
    samples = most_energetic_window(samples, target_length)
    samples = tile_with_crossfades(samples, target_length, sample_rate)
    return smooth_loop_boundary(samples, sample_rate)


def process_file(source: Path, output: Path) -> None:
    """Convert one raw file into one clean game loop."""
    samples, sample_rate = load_audio(source)
    samples = trim_silence(samples)
    source_bpm = estimate_bpm(samples, sample_rate)
    samples = fit_to_target_bpm(samples, source_bpm)
    samples = make_exact_loop_length(samples, sample_rate)
    samples = normalize_audio(samples)

    sf.write(output, samples, sample_rate, subtype="PCM_16")

    bpm_text = f"{source_bpm:.1f} BPM" if source_bpm else "unknown BPM"
    print(f"{source.name} -> {output.name} ({bpm_text}, {TARGET_LOOP_SECONDS:.1f}s)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prepare raw MP3/WAV files as 100 BPM 4-bar WAV loops.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show input/output mapping without writing files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_folders()
    print_instructions()

    source_files = find_source_files()
    if not source_files:
        print("No .mp3 or .wav files found in raw_audio yet.")
        print("Add up to 25 files, then run this command again:")
        print("  python3 tools/prepare_audio_loops.py")
        return

    if len(source_files) < len(OUTPUT_NAMES):
        print(
            f"Found {len(source_files)} source file(s). "
            f"The first {len(source_files)} output names will be created.",
        )
    elif len(source_files) > len(OUTPUT_NAMES):
        print(
            f"Found {len(source_files)} source file(s). "
            f"Only the first {len(OUTPUT_NAMES)} are used.",
        )

    print()
    print("Output mapping:")
    pairs = list(zip(source_files[: len(OUTPUT_NAMES)], OUTPUT_NAMES))
    for source, output_name in pairs:
        print(f"  {source.name} -> {output_name}")

    if args.dry_run:
        print()
        print("Dry run complete. No files were written.")
        return

    print()
    print("Processing:")
    for source, output_name in pairs:
        process_file(source, OUTPUT_AUDIO_DIR / output_name)

    print()
    print(f"Done. Loops exported to: {OUTPUT_AUDIO_DIR}")


if __name__ == "__main__":
    main()
