"""Convert normalized timed transcription segments into SRT, without network use."""
import argparse
import json
import math
from pathlib import Path


def timestamp(value):
    millis = round(value * 1000)
    hours, millis = divmod(millis, 3600000)
    minutes, millis = divmod(millis, 60000)
    seconds, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{millis:03}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists; choose a new output path")
    segments = json.loads(args.input.read_text(encoding="utf-8-sig"))
    blocks, previous_start = [], -1
    for index, segment in enumerate(segments, 1):
        start, end = float(segment["start"]), float(segment["end"])
        if not math.isfinite(start) or not math.isfinite(end) or start < 0 or end <= start or start < previous_start:
            parser.error(f"Invalid time range or ordering at segment {index}")
        text = str(segment["text"]).strip()
        if not text:
            parser.error(f"Empty text at segment {index}")
        blocks.append(f"{index}\n{timestamp(start)} --> {timestamp(end)}\n{text}\n")
        previous_start = start
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(blocks), encoding="utf-8")
    print(str(args.output.resolve()))


if __name__ == "__main__":
    main()
