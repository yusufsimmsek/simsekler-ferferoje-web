from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(r"D:\İlkbahar İnşaat\KENTSEL DÖNÜŞÜM PROJELENDİRME")
OUT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
THUMB_DIR = OUT / "dwg_thumbnails"

PNG_SIG = b"\x89PNG\r\n\x1a\n"
IEND = b"IEND"


def slug(text: str) -> str:
    import re
    import unicodedata

    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_text).strip("._-")
    return (ascii_text or "file")[:100]


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def extract_pngs(path: Path) -> list[Path]:
    data = path.read_bytes()
    outputs = []
    start = 0
    idx = 1
    while True:
        sig_pos = data.find(PNG_SIG, start)
        if sig_pos == -1:
            break
        iend_pos = data.find(IEND, sig_pos)
        if iend_pos == -1:
            break
        png_end = iend_pos + 8  # chunk type + crc, length field sits before IEND but data slice already includes it
        # Include chunk length immediately before IEND and CRC after IEND. If slice is off, PIL validation will catch it later.
        out = THUMB_DIR / f"{slug(path.stem)}__thumb_{idx:02d}.png"
        out.write_bytes(data[sig_pos:png_end])
        outputs.append(out)
        start = png_end
        idx += 1
    return outputs


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for path in sorted(ROOT.rglob("*.dwg")):
        thumbs = extract_pngs(path)
        records.append(
            {
                "relative_path": rel(path),
                "thumbnail_count": len(thumbs),
                "thumbnails": [str(p) for p in thumbs],
            }
        )
    (OUT / "dwg_thumbnail_index.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(records, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
