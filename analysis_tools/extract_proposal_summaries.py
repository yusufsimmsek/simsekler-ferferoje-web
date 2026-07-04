from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path


OUT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
PDF_ANALYSIS = OUT / "pdf_analysis.json"
PROPOSAL_OUT = OUT / "proposal_summaries.json"
PROPOSAL_MD = OUT / "PROPOSAL_SUMMARIES.md"


MONTHS = "Ocak|Şubat|Şubat|Subat|Mart|Nisan|Mayıs|Mayis|Haziran|Temmuz|Ağustos|Agustos|Eylül|Eylul|Ekim|Kasım|Kasim|Aralık|Aralik"


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\x00", "").replace("\x0c", "\n--- PAGE BREAK ---\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def find_title(text: str) -> dict[str, str | None]:
    title_match = re.search(r"(?P<ada>\d{3,5})\s*ADA\s*(?P<parsel>\d+)\s*PARSEL", text, flags=re.I)
    return {
        "title_ada": title_match.group("ada") if title_match else None,
        "title_parsel": title_match.group("parsel") if title_match else None,
    }


def find_body_parcel(text: str) -> dict[str, str | None]:
    body_match = re.search(
        r"Ankara.{0,80}?Çankaya.{0,80}?(?P<mahalle>[A-Za-zÇĞİÖŞÜçğıöşüİı\s]+?)\s*Mahallesi"
        r".{0,80}?(?P<ada>\d{3,5})\s*Ada\s*(?P<parsel>\d+)\s*Parsel"
        r".{0,180}?toplam\s*(?P<existing_units>\d+)\s*ba.{0,8}?msız\s*bölüm",
        text,
        flags=re.I | re.S,
    )
    if not body_match:
        body_match = re.search(
            r"(?P<mahalle>[A-Za-zÇĞİÖŞÜçğıöşüİı\s]+?)\s*Mahallesi"
            r".{0,80}?(?P<ada>\d{3,5})\s*Ada\s*(?P<parsel>\d+)\s*Parsel"
            r".{0,180}?toplam\s*(?P<existing_units>\d+)\s*ba.{0,8}?msız\s*bölüm",
            text,
            flags=re.I | re.S,
        )
    if not body_match:
        return {"body_mahalle": None, "body_ada": None, "body_parsel": None, "existing_independent_units": None}
    mahalle = compact(body_match.group("mahalle")).split()[-1]
    return {
        "body_mahalle": mahalle,
        "body_ada": body_match.group("ada"),
        "body_parsel": body_match.group("parsel"),
        "existing_independent_units": body_match.group("existing_units"),
    }


def find_month(text: str) -> str | None:
    match = re.search(rf"({MONTHS})\s*,?\s*2026", text, flags=re.I)
    return compact(match.group(0)) if match else None


def find_otopark(text: str) -> str | None:
    match = re.search(r"(\d+)\s*\.\s*(?:Bodrum\s*)?[Bb]odrum\s*katta\s*kapalı\s*otopark", text, flags=re.I)
    if match:
        return f"{match.group(1)}. bodrum katta kapalı otopark"
    match = re.search(r"(\d+)\s*\.\s*Bodrum\s*Katta\s*kapalı\s*otopark", text, flags=re.I)
    if match:
        return f"{match.group(1)}. bodrum katta kapalı otopark"
    return None


def extract_offer_block(text: str) -> str | None:
    starts = [
        "Sunulan teklif kapsamında",
        "Hazırladığımız teklifte",
        "Hazırladığımız teklifte",
        "Yeni Yapı Daire",
    ]
    start_idx = -1
    for marker in starts:
        idx = text.lower().find(marker.lower())
        if idx != -1:
            start_idx = idx
            break
    if start_idx == -1:
        return None
    end_idx = len(text)
    for marker in ["Sürecin", "Her iki alternatifte", "Görüşme", "Görüş me", "Saygılarımızla"]:
        idx = text.find(marker, start_idx + 20)
        if idx != -1:
            end_idx = min(end_idx, idx)
    block = text[start_idx:end_idx]
    block = re.sub(r"\n+", "\n", block)
    return block.strip()[:3000]


def find_special_notes(text: str) -> list[str]:
    notes = []
    patterns = [
        r"[^.\n]*milyon\s*TL[^.\n]*",
        r"[^.\n]*katılım\s*payı[^.\n]*",
        r"[^.\n]*rölöve[^.\n]*",
        r"[^.\n]*metrekare\s*\(m²\)[^.\n]*",
        r"[^.\n]*iskan\s*edilebilir[^.\n]*",
        r"[^.\n]*iki\s*farklı\s*mimari\s*alternatif[^.\n]*",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.I):
            note = compact(match.group(0))
            if note and note not in notes:
                notes.append(note)
    return notes[:12]


def count_floor_distribution(block: str | None) -> dict[str, int]:
    if not block:
        return {}
    owner = sum(int(n) for n in re.findall(r"(\d+)\s*Adet\s*arsa\s*sahib", block, flags=re.I))
    contractor = sum(int(n) for n in re.findall(r"(\d+)\s*adet\s*müteahh", block, flags=re.I))
    shops = len(re.findall(r"dükkan", block, flags=re.I))
    duplex = len(re.findall(r"dubleks", block, flags=re.I))
    return {
        "sum_owner_unit_mentions": owner,
        "sum_contractor_unit_mentions": contractor,
        "mentions_dukkkan_count": shops,
        "mentions_dubleks_count": duplex,
    }


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    records = json.loads(PDF_ANALYSIS.read_text(encoding="utf-8"))
    summaries = []
    for rec in records:
        if "TEKLİF DOSYALARI" not in rec["relative_path"]:
            continue
        text_file = rec.get("pdftotext_file") or rec.get("pypdf_text_file")
        if not text_file:
            continue
        text = normalize_text(Path(text_file).read_text(encoding="utf-8", errors="replace"))
        summary = {
            "relative_path": rec["relative_path"],
            "page_count": rec.get("page_count"),
            "text_file_used": text_file,
            "proposal_date": find_month(text),
            **find_title(text),
            **find_body_parcel(text),
            "otopark": find_otopark(text),
            "offer_block": extract_offer_block(text),
            "special_notes": find_special_notes(text),
        }
        summary["title_body_mismatch"] = (
            summary.get("title_ada")
            and summary.get("body_ada")
            and (summary["title_ada"] != summary["body_ada"] or summary["title_parsel"] != summary["body_parsel"])
        )
        summary["distribution_count_heuristic"] = count_floor_distribution(summary.get("offer_block"))
        summaries.append(summary)
    PROPOSAL_OUT.write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = ["# Teklif PDF Özetleri", ""]
    for s in summaries:
        lines.append(f"## {s['relative_path']}")
        lines.append(f"- Başlık ada/parsel: {s.get('title_ada')} / {s.get('title_parsel')}")
        lines.append(f"- Gövde ada/parsel: {s.get('body_ada')} / {s.get('body_parsel')} | Mahalle: {s.get('body_mahalle')}")
        lines.append(f"- Tarih: {s.get('proposal_date')} | Mevcut bağımsız bölüm: {s.get('existing_independent_units')} | Sayfa: {s.get('page_count')}")
        lines.append(f"- Otopark: {s.get('otopark')}")
        if s.get("title_body_mismatch"):
            lines.append("- UYARI: Başlık ada/parsel ile metin gövdesindeki ada/parsel uyuşmuyor.")
        if s.get("special_notes"):
            lines.append("- Özel notlar:")
            for note in s["special_notes"]:
                lines.append(f"  - {note}")
        if s.get("offer_block"):
            lines.append("")
            lines.append("Teklif bloğu:")
            lines.append("```text")
            lines.append(s["offer_block"])
            lines.append("```")
        lines.append("")
    PROPOSAL_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {PROPOSAL_OUT}")
    print(f"Wrote {PROPOSAL_MD}")


if __name__ == "__main__":
    main()
