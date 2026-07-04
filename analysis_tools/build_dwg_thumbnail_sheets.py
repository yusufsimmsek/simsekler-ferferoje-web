from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
INDEX = OUT / "dwg_thumbnail_index.json"
SHEET_DIR = OUT / "dwg_thumbnail_sheets"


def group_stage(relative_path: str) -> str:
    return relative_path.split("\\", 1)[0]


def make_sheet(records: list[dict], out: Path, title: str) -> None:
    thumb_w, thumb_h = 320, 240
    label_h = 74
    pad = 16
    cols = 3
    rows = math.ceil(len(records) / cols)
    w = cols * (thumb_w + pad) + pad
    h = rows * (thumb_h + label_h + pad) + pad + 36
    canvas = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(canvas)
    draw.text((pad, pad), title, fill="black")
    y_offset = pad + 36
    for idx, rec in enumerate(records):
        col = idx % cols
        row = idx // cols
        x = pad + col * (thumb_w + pad)
        y = y_offset + row * (thumb_h + label_h + pad)
        path = Path(rec["thumbnail"])
        try:
            with Image.open(path) as im:
                im = im.convert("RGB")
                im.thumbnail((thumb_w, thumb_h))
                bg = Image.new("RGB", (thumb_w, thumb_h), "white")
                bg.paste(im, ((thumb_w - im.width) // 2, (thumb_h - im.height) // 2))
                canvas.paste(bg, (x, y))
                draw.rectangle([x, y, x + thumb_w, y + thumb_h], outline=(180, 180, 180))
        except Exception:
            draw.rectangle([x, y, x + thumb_w, y + thumb_h], outline="red")
            draw.text((x + 8, y + 8), "invalid png", fill="red")
        label = rec["relative_path"]
        chunks = [label[i : i + 48] for i in range(0, len(label), 48)]
        for line_no, chunk in enumerate(chunks[:3]):
            draw.text((x, y + thumb_h + 6 + line_no * 18), chunk, fill="black")
    canvas.save(out)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    SHEET_DIR.mkdir(parents=True, exist_ok=True)
    raw = json.loads(INDEX.read_text(encoding="utf-8"))
    flat = []
    validation = []
    for rec in raw:
        for thumb in rec["thumbnails"]:
            size = None
            ok = False
            try:
                with Image.open(thumb) as im:
                    im.verify()
                with Image.open(thumb) as im:
                    size = list(im.size)
                ok = True
            except Exception as exc:
                validation.append({**rec, "thumbnail": thumb, "valid": False, "error": str(exc)})
                continue
            item = {**rec, "thumbnail": thumb, "valid": ok, "size": size}
            flat.append(item)
            validation.append(item)
    by_stage = {}
    for item in flat:
        by_stage.setdefault(group_stage(item["relative_path"]), []).append(item)
    for stage, items in by_stage.items():
        make_sheet(items, SHEET_DIR / f"{stage.replace('Ş','S').replace(' ','_')}.png", stage)
    make_sheet(flat, SHEET_DIR / "ALL_DWG_THUMBNAILS.png", "All DWG thumbnails")
    (OUT / "dwg_thumbnail_validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"valid": len(flat), "stages": {k: len(v) for k, v in by_stage.items()}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
