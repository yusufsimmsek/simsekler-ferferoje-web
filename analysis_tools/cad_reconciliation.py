from __future__ import annotations

import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
SEMANTIC_ROOT = ANALYSIS_ROOT / "semantic_cad"

SEMANTIC_JSON = SEMANTIC_ROOT / "semantic_cad_analysis.json"
EXCEL_JSON = ANALYSIS_ROOT / "excel_analysis.json"
PROPOSAL_JSON = ANALYSIS_ROOT / "proposal_summaries.json"

OUT_JSON = SEMANTIC_ROOT / "cad_reconciliation.json"
OUT_CSV = SEMANTIC_ROOT / "cad_reconciliation.csv"
OUT_MD = SEMANTIC_ROOT / "CAD_RECONCILIATION.md"


CELL_RE = re.compile(r"\b([A-Z]{1,3}\d+)\b")
RANGE_RE = re.compile(r"\b([A-Z]{1,3})(\d+):([A-Z]{1,3})(\d+)\b")
PARCEL_RE = re.compile(r"(?<!\d)(\d{3,5})\s*[- ]\s*(\d{1,3})(?!\d)")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_text(value: Any) -> str:
    text = str(value or "")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return text.upper()


def parse_number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = text.replace("\u00a0", " ")
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    text = re.sub(r"[^0-9.\-]", "", text)
    try:
        return float(text)
    except ValueError:
        return None


def parcel_key_from_text(value: Any) -> str | None:
    text = normalize_text(value)
    match = PARCEL_RE.search(text)
    if not match:
        return None
    return f"{int(match.group(1))}-{int(match.group(2))}"


def col_to_num(col: str) -> int:
    number = 0
    for char in col:
        number = number * 26 + ord(char) - 64
    return number


def num_to_col(number: int) -> str:
    out = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        out = chr(remainder + 65) + out
    return out


def formula_refs(formula: str) -> set[str]:
    refs: set[str] = set()
    for match in RANGE_RE.finditer(formula or ""):
        c1, r1, c2, r2 = match.groups()
        c1n, c2n = col_to_num(c1), col_to_num(c2)
        r1n, r2n = int(r1), int(r2)
        # Keep expansion bounded; these metraj sheets are small tabular workbooks.
        if abs(c2n - c1n) <= 30 and abs(r2n - r1n) <= 400:
            for col_num in range(min(c1n, c2n), max(c1n, c2n) + 1):
                for row_num in range(min(r1n, r2n), max(r1n, r2n) + 1):
                    refs.add(f"{num_to_col(col_num)}{row_num}")
    stripped = RANGE_RE.sub("", formula or "")
    refs.update(CELL_RE.findall(stripped))
    return refs


def detect_top_level_excel_total(workbook: dict[str, Any]) -> dict[str, Any]:
    formulas: dict[str, tuple[str, float]] = {}
    referenced: set[str] = set()
    numeric_cells: dict[str, float] = {}
    headers_by_col: dict[str, str] = {}

    for sheet in workbook.get("sheets", []):
        for cell in sheet.get("non_empty_cells", []):
            address = str(cell.get("cell") or "")
            value = cell.get("value")
            cached = cell.get("cached_value")
            number = parse_number(cached if cached is not None else value)
            if number is not None:
                numeric_cells[address] = number
            if re.match(r"^[A-Z]+1$", address):
                headers_by_col[re.sub(r"\d+", "", address)] = normalize_text(value)
            if cell.get("data_type") == "f" and number is not None:
                formulas[address] = (str(value or ""), number)

    for formula, _number in formulas.values():
        referenced.update(formula_refs(formula))

    top_formulas = []
    for address, (formula, number) in sorted(formulas.items()):
        if address not in referenced:
            top_formulas.append(
                {
                    "cell": address,
                    "formula": formula,
                    "value_m2": round(number, 2),
                }
            )

    if top_formulas:
        total = round(sum(item["value_m2"] for item in top_formulas), 2)
        return {
            "method": "top_level_formula_sum",
            "total_m2": total,
            "component_count": len(top_formulas),
            "components": top_formulas,
        }

    total_cols = [col for col, header in headers_by_col.items() if "TOPLAM" in header]
    manual_components = []
    for address, number in sorted(numeric_cells.items()):
        col = re.sub(r"\d+", "", address)
        row = int(re.sub(r"\D+", "", address) or 0)
        if col in total_cols and row > 1:
            manual_components.append({"cell": address, "value_m2": round(number, 2)})

    return {
        "method": "manual_total_column_sum" if manual_components else "not_detected",
        "total_m2": round(sum(item["value_m2"] for item in manual_components), 2) if manual_components else None,
        "component_count": len(manual_components),
        "components": manual_components,
    }


def summarize_excel(workbooks: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for workbook in workbooks:
        key = parcel_key_from_text(workbook.get("relative_path")) or parcel_key_from_text(workbook.get("name"))
        if not key:
            continue
        detected = detect_top_level_excel_total(workbook)
        by_key[key] = {
            "parcel_key": key,
            "relative_path": workbook.get("relative_path"),
            "name": workbook.get("name"),
            "old_total_m2": detected.get("total_m2"),
            "method": detected.get("method"),
            "component_count": detected.get("component_count"),
            "components": detected.get("components"),
        }
    return by_key


def summarize_proposals(proposals: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for proposal in proposals:
        ada = proposal.get("title_ada")
        parsel = proposal.get("title_parsel")
        if ada and parsel:
            key = f"{int(ada)}-{int(parsel)}"
        else:
            key = parcel_key_from_text(proposal.get("relative_path"))
        if not key:
            continue
        heuristics = proposal.get("distribution_count_heuristic") or {}
        by_key[key].append(
            {
                "parcel_key": key,
                "relative_path": proposal.get("relative_path"),
                "proposal_date": proposal.get("proposal_date"),
                "existing_independent_units": parse_number(proposal.get("existing_independent_units")),
                "otopark": proposal.get("otopark"),
                "owner_unit_mentions": heuristics.get("sum_owner_unit_mentions"),
                "contractor_unit_mentions": heuristics.get("sum_contractor_unit_mentions"),
                "dukkkan_mentions": heuristics.get("mentions_dukkkan_count"),
                "dubleks_mentions": heuristics.get("mentions_dubleks_count"),
                "title_body_mismatch": proposal.get("title_body_mismatch"),
                "special_notes": proposal.get("special_notes") or [],
            }
        )
    return dict(by_key)


def summarize_cad(semantic_rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in semantic_rows:
        key = parcel_key_from_text(row.get("relative_path"))
        if not key:
            continue
        room_pairs = row.get("room_area_pairs") or []
        areas_by_type = row.get("area_by_type_m2") or {}
        net_labels = [parse_number(v) for v in row.get("net_area_labels_m2") or []]
        net_labels = [v for v in net_labels if v is not None]
        rooms_by_type = row.get("rooms_by_type") or {}
        dominant_rooms = sorted(rooms_by_type.items(), key=lambda item: (-item[1], item[0]))[:6]
        top_area_types = sorted(areas_by_type.items(), key=lambda item: (-float(item[1]), item[0]))[:6]
        by_key[key].append(
            {
                "parcel_key": key,
                "relative_path": row.get("relative_path"),
                "entity_count": row.get("modelspace_entity_count"),
                "layer_count": row.get("layer_count"),
                "room_label_count": row.get("room_label_count"),
                "area_text_count": row.get("area_text_count"),
                "room_area_pair_count": row.get("room_area_pair_count"),
                "detected_room_area_m2": round(float(row.get("total_detected_room_area_m2") or 0), 2),
                "net_label_count": len(net_labels),
                "net_label_sum_m2": round(sum(net_labels), 2) if net_labels else None,
                "net_label_min_m2": round(min(net_labels), 2) if net_labels else None,
                "net_label_max_m2": round(max(net_labels), 2) if net_labels else None,
                "rooms_by_type": rooms_by_type,
                "dominant_rooms": dict(dominant_rooms),
                "area_by_type_m2": {k: round(float(v), 2) for k, v in areas_by_type.items()},
                "top_area_types_m2": {k: round(float(v), 2) for k, v in top_area_types},
                "semantic_layer_counts": row.get("semantic_layer_counts") or {},
                "errors": row.get("errors") or [],
                "sample_pairs": [
                    {
                        "room_name": pair.get("room_name"),
                        "room_type": pair.get("room_type"),
                        "area_m2": pair.get("area_m2"),
                        "quality": pair.get("pair_quality"),
                    }
                    for pair in room_pairs[:8]
                ],
            }
        )
    return dict(by_key)


def quality_for_row(cad: dict[str, Any], excel: dict[str, Any] | None, proposals: list[dict[str, Any]]) -> tuple[str, list[str]]:
    notes: list[str] = []
    if cad.get("room_area_pair_count", 0) < 20:
        notes.append("CAD oda/m2 eslesmesi dusuk sayida.")
    if cad.get("net_label_count"):
        notes.append("CAD icinde NET alan etiketleri bulundu; teklif/daire bazli eslesme icin oncelikli sinyal.")
    else:
        notes.append("CAD icinde NET alan etiketi yok; oda toplamlari aday alan olarak kullanilmali.")

    if excel and excel.get("old_total_m2"):
        diff = round(cad["detected_room_area_m2"] - excel["old_total_m2"], 2)
        ratio = diff / excel["old_total_m2"]
        notes.append(f"CAD oda toplamı ile eski Excel toplamı farkı {diff:.2f} m2 ({ratio:.1%}).")
        if abs(ratio) <= 0.15:
            quality = "yakindan_karsilastirilabilir"
        elif abs(ratio) <= 1.5:
            quality = "olcek_farki_var"
        else:
            quality = "farkli_kapsam_veya_tekrarli_plan"
    else:
        quality = "excel_yok"
        notes.append("Bu ada-parsel icin eski metraj Excel'i bulunmadi.")

    if not proposals:
        notes.append("Bu ada-parsel icin teklif PDF ozeti bulunmadi.")
    else:
        if any(p.get("special_notes") for p in proposals):
            notes.append("Teklif PDF'inde ozel not bulundu; otomasyon uyarisi olarak saklanmali.")
        if any(p.get("title_body_mismatch") for p in proposals):
            notes.append("Teklif baslik/govde ada-parsel uyumsuzlugu var.")

    return quality, notes


def build_reconciliation() -> dict[str, Any]:
    semantic = load_json(SEMANTIC_JSON)
    excel = summarize_excel(load_json(EXCEL_JSON))
    proposals = summarize_proposals(load_json(PROPOSAL_JSON))
    cad = summarize_cad(semantic)

    all_keys = sorted(set(cad) | set(excel) | set(proposals), key=lambda key: tuple(int(x) for x in key.split("-")))
    rows = []

    for key in all_keys:
        cad_rows = cad.get(key) or []
        if not cad_rows:
            excel_row = excel.get(key)
            prop_rows = proposals.get(key) or []
            rows.append(
                {
                    "parcel_key": key,
                    "status": "cad_yok",
                    "cad": None,
                    "excel": excel_row,
                    "proposals": prop_rows,
                    "quality": "cad_yok",
                    "notes": ["Bu ada-parsel icin AŞAMA 6 CAD semantik plani bulunmadi."],
                }
            )
            continue

        for cad_row in cad_rows:
            excel_row = excel.get(key)
            prop_rows = proposals.get(key) or []
            quality, notes = quality_for_row(cad_row, excel_row, prop_rows)
            rows.append(
                {
                    "parcel_key": key,
                    "status": "matched" if excel_row or prop_rows else "cad_only",
                    "cad": cad_row,
                    "excel": excel_row,
                    "proposals": prop_rows,
                    "quality": quality,
                    "notes": notes,
                }
            )

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_files": {
            "semantic": str(SEMANTIC_JSON),
            "excel": str(EXCEL_JSON),
            "proposals": str(PROPOSAL_JSON),
        },
        "summary": {
            "parcel_keys_total": len(all_keys),
            "cad_plan_rows": sum(len(v) for v in cad.values()),
            "excel_workbooks": len(excel),
            "proposal_files": sum(len(v) for v in proposals.values()),
            "matched_rows": sum(1 for row in rows if row["status"] == "matched"),
            "cad_only_rows": sum(1 for row in rows if row["status"] == "cad_only"),
            "cad_missing_rows": sum(1 for row in rows if row["status"] == "cad_yok"),
        },
        "excel_by_parcel": excel,
        "proposal_by_parcel": proposals,
        "cad_by_parcel": cad,
        "rows": rows,
    }


def write_csv(data: dict[str, Any]) -> None:
    fieldnames = [
        "parcel_key",
        "status",
        "quality",
        "cad_path",
        "cad_pairs",
        "cad_room_area_m2",
        "cad_net_label_count",
        "cad_net_label_sum_m2",
        "excel_path",
        "excel_old_total_m2",
        "excel_method",
        "delta_cad_room_vs_excel_m2",
        "delta_percent",
        "proposal_count",
        "proposal_dates",
        "existing_independent_units",
        "owner_unit_mentions",
        "contractor_unit_mentions",
        "otopark",
        "notes",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in data["rows"]:
            cad = row.get("cad") or {}
            excel = row.get("excel") or {}
            props = row.get("proposals") or []
            cad_area = cad.get("detected_room_area_m2")
            excel_total = excel.get("old_total_m2")
            delta = round(cad_area - excel_total, 2) if cad_area is not None and excel_total else None
            delta_pct = round(delta / excel_total * 100, 2) if delta is not None and excel_total else None
            writer.writerow(
                {
                    "parcel_key": row["parcel_key"],
                    "status": row["status"],
                    "quality": row["quality"],
                    "cad_path": cad.get("relative_path"),
                    "cad_pairs": cad.get("room_area_pair_count"),
                    "cad_room_area_m2": cad_area,
                    "cad_net_label_count": cad.get("net_label_count"),
                    "cad_net_label_sum_m2": cad.get("net_label_sum_m2"),
                    "excel_path": excel.get("relative_path"),
                    "excel_old_total_m2": excel_total,
                    "excel_method": excel.get("method"),
                    "delta_cad_room_vs_excel_m2": delta,
                    "delta_percent": delta_pct,
                    "proposal_count": len(props),
                    "proposal_dates": "; ".join(str(p.get("proposal_date") or "") for p in props),
                    "existing_independent_units": "; ".join(
                        str(int(p["existing_independent_units"]))
                        for p in props
                        if p.get("existing_independent_units") is not None
                    ),
                    "owner_unit_mentions": "; ".join(str(p.get("owner_unit_mentions") or "") for p in props),
                    "contractor_unit_mentions": "; ".join(str(p.get("contractor_unit_mentions") or "") for p in props),
                    "otopark": "; ".join(str(p.get("otopark") or "") for p in props),
                    "notes": " | ".join(row.get("notes") or []),
                }
            )


def fmt_m2(value: Any) -> str:
    number = parse_number(value)
    if number is None:
        return "-"
    return f"{number:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def write_markdown(data: dict[str, Any]) -> None:
    summary = data["summary"]
    quality_counts = Counter(row["quality"] for row in data["rows"])

    lines = [
        "# CAD-Excel-PDF Mutabakat Raporu",
        "",
        f"Uretim zamani: {data['generated_at']}",
        "",
        "Bu rapor, AŞAMA 6 plan cizimlerinden cikarilan oda/m2 etiketlerini AŞAMA 5 eski metraj Excel'leri ve AŞAMA 7 teklif PDF ozetleri ile ada-parsel anahtarinda yan yana getirir. CAD oda toplamlari nihai ruhsat alani degil; cizimdeki tekrarlar, alternatifler ve plan bolgeleri nedeniyle aday semantik sinyaldir.",
        "",
        "## Genel Ozet",
        "",
        f"- CAD semantik plan satiri: {summary['cad_plan_rows']}",
        f"- Eski metraj Excel dosyasi: {summary['excel_workbooks']}",
        f"- Teklif PDF dosyasi: {summary['proposal_files']}",
        f"- Eslesen CAD satiri: {summary['matched_rows']}",
        f"- Yalniz CAD olan satir: {summary['cad_only_rows']}",
        f"- CAD'i olmayan Excel/PDF satiri: {summary['cad_missing_rows']}",
        "",
        "## Kalite Dagilimi",
        "",
    ]
    for key, count in sorted(quality_counts.items()):
        lines.append(f"- {key}: {count}")

    lines.extend(
        [
            "",
            "## Ada-Parsel Mutabakat Tablosu",
            "",
            "| Ada-Parsel | Durum | Kalite | CAD oda eslesmesi | CAD oda toplam m2 | CAD NET etiketleri | Excel eski toplam m2 | Fark m2 | PDF teklif | Not |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|---|",
        ]
    )

    for row in data["rows"]:
        cad = row.get("cad") or {}
        excel = row.get("excel") or {}
        props = row.get("proposals") or []
        cad_area = cad.get("detected_room_area_m2")
        excel_total = excel.get("old_total_m2")
        delta = cad_area - excel_total if cad_area is not None and excel_total else None
        note = (row.get("notes") or [""])[0]
        lines.append(
            "| "
            + " | ".join(
                [
                    row["parcel_key"],
                    row["status"],
                    row["quality"],
                    str(cad.get("room_area_pair_count") or "-"),
                    fmt_m2(cad_area),
                    str(cad.get("net_label_count") or "-"),
                    fmt_m2(excel_total),
                    fmt_m2(delta),
                    str(len(props) or "-"),
                    note.replace("|", "/"),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Otomasyon Icin Cikarimlar",
            "",
            "- Ada-parsel anahtari dosya adlarindan guvenilir bicimde yakalanabiliyor; bu, ileride proje dosya havuzunu otomatik indekslemek icin ana omurga olabilir.",
            "- Excel eski metraj toplamlarini genel bir formul grafigiyle bulmak mumkun. Tek bir sabit hucreye bagimli kalinmamali.",
            "- CAD oda/m2 eslesmesi cok yuksek sayida yakalandi; fakat toplam CAD oda alani bazi dosyalarda Excel eski toplamindan cok farkli. Bu fark, yeni proje alani, tekrarli plan bloklari veya alternatif tasarimlar nedeniyle beklenen bir sinyal olarak ele alinmali.",
            "- CAD icindeki NET etiketleri olan projelerde bagimsiz bolum bazli eslestirme icin daha guclu bir ikinci asama kurulabilir.",
            "- Teklif PDF'lerinde ada/parsel, otopark, ozel not ve hak dagilimi metinleri alinabiliyor; fakat PDF metin akisi bozuk oldugu icin teklif parser'i kural + insan onayi modeliyle tasarlanmali.",
            "",
            "## Sonraki Teknik Esik",
            "",
            "Bir sonraki adim, bu mutabakat katmaninin uzerine 'proje veri modeli' kurmak: Parcel, SourceFile, ExistingUnit, ProposedUnit, Room, NetAreaLabel, OfferTerm ve Warning nesnelerini tanimlayip her kaynaktan gelen bilgiyi ayni semaya yazmak.",
        ]
    )

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    data = build_reconciliation()
    write_json(OUT_JSON, data)
    write_csv(data)
    write_markdown(data)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_CSV}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps(data["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
