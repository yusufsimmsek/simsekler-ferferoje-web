from __future__ import annotations

import json
import re
import sys
from pathlib import Path


OUT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
PDF_ANALYSIS = OUT / "pdf_analysis.json"
CLEAN_DIR = OUT / "pdf_text_clean"


def collapse_letter_spaced(match: re.Match[str]) -> str:
    return re.sub(r"\s+", "", match.group(0))


def clean_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"(?:(?<!\S)(?:[0-9A-Za-zÇĞİÖŞÜçğıöşü]\s+){2,}[0-9A-Za-zÇĞİÖŞÜçğıöşü](?!\S))", collapse_letter_spaced, text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    CLEAN_DIR.mkdir(parents=True, exist_ok=True)
    records = json.loads(PDF_ANALYSIS.read_text(encoding="utf-8"))
    index = []
    for rec in records:
        chosen = rec.get("pypdf_text_file")
        if rec.get("preferred_text_engine") == "pdftotext" and rec.get("pdftotext_file"):
            chosen = rec["pdftotext_file"]
        if not chosen:
            continue
        source = Path(chosen)
        raw = source.read_text(encoding="utf-8", errors="replace")
        cleaned = clean_text(raw)
        out_name = source.name.replace(".pypdf.txt", ".clean.txt").replace(".pdftotext.txt", ".clean.txt")
        out_path = CLEAN_DIR / out_name
        out_path.write_text(cleaned, encoding="utf-8")
        index.append(
            {
                "relative_path": rec["relative_path"],
                "source_text": str(source),
                "clean_text": str(out_path),
                "raw_chars": len(raw),
                "clean_chars": len(cleaned),
            }
        )
    (CLEAN_DIR / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(index, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
