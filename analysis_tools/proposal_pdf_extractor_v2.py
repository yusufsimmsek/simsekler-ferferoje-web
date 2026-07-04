from __future__ import annotations

import csv
import json
import re
import sys
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project")
ANALYSIS_ROOT = ROOT / "project_analysis"
PDF_CLEAN_INDEX = ANALYSIS_ROOT / "pdf_text_clean" / "index.json"
OUT = ANALYSIS_ROOT / "proposal_v2"

OUT_JSON = OUT / "proposal_v2_analysis.json"
OUT_CSV = OUT / "proposal_v2_summary.csv"
OUT_TERMS = OUT / "proposal_v2_terms.csv"
OUT_MD = OUT / "PROPOSAL_V2_REPORT.md"


MONTHS = {
    "ocak": "Ocak",
    "subat": "Subat",
    "mart": "Mart",
    "nisan": "Nisan",
    "mayis": "Mayis",
    "haziran": "Haziran",
    "temmuz": "Temmuz",
    "agustos": "Agustos",
    "eylul": "Eylul",
    "ekim": "Ekim",
    "kasim": "Kasim",
    "aralik": "Aralik",
}

FLOOR_END_MARKERS = [
    "surecin",
    "gorusme",
    "saygilarimizla",
    "mulksahipligi",
    "alanduzenlemesi",
    "buyapilanma",
]


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize(value: Any) -> str:
    text = str(value or "").casefold().replace("ı", "i")
    text = text.replace("İ", "i").replace("I", "i")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("̧", "").replace("̆", "")
    return text


def key(value: Any) -> str:
    return re.sub(r"[^a-z0-9%]+", "", normalize(value))


def clean_line(value: str) -> str:
    value = re.sub(r"\s+", " ", value.replace("--- PAGE", " PAGE")).strip(" |")
    return value.strip()


def line_records(text: str) -> list[dict[str, str]]:
    records = []
    for raw in text.splitlines():
        line = clean_line(raw)
        if not line:
            continue
        if re.match(r"PAGE\s+\d+\s+---", line, flags=re.I):
            continue
        records.append({"text": line, "norm": normalize(line), "key": key(line)})
    return records


def proposal_clean_records() -> list[dict[str, Any]]:
    records = []
    for item in read_json(PDF_CLEAN_INDEX):
        rel = item.get("relative_path") or ""
        if "AŞAMA 7" not in rel and "TEKL" not in normalize(rel).upper():
            continue
        clean_path = Path(item["clean_text"])
        records.append(
            {
                "relative_path": rel,
                "clean_text": str(clean_path),
                "text": clean_path.read_text(encoding="utf-8", errors="replace"),
                "clean_chars": item.get("clean_chars"),
            }
        )
    return records


def parse_parcel(text: str, rel: str) -> dict[str, Any]:
    joined = key(rel + " " + text)
    title = re.search(r"(\d{3,5})ada(\d{1,3})parsel", joined)
    title_key = f"{int(title.group(1))}-{int(title.group(2))}" if title else None

    body = None
    for match in re.finditer(r"([a-z]+)mahallesi(\d{3,5})ada(\d{1,3})parsel", joined):
        body = match
        break
    body_key = f"{int(body.group(2))}-{int(body.group(3))}" if body else None
    mahalle = None
    if body:
        mahalle_raw = body.group(1)
        mahalle_raw = re.sub(r".*(?:ili|ilcesi)", "", mahalle_raw)
        mahalle = mahalle_raw[-32:] if mahalle_raw else None

    existing = re.search(r"toplam(\d+)bagimsizbolum", joined)
    existing_units = int(existing.group(1)) if existing else None
    return {
        "parcel_key": body_key or title_key,
        "title_parcel_key": title_key,
        "body_parcel_key": body_key,
        "body_mahalle_key": mahalle,
        "existing_independent_units": existing_units,
        "title_body_mismatch": bool(title_key and body_key and title_key != body_key),
    }


def parse_date(text: str) -> str | None:
    compact = key(text)
    for month_key, month_name in MONTHS.items():
        if re.search(rf"{month_key}2026|2026{month_key}", compact):
            return f"{month_name} 2026"
    return None


def parse_otopark(text: str) -> dict[str, Any] | None:
    compact = key(text)
    match = re.search(r"(\d+)bodrumkattakapaliotopark", compact)
    if not match:
        return None
    floor = int(match.group(1))
    return {
        "floor_no": floor,
        "label": f"{floor}. bodrum katta kapali otopark",
        "excerpt": "kapali otopark",
    }


def floor_label_from_key(line_key: str) -> str | None:
    if "zeminkatta" in line_key or "zeminkat" in line_key:
        return "Zemin kat"
    match = re.search(r"(\d+)bodrumkatta", line_key)
    if match:
        return f"{int(match.group(1))}. Bodrum kat"
    match = re.search(r"(\d+)ve(\d+)katlarda", line_key)
    if match:
        return f"{int(match.group(1))}. ve {int(match.group(2))}. katlar"
    match = re.search(r"(\d+)katta", line_key)
    if match and int(match.group(1)) <= 20:
        return f"{int(match.group(1))}. Kat"
    match = re.search(r"(\d+)(\d+)ve(\d+)katlarda", line_key)
    if match:
        return f"{int(match.group(1))}., {int(match.group(2))}. ve {int(match.group(3))}. katlar"
    return None


def floor_markers(line_key: str) -> list[tuple[int, str]]:
    markers: list[tuple[int, str]] = []
    covered_spans: list[tuple[int, int]] = []
    for match in re.finditer(r"zeminkatta|zeminkat", line_key):
        markers.append((match.start(), "Zemin kat"))
    for match in re.finditer(r"(\d+)bodrumkatta", line_key):
        markers.append((match.start(), f"{int(match.group(1))}. Bodrum kat"))
    for match in re.finditer(r"(\d+)ve(\d+)katlarda|(\d+)ve(\d+)katta", line_key):
        first = int(match.group(1) or match.group(3))
        second = int(match.group(2) or match.group(4))
        markers.append((match.start(), f"{first}. ve {second}. katlar"))
        covered_spans.append((match.start(), match.end()))
    for match in re.finditer(r"(\d+)katta", line_key):
        number = int(match.group(1))
        if any(start <= match.start() < end for start, end in covered_spans):
            continue
        if number <= 20 and "bodrum" not in line_key[max(0, match.start() - 12) : match.end() + 12]:
            markers.append((match.start(), f"{number}. Kat"))
    deduped = []
    seen = set()
    for item in sorted(markers, key=lambda pair: pair[0]):
        if item not in seen:
            deduped.append(item)
            seen.add(item)
    return deduped


def classify_unit_type(segment_key: str) -> str:
    scan = segment_key[:48]
    if "depo" in scan:
        return "depo"
    if "dukkan" in scan:
        return "dukkan"
    if "dubleks" in scan or "cat" in scan:
        return "dubleks_daire"
    if "11" in scan or "1+1" in scan:
        return "1+1_daire"
    if "21" in scan or "2+1" in scan:
        return "2+1_daire"
    if "31" in scan or "3+1" in scan:
        return "3+1_daire"
    if "41" in scan or "4+1" in scan:
        return "4+1_daire"
    if "daire" in scan:
        return "daire"
    if "alan" in scan:
        return "alan"
    return "belirsiz"


def unit_mentions(segment_text: str, floor_label: str | None, source_line: str) -> list[dict[str, Any]]:
    segment_key = key(segment_text)
    mentions = []
    patterns = [
        ("owner", r"(\d+)adetarsasahib"),
        ("contractor", r"(\d+)adetmuteah"),
        ("total", r"toplam(\d+)adet"),
    ]
    for role, pattern in patterns:
        for match in re.finditer(pattern, segment_key):
            count = int(match.group(1))
            mentions.append(
                {
                    "term_type": "unit_distribution",
                    "role": role,
                    "unit_count": count,
                    "unit_type": classify_unit_type(segment_key[match.end() : match.end() + 64]),
                    "floor": floor_label,
                    "label": f"{role} {count}",
                    "excerpt": source_line[:260],
                    "confidence": 0.82,
                }
            )

    for match in re.finditer(r"(on|arka|ara)cephe(\d+)adet([0-9]{1,2})?daire", segment_key):
        mentions.append(
            {
                "term_type": "unit_distribution",
                "role": "layout",
                "unit_count": int(match.group(2)),
                "unit_type": f"{match.group(3)[0]}+{match.group(3)[1]}_daire" if match.group(3) and len(match.group(3)) == 2 else "daire",
                "floor": floor_label,
                "label": f"{match.group(1)} cephe",
                "excerpt": source_line[:260],
                "confidence": 0.72,
            }
        )
    return mentions


def collect_distribution(lines: list[dict[str, str]]) -> list[dict[str, Any]]:
    terms = []
    current_floor = None
    started = False
    for idx, rec in enumerate(lines):
        line_key = rec["key"]
        if "sunulanteklifkapsaminda" in line_key or "teklifkapsaminda" in line_key:
            started = True
        if not started and idx < 4:
            continue
        if any(marker in line_key for marker in FLOOR_END_MARKERS):
            if started:
                break

        markers = floor_markers(line_key)
        if markers:
            if current_floor and markers[0][0] > 0:
                terms.extend(unit_mentions(line_key[: markers[0][0]], current_floor, rec["text"]))
            for marker_index, (position, floor) in enumerate(markers):
                next_position = markers[marker_index + 1][0] if marker_index + 1 < len(markers) else len(line_key)
                terms.extend(unit_mentions(line_key[position:next_position], floor, rec["text"]))
                current_floor = floor
            continue

        floor = floor_label_from_key(line_key)
        if floor:
            current_floor = floor

        if current_floor:
            terms.extend(unit_mentions(rec["text"], current_floor, rec["text"]))

    return dedupe_terms(terms)


def parse_alternatives(text: str) -> list[dict[str, Any]]:
    compact = key(text)
    terms = []
    for alt_match in re.finditer(r"(\d+)alternatif", compact):
        alt_no = int(alt_match.group(1))
        start = alt_match.end()
        next_alt = re.search(r"\d+alternatif", compact[start:])
        end = start + next_alt.start() if next_alt else min(len(compact), start + 700)
        block = compact[start:end]
        if "dorderadetdaire" in block:
            terms.append(
                {
                    "term_type": "alternative_distribution",
                    "role": "total",
                    "unit_count": 12,
                    "unit_type": "daire",
                    "floor": "Zemin, 1. ve 2. katlar",
                    "label": f"{alt_no}. alternatif: her katta 4 daire",
                    "excerpt": f"{alt_no}. Alternatif",
                    "confidence": 0.74,
                }
            )
        for match in re.finditer(r"(\d+)eradetdaire", block):
            count = int(match.group(1))
            terms.append(
                {
                    "term_type": "alternative_distribution",
                    "role": "total",
                    "unit_count": count * 2,
                    "unit_type": "daire",
                    "floor": "1. ve 2. katlar",
                    "label": f"{alt_no}. alternatif: {count}'er daire",
                    "excerpt": f"{alt_no}. Alternatif",
                    "confidence": 0.7,
                }
            )
        duplex = re.search(r"(\d+)adetdubleksdaire|(\d+)adetdubleks", block)
        if duplex:
            count = int(duplex.group(1) or duplex.group(2))
            terms.append(
                {
                    "term_type": "alternative_distribution",
                    "role": "total",
                    "unit_count": count,
                    "unit_type": "dubleks_daire",
                    "floor": "3. Kat",
                    "label": f"{alt_no}. alternatif: dubleks",
                    "excerpt": f"{alt_no}. Alternatif",
                    "confidence": 0.78,
                }
            )
    return terms


def parse_money_amount(raw: str) -> float | None:
    raw_key = key(raw)
    if "milyon" in raw_key:
        match = re.search(r"(\d+)", raw_key)
        return float(match.group(1)) * 1_000_000 if match else None
    match = re.search(r"(\d[\d.]*)", raw)
    if not match:
        match = re.search(r"(\d+)", raw_key)
    if not match:
        return None
    return float(match.group(1).replace(".", ""))


def parse_financial_terms(lines: list[dict[str, str]]) -> list[dict[str, Any]]:
    terms = []
    for rec in lines:
        line_key = rec["key"]
        text = rec["text"]
        if "kiradestegi" in line_key or "kirayardimi" in line_key:
            amount = parse_money_amount(text)
            terms.append(
                {
                    "term_type": "financial",
                    "label": "kira_destegi",
                    "amount": amount,
                    "currency": "TRY" if amount else None,
                    "excerpt": text[:260],
                    "confidence": 0.86,
                }
            )
        if "katilimpayi" in line_key:
            terms.append(
                {
                    "term_type": "financial",
                    "label": "katilim_payi",
                    "amount": parse_money_amount(text),
                    "currency": "TRY",
                    "excerpt": text[:260],
                    "confidence": 0.82,
                }
            )
        if "herhangibirodemeyapmayacak" in line_key or "muteahhiteherhangibirodeme" in line_key:
            terms.append(
                {
                    "term_type": "financial",
                    "label": "muteahhite_odeme_yok",
                    "amount": 0,
                    "currency": "TRY",
                    "excerpt": text[:260],
                    "confidence": 0.78,
                }
            )
        if "satilacak" in line_key and ("paylastirilacak" in line_key or "satisbedeli" in line_key):
            terms.append(
                {
                    "term_type": "financial",
                    "label": "satis_bedeli_paylasimi",
                    "amount": None,
                    "currency": None,
                    "excerpt": text[:260],
                    "confidence": 0.74,
                }
            )
        for percent in re.findall(r"%\s*(\d+)", text):
            if "alan" in line_key or "kuculme" in line_key or "kaybi" in line_key:
                terms.append(
                    {
                        "term_type": "financial",
                        "label": "alan_kuculme_orani",
                        "percent": int(percent),
                        "excerpt": text[:260],
                        "confidence": 0.76,
                    }
                )
    return dedupe_terms(terms)


def parse_conditions(lines: list[dict[str, str]]) -> list[dict[str, Any]]:
    rules = [
        ("multiple_alternatives", ["ikifarklimimarialternatif", "alternatif"]),
        ("iskan_edilebilir_alan", ["iskanedilebilir"]),
        ("rolove_bekleniyor", ["rolove"]),
        ("belediye_degisiklik_ihtimali", ["belediye", "degisiklik"]),
        ("alan_telafi", ["telafi", "alankaybi"]),
        ("hak_kaybi_yok", ["hakkaybiolusmamaktadir"]),
    ]
    terms = []
    for rec in lines:
        line_key = rec["key"]
        for label, needles in rules:
            if all(needle in line_key for needle in needles):
                terms.append(
                    {
                        "term_type": "condition",
                        "label": label,
                        "excerpt": rec["text"][:260],
                        "confidence": 0.78,
                    }
                )
    return dedupe_terms(terms)


def dedupe_terms(terms: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    out = []
    for term in terms:
        signature = (
            term.get("term_type"),
            term.get("label"),
            term.get("role"),
            term.get("unit_count"),
            term.get("unit_type"),
            term.get("floor"),
            key(term.get("excerpt", ""))[:120],
        )
        if signature in seen:
            continue
        seen.add(signature)
        out.append(term)
    return out


def build_warnings(record: dict[str, Any]) -> list[dict[str, Any]]:
    warnings = []
    if record.get("title_body_mismatch"):
        warnings.append(
            {
                "level": "risk",
                "code": "proposal_title_body_mismatch",
                "message": f"Baslik {record.get('title_parcel_key')} ama govde {record.get('body_parcel_key')}.",
            }
        )
    if not record.get("distribution_terms") and not record.get("alternative_terms"):
        warnings.append(
            {
                "level": "review",
                "code": "proposal_distribution_missing",
                "message": "Teklif PDF'inden kat/birim dagilimi okunamadi.",
            }
        )
    if record.get("alternative_terms"):
        warnings.append(
            {
                "level": "review",
                "code": "proposal_multiple_alternatives",
                "message": "Teklif birden fazla mimari alternatif iceriyor.",
            }
        )
    if any(term.get("label") == "katilim_payi" for term in record.get("financial_terms", [])):
        warnings.append(
            {
                "level": "risk",
                "code": "proposal_participation_payment",
                "message": "Teklif katilim payi/odeme sarti iceriyor.",
            }
        )
    if any(term.get("label") == "rolove_bekleniyor" for term in record.get("condition_terms", [])):
        warnings.append(
            {
                "level": "review",
                "code": "proposal_rolove_pending",
                "message": "Teklifte rolove tamamlandiktan sonra netlesecek alan notu var.",
            }
        )
    if record.get("confidence_score", 0) < 0.55:
        warnings.append(
            {
                "level": "review",
                "code": "proposal_low_parser_confidence",
                "message": "PDF metin akisi dusuk guvenle ayrisabildi.",
            }
        )
    return warnings


def confidence(record: dict[str, Any]) -> float:
    score = 0.0
    score += 0.16 if record.get("title_parcel_key") else 0
    score += 0.16 if record.get("body_parcel_key") else 0
    score += 0.12 if record.get("existing_independent_units") else 0
    score += 0.1 if record.get("proposal_date") else 0
    score += 0.1 if record.get("otopark") else 0
    score += 0.22 if record.get("distribution_terms") or record.get("alternative_terms") else 0
    score += 0.08 if record.get("financial_terms") or record.get("condition_terms") else 0
    score += 0.06 if not record.get("title_body_mismatch") else 0
    return round(min(score, 1.0), 2)


def parse_record(item: dict[str, Any]) -> dict[str, Any]:
    text = item["text"]
    lines = line_records(text)
    parcel = parse_parcel(text, item["relative_path"])
    distribution_terms = collect_distribution(lines)
    alternative_terms = parse_alternatives(text)
    financial_terms = parse_financial_terms(lines)
    condition_terms = parse_conditions(lines)
    owner_total = sum(term.get("unit_count") or 0 for term in distribution_terms if term.get("role") == "owner")
    contractor_total = sum(term.get("unit_count") or 0 for term in distribution_terms if term.get("role") == "contractor")
    total_units = sum(term.get("unit_count") or 0 for term in distribution_terms if term.get("role") == "total")

    record = {
        "relative_path": item["relative_path"],
        "clean_text": item["clean_text"],
        "clean_chars": item.get("clean_chars"),
        **parcel,
        "proposal_date": parse_date(text),
        "otopark": parse_otopark(text),
        "distribution_terms": distribution_terms,
        "alternative_terms": alternative_terms,
        "financial_terms": financial_terms,
        "condition_terms": condition_terms,
        "owner_units_total": owner_total,
        "contractor_units_total": contractor_total,
        "total_unit_mentions": total_units,
        "distribution_item_count": len(distribution_terms),
        "alternative_item_count": len(alternative_terms),
        "financial_term_count": len(financial_terms),
        "condition_term_count": len(condition_terms),
    }
    record["confidence_score"] = confidence(record)
    record["parser_warnings"] = build_warnings(record)
    return record


def flatten_terms(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for record in records:
        for group in ["distribution_terms", "alternative_terms", "financial_terms", "condition_terms"]:
            for term in record.get(group, []):
                row = {
                    "parcel_key": record.get("parcel_key"),
                    "relative_path": record.get("relative_path"),
                    "group": group,
                    **term,
                }
                rows.append(row)
        for warning in record.get("parser_warnings", []):
            rows.append(
                {
                    "parcel_key": record.get("parcel_key"),
                    "relative_path": record.get("relative_path"),
                    "group": "parser_warnings",
                    "term_type": "warning",
                    "label": warning.get("code"),
                    "level": warning.get("level"),
                    "excerpt": warning.get("message"),
                    "confidence": record.get("confidence_score"),
                }
            )
    return rows


def write_csvs(records: list[dict[str, Any]], terms: list[dict[str, Any]]) -> None:
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        fieldnames = [
            "parcel_key",
            "title_parcel_key",
            "body_parcel_key",
            "relative_path",
            "proposal_date",
            "existing_independent_units",
            "otopark_label",
            "owner_units_total",
            "contractor_units_total",
            "total_unit_mentions",
            "distribution_item_count",
            "alternative_item_count",
            "financial_term_count",
            "condition_term_count",
            "warning_count",
            "confidence_score",
        ]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            writer.writerow(
                {
                    "parcel_key": rec.get("parcel_key"),
                    "title_parcel_key": rec.get("title_parcel_key"),
                    "body_parcel_key": rec.get("body_parcel_key"),
                    "relative_path": rec.get("relative_path"),
                    "proposal_date": rec.get("proposal_date"),
                    "existing_independent_units": rec.get("existing_independent_units"),
                    "otopark_label": (rec.get("otopark") or {}).get("label"),
                    "owner_units_total": rec.get("owner_units_total"),
                    "contractor_units_total": rec.get("contractor_units_total"),
                    "total_unit_mentions": rec.get("total_unit_mentions"),
                    "distribution_item_count": rec.get("distribution_item_count"),
                    "alternative_item_count": rec.get("alternative_item_count"),
                    "financial_term_count": rec.get("financial_term_count"),
                    "condition_term_count": rec.get("condition_term_count"),
                    "warning_count": len(rec.get("parser_warnings") or []),
                    "confidence_score": rec.get("confidence_score"),
                }
            )

    all_keys = sorted({key for row in terms for key in row.keys()})
    with OUT_TERMS.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=all_keys, extrasaction="ignore")
        writer.writeheader()
        for row in terms:
            writer.writerow(row)


def write_report(records: list[dict[str, Any]], terms: list[dict[str, Any]]) -> None:
    warning_counts = Counter(w["code"] for rec in records for w in rec.get("parser_warnings", []))
    lines = [
        "# Proposal PDF Extractor v2 Report",
        "",
        f"Generated at: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "This report is generated from cleaned AŞAMA 7 proposal PDF text. It extracts parcel identity, existing unit counts, parking terms, unit distribution hints, financial terms, special conditions, and parser warnings.",
        "",
        "## Summary",
        "",
        f"- Proposal PDFs analyzed: {len(records)}",
        f"- Term rows produced: {len(terms)}",
        f"- PDFs with distribution terms: {sum(1 for r in records if r.get('distribution_terms'))}",
        f"- PDFs with alternative terms: {sum(1 for r in records if r.get('alternative_terms'))}",
        f"- PDFs with financial terms: {sum(1 for r in records if r.get('financial_terms'))}",
        f"- PDFs with parser warnings: {sum(1 for r in records if r.get('parser_warnings'))}",
        "",
        "## Warning Counts",
        "",
    ]
    if warning_counts:
        for code, count in warning_counts.most_common():
            lines.append(f"- {code}: {count}")
    else:
        lines.append("- No parser warnings.")

    lines.extend(
        [
            "",
            "## Proposal Table",
            "",
            "| Parcel | Date | Existing units | Parking | Owner units | Contractor units | Dist. items | Financial | Conditions | Warnings | Confidence |",
            "|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for rec in records:
        parking = (rec.get("otopark") or {}).get("label") or "-"
        lines.append(
            "| "
            + " | ".join(
                [
                    str(rec.get("parcel_key") or "-"),
                    str(rec.get("proposal_date") or "-"),
                    str(rec.get("existing_independent_units") or "-"),
                    parking,
                    str(rec.get("owner_units_total") or "-"),
                    str(rec.get("contractor_units_total") or "-"),
                    str(rec.get("distribution_item_count") or "-"),
                    str(rec.get("financial_term_count") or "-"),
                    str(rec.get("condition_term_count") or "-"),
                    str(len(rec.get("parser_warnings") or [])),
                    str(rec.get("confidence_score")),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Implementation Notes",
            "",
            "- v2 uses cleaned PDF text and no-space normalized keys because many proposal PDFs merge Turkish words together.",
            "- Distribution terms are parser signals, not final contractual truth. The human review queue should keep them reviewable.",
            "- Financial and condition terms are extracted as separate rows so the backend can surface high-risk offer language independently from unit counts.",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    records = [parse_record(item) for item in proposal_clean_records()]
    terms = flatten_terms(records)
    write_json(
        OUT_JSON,
        {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "source": str(PDF_CLEAN_INDEX),
            "record_count": len(records),
            "term_count": len(terms),
            "records": records,
            "terms": terms,
        },
    )
    write_csvs(records, terms)
    write_report(records, terms)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_CSV}")
    print(f"Wrote {OUT_TERMS}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps({"records": len(records), "terms": len(terms)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
