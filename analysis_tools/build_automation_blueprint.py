from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
OUT = ANALYSIS_ROOT / "automation_blueprint"

INVENTORY_JSON = ANALYSIS_ROOT / "inventory.json"
RECON_JSON = ANALYSIS_ROOT / "semantic_cad" / "cad_reconciliation.json"

OUT_SCHEMA = OUT / "project_schema.json"
OUT_SEED = OUT / "automation_seed.json"
OUT_MD = OUT / "AUTOMATION_BLUEPRINT.md"


PARCEL_RE = re.compile(r"(?<!\d)(\d{3,5})\s*[- ]\s*(\d{1,3})(?!\d)")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def parcel_key_from_text(value: Any) -> str | None:
    text = str(value or "").upper()
    match = PARCEL_RE.search(text)
    if not match:
        return None
    return f"{int(match.group(1))}-{int(match.group(2))}"


def split_parcel_key(key: str) -> tuple[int | None, int | None]:
    parts = key.split("-")
    if len(parts) != 2:
        return None, None
    return int(parts[0]), int(parts[1])


def normalize_key(value: Any) -> str:
    text = str(value or "").casefold().replace("ı", "i")
    text = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in text if not unicodedata.combining(ch))


def file_kind(item: dict[str, Any]) -> str:
    ext = str(item.get("extension") or "").lower()
    directory = normalize_key(item.get("directory"))
    if ext == ".dwg" and "plan" in directory:
        return "cad_plan_dwg"
    if ext == ".dwg" and "cekirdek" in directory:
        return "cad_core_study_dwg"
    if ext == ".dwg":
        return "cad_dwg"
    if ext == ".xlsx":
        return "excel_old_metraj"
    if ext == ".pdf" and "teklif" in directory:
        return "proposal_pdf"
    if ext == ".pdf":
        return "regulation_or_reference_pdf"
    if ext in {".tif", ".tiff"}:
        return "old_plan_raster"
    return "source_file"


def compact_file(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "file_id": str(item.get("sha256") or "")[:12],
        "relative_path": item.get("relative_path"),
        "absolute_path": item.get("absolute_path"),
        "stage": item.get("stage"),
        "kind": file_kind(item),
        "extension": item.get("extension"),
        "size_mb": item.get("size_mb"),
        "modified": item.get("modified"),
        "sha256": item.get("sha256"),
    }


def build_schema() -> dict[str, Any]:
    return {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "KentselDonusumAutomationSeed",
        "type": "object",
        "required": ["generated_at", "source_root", "parcels", "source_files", "warnings"],
        "properties": {
            "generated_at": {"type": "string"},
            "source_root": {"type": "string"},
            "summary": {"type": "object"},
            "source_files": {
                "type": "array",
                "items": {"$ref": "#/$defs/SourceFile"},
            },
            "parcels": {
                "type": "array",
                "items": {"$ref": "#/$defs/Parcel"},
            },
            "warnings": {
                "type": "array",
                "items": {"$ref": "#/$defs/Warning"},
            },
        },
        "$defs": {
            "SourceFile": {
                "type": "object",
                "required": ["file_id", "relative_path", "kind", "extension"],
                "properties": {
                    "file_id": {"type": "string"},
                    "relative_path": {"type": "string"},
                    "absolute_path": {"type": "string"},
                    "stage": {"type": "string"},
                    "kind": {"type": "string"},
                    "extension": {"type": "string"},
                    "size_mb": {"type": "number"},
                    "modified": {"type": "string"},
                    "sha256": {"type": "string"},
                },
            },
            "Parcel": {
                "type": "object",
                "required": ["parcel_key", "ada", "parsel", "source_file_ids", "status"],
                "properties": {
                    "parcel_key": {"type": "string"},
                    "ada": {"type": ["integer", "null"]},
                    "parsel": {"type": ["integer", "null"]},
                    "status": {"type": "string"},
                    "reconciliation_quality": {"type": "string"},
                    "source_file_ids": {"type": "array", "items": {"type": "string"}},
                    "cad_plans": {"type": "array", "items": {"$ref": "#/$defs/CadPlan"}},
                    "excel_old_metraj": {"type": ["object", "null"]},
                    "proposal_summaries": {"type": "array", "items": {"type": "object"}},
                    "warnings": {"type": "array", "items": {"$ref": "#/$defs/Warning"}},
                },
            },
            "CadPlan": {
                "type": "object",
                "properties": {
                    "relative_path": {"type": "string"},
                    "entity_count": {"type": ["integer", "null"]},
                    "layer_count": {"type": ["integer", "null"]},
                    "room_area_pair_count": {"type": ["integer", "null"]},
                    "detected_room_area_m2": {"type": ["number", "null"]},
                    "net_label_count": {"type": ["integer", "null"]},
                    "net_label_sum_m2": {"type": ["number", "null"]},
                    "dominant_rooms": {"type": "object"},
                    "top_area_types_m2": {"type": "object"},
                    "sample_pairs": {"type": "array", "items": {"type": "object"}},
                },
            },
            "Warning": {
                "type": "object",
                "required": ["level", "code", "message"],
                "properties": {
                    "level": {"enum": ["info", "review", "risk"]},
                    "code": {"type": "string"},
                    "parcel_key": {"type": ["string", "null"]},
                    "source": {"type": ["string", "null"]},
                    "message": {"type": "string"},
                },
            },
        },
    }


def warning(level: str, code: str, message: str, parcel_key: str | None = None, source: str | None = None) -> dict[str, Any]:
    return {
        "level": level,
        "code": code,
        "parcel_key": parcel_key,
        "source": source,
        "message": message,
    }


def build_seed() -> dict[str, Any]:
    inventory = load_json(INVENTORY_JSON)
    recon = load_json(RECON_JSON)

    compact_files = [compact_file(item) for item in inventory]
    files_by_path = {item["relative_path"]: item for item in compact_files}
    file_ids_by_parcel: dict[str, set[str]] = defaultdict(set)

    for item in compact_files:
        key = parcel_key_from_text(item.get("relative_path")) or parcel_key_from_text(item.get("absolute_path"))
        if key:
            file_ids_by_parcel[key].add(item["file_id"])

    parcels_by_key: dict[str, dict[str, Any]] = {}
    global_warnings: list[dict[str, Any]] = []

    for row in recon.get("rows", []):
        key = row["parcel_key"]
        ada, parsel = split_parcel_key(key)
        cad = row.get("cad")
        excel = row.get("excel")
        proposals = row.get("proposals") or []

        source_paths = []
        if cad and cad.get("relative_path"):
            source_paths.append(cad["relative_path"])
        if excel and excel.get("relative_path"):
            source_paths.append(excel["relative_path"])
        source_paths.extend(p.get("relative_path") for p in proposals if p.get("relative_path"))
        for path in source_paths:
            if path in files_by_path:
                file_ids_by_parcel[key].add(files_by_path[path]["file_id"])

        parcel_warnings: list[dict[str, Any]] = []
        if row["status"] == "cad_yok":
            parcel_warnings.append(
                warning("review", "missing_cad_semantics", "Bu ada-parsel icin AŞAMA 6 semantik CAD plani yok.", key)
            )
        if row["status"] == "cad_only":
            parcel_warnings.append(
                warning("review", "missing_excel_or_offer", "CAD var ama eslesen eski metraj Excel'i veya teklif PDF'i yok.", key)
            )

        cad_area = cad.get("detected_room_area_m2") if cad else None
        excel_total = excel.get("old_total_m2") if excel else None
        if cad_area is not None and excel_total:
            delta = round(cad_area - excel_total, 2)
            ratio = abs(delta / excel_total)
            if ratio > 1.5:
                level = "risk"
            elif ratio > 0.15:
                level = "review"
            else:
                level = "info"
            parcel_warnings.append(
                warning(
                    level,
                    "cad_excel_area_delta",
                    f"CAD oda toplamı ile Excel eski toplamı arasında {delta:.2f} m2 fark var.",
                    key,
                )
            )

        for proposal in proposals:
            if proposal.get("special_notes"):
                parcel_warnings.append(
                    warning("review", "proposal_special_note", "Teklif PDF'i ozel not iceriyor.", key, proposal.get("relative_path"))
                )
            if proposal.get("title_body_mismatch"):
                parcel_warnings.append(
                    warning("risk", "proposal_title_body_mismatch", "Teklif PDF baslik/govde ada-parsel uyumsuzlugu iceriyor.", key, proposal.get("relative_path"))
                )

        parcel = {
            "parcel_key": key,
            "ada": ada,
            "parsel": parsel,
            "status": row["status"],
            "reconciliation_quality": row["quality"],
            "source_file_ids": sorted(file_ids_by_parcel.get(key, set())),
            "cad_plans": [
                {
                    "relative_path": cad.get("relative_path"),
                    "entity_count": cad.get("entity_count"),
                    "layer_count": cad.get("layer_count"),
                    "room_area_pair_count": cad.get("room_area_pair_count"),
                    "detected_room_area_m2": cad.get("detected_room_area_m2"),
                    "net_label_count": cad.get("net_label_count"),
                    "net_label_sum_m2": cad.get("net_label_sum_m2"),
                    "dominant_rooms": cad.get("dominant_rooms") or {},
                    "top_area_types_m2": cad.get("top_area_types_m2") or {},
                    "sample_pairs": cad.get("sample_pairs") or [],
                }
            ]
            if cad
            else [],
            "excel_old_metraj": {
                "relative_path": excel.get("relative_path"),
                "old_total_m2": excel.get("old_total_m2"),
                "method": excel.get("method"),
                "component_count": excel.get("component_count"),
                "components": excel.get("components") or [],
            }
            if excel
            else None,
            "proposal_summaries": proposals,
            "warnings": parcel_warnings,
            "review_notes": row.get("notes") or [],
        }
        parcels_by_key[key] = parcel
        global_warnings.extend(parcel_warnings)

    # Keep source files that have no parcel key visible for ingestion modules.
    source_without_key = [
        item["file_id"]
        for item in compact_files
        if not (parcel_key_from_text(item.get("relative_path")) or parcel_key_from_text(item.get("absolute_path")))
    ]
    if source_without_key:
        global_warnings.append(
            warning(
                "info",
                "source_without_parcel_key",
                f"{len(source_without_key)} kaynak dosyada ada-parsel anahtari dosya adindan yakalanmadi.",
            )
        )

    parcels = sorted(parcels_by_key.values(), key=lambda item: (item["ada"] or 0, item["parsel"] or 0))
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_root": r"D:\İlkbahar İnşaat\KENTSEL DÖNÜŞÜM PROJELENDİRME",
        "summary": {
            "source_files": len(compact_files),
            "parcels": len(parcels),
            "warnings": len(global_warnings),
            "cad_plan_parcels": sum(1 for parcel in parcels if parcel["cad_plans"]),
            "excel_metraj_parcels": sum(1 for parcel in parcels if parcel["excel_old_metraj"]),
            "proposal_parcels": sum(1 for parcel in parcels if parcel["proposal_summaries"]),
        },
        "source_files": compact_files,
        "parcels": parcels,
        "warnings": global_warnings,
        "module_readiness": {
            "source_file_indexer": "ready",
            "cad_conversion_service": "ready_prototype",
            "cad_semantic_extractor": "ready_prototype",
            "cad_unit_matcher": "ready_prototype",
            "excel_metraj_extractor": "ready_prototype",
            "proposal_pdf_extractor": "ready_prototype_v2",
            "contract_rule_engine": "ready_prototype",
            "document_qa": "ready_prototype",
            "permission_workflow": "ready_prototype",
            "company_dataset": "ready_prototype",
            "automation_core_modules": "ready_prototype",
            "input_project": "ready_prototype",
            "engine_run_tracker": "ready_prototype",
            "building_envelope": "ready_prototype",
            "core_placement": "ready_prototype",
            "unit_layout": "ready_prototype",
            "unit_mix_scoring": "ready_prototype",
            "sharing_payment": "ready_prototype",
            "participation_payment": "ready_prototype",
            "offer_data_package": "ready_prototype",
            "reconciliation_engine": "ready_prototype",
            "human_review_queue": "ready_prototype",
        },
    }


def fmt_m2(value: Any) -> str:
    if value is None:
        return "-"
    return f"{float(value):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def write_markdown(seed: dict[str, Any]) -> None:
    lines = [
        "# Otomasyon Veri Modeli ve Baslangic Cekirdegi",
        "",
        f"Uretim zamani: {seed['generated_at']}",
        "",
        "Bu dokuman, klasor analizinden uygulama mimarisine gecis icin hazirlandi. Artik dosyalar yalniz tek tek raporlanmiyor; ada-parsel merkezli bir veri modelinde birlestiriliyor.",
        "",
        "## Cekirdek Varliklar",
        "",
        "- SourceFile: Her PDF, DWG, DXF, TIF ve Excel dosyasinin yol, hash, asama, tur ve boyut bilgisi.",
        "- Parcel: Ada/parsel anahtari; bu anahtara bagli CAD planlari, eski metrajlar, teklif ozetleri ve uyarilar.",
        "- CadPlan: CAD semantik cikti; oda/m2 eslesmeleri, NET etiketleri, dominant oda tipleri ve katman sinyalleri.",
        "- ExcelOldMetraj: Eski metraj toplam degeri ve bu degerin hangi formullerden/hangi hucrelerden geldigi.",
        "- ProposalSummary: Teklif PDF tarih, otopark, hak dagilimi ipuclari, ozel notlar ve uyumsuzluk sinyalleri.",
        "- Warning: Programin insana gostermesi gereken risk veya inceleme notu.",
        "",
        "## Modul Durumu",
        "",
    ]

    for module, status in seed["module_readiness"].items():
        lines.append(f"- {module}: {status}")

    lines.extend(
        [
            "",
            "## Ozet",
            "",
            f"- Kaynak dosya: {seed['summary']['source_files']}",
            f"- Ada-parsel kaydi: {seed['summary']['parcels']}",
            f"- CAD planli ada-parsel: {seed['summary']['cad_plan_parcels']}",
            f"- Excel eski metrajli ada-parsel: {seed['summary']['excel_metraj_parcels']}",
            f"- Teklif PDF'li ada-parsel: {seed['summary']['proposal_parcels']}",
            f"- Uyari: {seed['summary']['warnings']}",
            "",
            "## Ada-Parsel Cekirdek Tablosu",
            "",
            "| Ada-Parsel | Durum | Kalite | Dosya | CAD plan | CAD oda toplam m2 | Excel eski toplam m2 | Teklif | Uyari |",
            "|---|---|---|---:|---:|---:|---:|---:|---:|",
        ]
    )

    for parcel in seed["parcels"]:
        cad_area = parcel["cad_plans"][0]["detected_room_area_m2"] if parcel["cad_plans"] else None
        excel_total = parcel["excel_old_metraj"]["old_total_m2"] if parcel["excel_old_metraj"] else None
        lines.append(
            "| "
            + " | ".join(
                [
                    parcel["parcel_key"],
                    parcel["status"],
                    parcel["reconciliation_quality"],
                    str(len(parcel["source_file_ids"])),
                    str(len(parcel["cad_plans"])),
                    fmt_m2(cad_area),
                    fmt_m2(excel_total),
                    str(len(parcel["proposal_summaries"])),
                    str(len(parcel["warnings"])),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Program Mimarisi Icin Net Siradaki Is",
            "",
            "1. OfferRendererPrototype: offer data package kaydindan branded teklif taslagi uretme.",
            "2. ProposalArtifactStore: teklif PDF/HTML ciktisini dosya ve API kaydi olarak saklama.",
            "3. RendererReviewGate: eksik deger, dusuk skor ve review bulgularini teklif onay akisine baglama.",
            "4. DownloadableOfferUI: arayuzden teklif taslagini indirme/onaylama akisini ekleme.",
            "",
            "## Cikti Dosyalari",
            "",
            "- `project_schema.json`: Uygulamanin kullanacagi JSON semasi.",
            "- `automation_seed.json`: Mevcut klasorden uretilen ilk normalleştirilmis veri cekirdegi.",
            "- `AUTOMATION_BLUEPRINT.md`: Bu mimari ozet.",
        ]
    )

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    schema = build_schema()
    seed = build_seed()
    write_json(OUT_SCHEMA, schema)
    write_json(OUT_SEED, seed)
    write_markdown(seed)
    print(f"Wrote {OUT_SCHEMA}")
    print(f"Wrote {OUT_SEED}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps(seed["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
