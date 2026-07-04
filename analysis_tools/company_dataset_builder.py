from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = WORKSPACE_ROOT / "kentsel_automation"
DB_PATH = APP_ROOT / "data" / "kentsel.db"
OUT = WORKSPACE_ROOT / "project_analysis" / "company_dataset"

OUT_JSON = OUT / "company_dataset_seed.json"
OUT_PROJECTS_CSV = OUT / "project_examples.csv"
OUT_LAYOUT_CSV = OUT / "layout_patterns.csv"
OUT_SHARING_CSV = OUT / "sharing_patterns.csv"
OUT_MD = OUT / "COMPANY_DATASET_REPORT.md"

COMPANY_KEY = "ilkbahar_insaat"
COMPANY_NAME = "Ilkbahar Insaat"

TURKISH_FOLD = str.maketrans(
    {
        "\u0131": "i",
        "\u0130": "i",
        "\u015f": "s",
        "\u015e": "s",
        "\u011f": "g",
        "\u011e": "g",
        "\u00fc": "u",
        "\u00dc": "u",
        "\u00f6": "o",
        "\u00d6": "o",
        "\u00e7": "c",
        "\u00c7": "c",
    }
)


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def json_field(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def normalize_key(value: Any) -> str:
    text = str(value or "").translate(TURKISH_FOLD).casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return re.sub(r"_+", "_", text).strip("_")


def compact_text(value: Any, limit: int = 320) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def bool_int(value: Any) -> int:
    return 1 if value else 0


def round_num(value: Any, digits: int = 2) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return None


def stable_key(prefix: str, *parts: Any) -> str:
    raw = "|".join(str(part or "") for part in parts)
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}"


def company_profile() -> dict[str, Any]:
    return {
        "company_key": COMPANY_KEY,
        "company_name": COMPANY_NAME,
        "brand_config": {
            "offer_brand_name": "Ilkbahar Insaat",
            "locale": "tr-TR",
            "primary_output": "branded_offer_pdf",
            "template_family": "kentsel_donusum_teklif",
            "document_tone": "teknik, net, teklif odakli",
        },
        "offer_template": {
            "sections": [
                "proje_kimligi",
                "mevcut_durum",
                "imar_ve_yapilasma",
                "yeni_daire_dagilimi",
                "otopark_ve_ortak_alanlar",
                "mal_sahibi_muteahhit_paylasimi",
                "katilim_payi_ve_telafi",
                "ozel_notlar",
            ],
            "render_targets": ["pdf", "share_table", "review_summary"],
        },
        "business_rules": {
            "human_review_required_for": ["risk", "missing_distribution", "area_delta", "title_body_mismatch"],
            "dataset_role": "past_project_memory",
            "automation_goal": "zoning_and_existing_area_to_branded_offer",
        },
        "raw": {
            "source": "Cayvox Sunum Ilkbahar mimarisi ve Ilkbahar eski proje klasoru",
            "core_flow": [
                "imar_durumu",
                "mevcut_metraj",
                "yapilasma_zarfi",
                "cekirdek_yerlesimi",
                "daire_kurgusu",
                "paylasim",
                "katilim_payi",
                "markali_teklif_pdf",
            ],
        },
    }


def engine_modules() -> list[dict[str, Any]]:
    modules = [
        ("input_model", "Girdi Modeli", "imar durumu ve mevcut metraj girdisi", "planned"),
        ("regulation_engine", "Mevzuat Motoru", "ABBIY, otopark, siginak, yangin kurallari", "planned"),
        ("building_envelope", "Yapilasma Zarfi", "emsal, cekme mesafesi, kat alani ve kitle secenekleri", "planned"),
        ("core_placement", "Cekirdek Yerlesimi", "merdiven, asansor, saft ve dolasim cekirdegi", "planned"),
        ("unit_layout", "Daire Kurgusu", "kat bazli daire tip/adet/alan secenekleri", "dataset_ready"),
        ("sharing_payment", "Paylasim ve Bedel", "mal sahibi/muteahhit dagilimi ve katilim payi", "dataset_ready"),
        ("offer_renderer", "Teklif Uretimi", "markali teklif PDF ve paylasim cetveli", "planned"),
        ("validation_review", "Dogrulama ve Review", "eski kayit karsilastirma, kanit ve insan onayi", "ready_prototype"),
    ]
    return [
        {
            "module_key": key,
            "sequence_no": index,
            "display_name": name,
            "purpose": purpose,
            "status": status,
            "input_contract": input_contract_for(key),
            "output_contract": output_contract_for(key),
        }
        for index, (key, name, purpose, status) in enumerate(modules, start=1)
    ]


def input_contract_for(module_key: str) -> list[str]:
    return {
        "input_model": ["parcel_identity", "zoning_input", "existing_area_input"],
        "regulation_engine": ["zoning_input", "regulation_version"],
        "building_envelope": ["zoning_input", "regulation_result"],
        "core_placement": ["building_envelope", "core_pattern_library"],
        "unit_layout": ["floor_area_program", "layout_patterns"],
        "sharing_payment": ["existing_area_input", "unit_layout_options", "sharing_patterns"],
        "offer_renderer": ["sharing_plan", "company_profile", "offer_template"],
        "validation_review": ["generated_offer", "company_dataset", "review_rules"],
    }.get(module_key, [])


def output_contract_for(module_key: str) -> list[str]:
    return {
        "input_model": ["input_project"],
        "regulation_engine": ["regulation_result"],
        "building_envelope": ["building_envelope", "floor_area_program"],
        "core_placement": ["core_options", "core_score"],
        "unit_layout": ["unit_layout_options", "unit_mix"],
        "sharing_payment": ["sharing_plan", "participation_payment"],
        "offer_renderer": ["offer_draft", "branded_offer_pdf"],
        "validation_review": ["validation_report", "review_tasks"],
    }.get(module_key, [])


def lesson_tags(row: sqlite3.Row) -> list[str]:
    tags = []
    if row["status"]:
        tags.append(f"status:{row['status']}")
    if row["reconciliation_quality"]:
        tags.append(f"quality:{row['reconciliation_quality']}")
    if row["cad_area_m2"] is not None and row["old_area_m2"] is not None:
        tags.append("cad_excel_compare")
    if row["risk_task_count"]:
        tags.append("risk_review_case")
    if row["cad_unit_candidate_count"]:
        tags.append("layout_training_case")
    if row["proposal_v2_count"]:
        tags.append("offer_language_case")
    if row["owner_units_total"] or row["contractor_units_total"]:
        tags.append("sharing_training_case")
    return sorted(set(tags))


def build_project_examples(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT p.parcel_key, p.ada, p.parsel, p.status, p.reconciliation_quality, p.review_notes_json,
               (SELECT COUNT(*) FROM parcel_source_files psf WHERE psf.parcel_key = p.parcel_key) AS source_file_count,
               (SELECT COUNT(*) FROM cad_plans cp WHERE cp.parcel_key = p.parcel_key) AS cad_plan_count,
               (SELECT MAX(cp.detected_room_area_m2) FROM cad_plans cp WHERE cp.parcel_key = p.parcel_key) AS cad_area_m2,
               (SELECT COUNT(*) FROM excel_old_metraj e WHERE e.parcel_key = p.parcel_key) AS excel_count,
               (SELECT MAX(e.old_total_m2) FROM excel_old_metraj e WHERE e.parcel_key = p.parcel_key) AS old_area_m2,
               (SELECT COUNT(*) FROM proposal_summaries ps WHERE ps.parcel_key = p.parcel_key) AS proposal_count,
               (SELECT COUNT(*) FROM proposal_v2_records pv2 WHERE pv2.parcel_key = p.parcel_key) AS proposal_v2_count,
               (SELECT MAX(pv2.owner_units_total) FROM proposal_v2_records pv2 WHERE pv2.parcel_key = p.parcel_key) AS owner_units_total,
               (SELECT MAX(pv2.contractor_units_total) FROM proposal_v2_records pv2 WHERE pv2.parcel_key = p.parcel_key) AS contractor_units_total,
               (SELECT MAX(pv2.total_unit_mentions) FROM proposal_v2_records pv2 WHERE pv2.parcel_key = p.parcel_key) AS total_unit_mentions,
               (SELECT COUNT(*) FROM cad_unit_candidates cuc WHERE cuc.parcel_key = p.parcel_key) AS cad_unit_candidate_count,
               (SELECT MAX(cup.primary_candidate_count) FROM cad_unit_plans cup WHERE cup.parcel_key = p.parcel_key) AS cad_unit_primary_count,
               (SELECT MAX(cup.offer_total_units) FROM cad_unit_plans cup WHERE cup.parcel_key = p.parcel_key) AS offer_total_units,
               (SELECT MAX(cre.risk_score) FROM contract_rule_evaluations cre WHERE cre.parcel_key = p.parcel_key) AS contract_risk_score,
               (SELECT COUNT(*) FROM review_tasks rt WHERE rt.parcel_key = p.parcel_key) AS review_task_count,
               (SELECT COUNT(*) FROM review_tasks rt WHERE rt.parcel_key = p.parcel_key AND rt.level = 'risk') AS risk_task_count,
               (SELECT COUNT(*) FROM document_qa_evidence dqa WHERE dqa.parcel_key = p.parcel_key) AS evidence_count
        FROM parcels p
        ORDER BY p.ada, p.parsel
        """
    ).fetchall()
    examples = []
    for row in rows:
        cad_area = round_num(row["cad_area_m2"])
        old_area = round_num(row["old_area_m2"])
        area_delta = round_num(cad_area - old_area) if cad_area is not None and old_area is not None else None
        examples.append(
            {
                "example_key": stable_key("EXAMPLE", row["parcel_key"]),
                "company_key": COMPANY_KEY,
                "parcel_key": row["parcel_key"],
                "ada": row["ada"],
                "parsel": row["parsel"],
                "status": row["status"],
                "reconciliation_quality": row["reconciliation_quality"],
                "source_file_count": row["source_file_count"],
                "cad_plan_count": row["cad_plan_count"],
                "excel_count": row["excel_count"],
                "proposal_count": row["proposal_count"],
                "proposal_v2_count": row["proposal_v2_count"],
                "cad_area_m2": cad_area,
                "old_area_m2": old_area,
                "area_delta_m2": area_delta,
                "cad_unit_candidate_count": row["cad_unit_candidate_count"],
                "cad_unit_primary_count": row["cad_unit_primary_count"],
                "offer_total_units": row["offer_total_units"],
                "owner_units_total": row["owner_units_total"],
                "contractor_units_total": row["contractor_units_total"],
                "total_unit_mentions": row["total_unit_mentions"],
                "contract_risk_score": row["contract_risk_score"],
                "review_task_count": row["review_task_count"],
                "risk_task_count": row["risk_task_count"],
                "evidence_count": row["evidence_count"],
                "lesson_tags": lesson_tags(row),
                "review_notes": json_field(row["review_notes_json"], []),
                "raw": {
                    "dataset_role": "past_project_example",
                    "trust_level": "needs_human_review" if row["risk_task_count"] else "usable_training_reference",
                },
            }
        )
    return examples


def build_layout_patterns(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT COALESCE(unit_type, 'unknown') AS unit_type,
               COALESCE(room_mix, 'unknown') AS room_mix,
               COUNT(*) AS sample_count,
               COUNT(DISTINCT parcel_key) AS parcel_count,
               ROUND(AVG(area_m2), 2) AS avg_area_m2,
               ROUND(MIN(area_m2), 2) AS min_area_m2,
               ROUND(MAX(area_m2), 2) AS max_area_m2,
               ROUND(AVG(confidence_score), 3) AS avg_confidence,
               SUM(CASE WHEN method = 'net_area_label' THEN 1 ELSE 0 END) AS net_label_samples,
               SUM(CASE WHEN method = 'sequence_cluster' THEN 1 ELSE 0 END) AS sequence_samples
        FROM cad_unit_candidates
        GROUP BY COALESCE(unit_type, 'unknown'), COALESCE(room_mix, 'unknown')
        ORDER BY sample_count DESC, unit_type, room_mix
        """
    ).fetchall()
    patterns = []
    for row in rows:
        key = f"LAYOUT-{normalize_key(row['unit_type'])}-{normalize_key(row['room_mix'])}"
        patterns.append(
            {
                "pattern_key": key[:80],
                "company_key": COMPANY_KEY,
                "unit_type": row["unit_type"],
                "room_mix": row["room_mix"],
                "pattern_role": layout_pattern_role(row["unit_type"], row["room_mix"]),
                "sample_count": row["sample_count"],
                "parcel_count": row["parcel_count"],
                "avg_area_m2": row["avg_area_m2"],
                "min_area_m2": row["min_area_m2"],
                "max_area_m2": row["max_area_m2"],
                "avg_confidence": row["avg_confidence"],
                "net_label_samples": row["net_label_samples"],
                "sequence_samples": row["sequence_samples"],
                "pattern_status": "strong" if row["sample_count"] >= 10 else "candidate",
                "raw": {
                    "source": "cad_unit_candidates",
                    "automation_use": "unit_layout_engine_training_pattern",
                },
            }
        )
    return patterns


def layout_pattern_role(unit_type: str | None, room_mix: str | None) -> str:
    unit_key = normalize_key(unit_type)
    room_key = normalize_key(room_mix)
    if "dukkan" in unit_key or "commercial" in room_key:
        return "commercial"
    if unit_key.startswith("daire"):
        return "residential"
    if unit_key in {"net_area_unit", "small_unit"} or room_key in {"net_label_only", "living_only"}:
        return "area_signal"
    return "needs_review"


def sharing_status(row: sqlite3.Row) -> str:
    owner = row["owner_units_total"] or 0
    contractor = row["contractor_units_total"] or 0
    if owner and contractor:
        return "explicit_owner_contractor_distribution"
    if row["total_unit_mentions"]:
        return "unit_distribution_without_roles"
    return "missing_distribution"


def build_sharing_patterns(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT pv2.parcel_key, pv2.relative_path, pv2.proposal_date,
               pv2.owner_units_total, pv2.contractor_units_total, pv2.total_unit_mentions,
               pv2.distribution_item_count, pv2.alternative_item_count,
               pv2.financial_term_count, pv2.condition_term_count,
               pv2.confidence_score,
               cre.risk_score, cre.risk_level, cre.decision_recommendation
        FROM proposal_v2_records pv2
        LEFT JOIN contract_rule_evaluations cre ON cre.relative_path = pv2.relative_path
        ORDER BY pv2.parcel_key, pv2.relative_path
        """
    ).fetchall()
    patterns = []
    for row in rows:
        owner = row["owner_units_total"] or 0
        contractor = row["contractor_units_total"] or 0
        total = owner + contractor if owner or contractor else row["total_unit_mentions"]
        contractor_share = round(contractor / total * 100, 2) if total else None
        status = sharing_status(row)
        patterns.append(
            {
                "pattern_key": stable_key("SHARING", row["parcel_key"], row["relative_path"]),
                "company_key": COMPANY_KEY,
                "parcel_key": row["parcel_key"],
                "relative_path": row["relative_path"],
                "proposal_date": row["proposal_date"],
                "owner_units_total": owner,
                "contractor_units_total": contractor,
                "total_units": total,
                "contractor_share_percent": contractor_share,
                "distribution_item_count": row["distribution_item_count"],
                "alternative_item_count": row["alternative_item_count"],
                "financial_term_count": row["financial_term_count"],
                "condition_term_count": row["condition_term_count"],
                "confidence_score": row["confidence_score"],
                "risk_score": row["risk_score"],
                "risk_level": row["risk_level"],
                "decision_recommendation": row["decision_recommendation"],
                "pattern_status": status,
                "raw": {
                    "source": "proposal_v2_records",
                    "automation_use": "sharing_payment_engine_training_pattern",
                },
            }
        )
    return patterns


def input_schema() -> dict[str, Any]:
    return {
        "input_project": {
            "required": ["company_key", "parcel_identity", "zoning_input", "existing_area_input"],
            "optional": ["source_files", "manual_notes", "target_offer_template"],
        },
        "zoning_input": {
            "fields": [
                "ada",
                "parsel",
                "parcel_area_m2",
                "road_frontage",
                "zoning_function",
                "taks",
                "kaks_or_emsal",
                "max_floor_count",
                "height_limit",
                "front_setback_m",
                "side_setback_m",
                "rear_setback_m",
                "parking_rule_version",
                "shelter_rule_version",
                "fire_rule_version",
            ],
        },
        "existing_area_input": {
            "fields": [
                "owner_id",
                "independent_unit_no",
                "existing_gross_m2",
                "existing_net_m2",
                "land_share",
                "usage_type",
                "floor",
                "notes",
            ],
        },
    }


def build_seed() -> dict[str, Any]:
    with connect() as conn:
        projects = build_project_examples(conn)
        layouts = build_layout_patterns(conn)
        sharing = build_sharing_patterns(conn)
    profile = company_profile()
    modules = engine_modules()
    summary = {
        "company_profiles": 1,
        "project_examples": len(projects),
        "layout_patterns": len(layouts),
        "sharing_patterns": len(sharing),
        "engine_modules": len(modules),
        "strong_layout_patterns": sum(1 for item in layouts if item["pattern_status"] == "strong"),
        "explicit_sharing_patterns": sum(1 for item in sharing if item["pattern_status"] == "explicit_owner_contractor_distribution"),
        "risk_examples": sum(1 for item in projects if item["risk_task_count"]),
    }
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "company_profile": profile,
        "input_schema": input_schema(),
        "engine_modules": modules,
        "project_examples": projects,
        "layout_patterns": layouts,
        "sharing_patterns": sharing,
        "summary": summary,
    }


def write_csvs(seed: dict[str, Any]) -> None:
    write_table(
        OUT_PROJECTS_CSV,
        seed["project_examples"],
        [
            "example_key",
            "parcel_key",
            "status",
            "reconciliation_quality",
            "source_file_count",
            "cad_plan_count",
            "excel_count",
            "proposal_count",
            "proposal_v2_count",
            "cad_area_m2",
            "old_area_m2",
            "area_delta_m2",
            "cad_unit_candidate_count",
            "owner_units_total",
            "contractor_units_total",
            "contract_risk_score",
            "review_task_count",
            "risk_task_count",
            "evidence_count",
            "lesson_tags",
        ],
    )
    write_table(
        OUT_LAYOUT_CSV,
        seed["layout_patterns"],
        [
            "pattern_key",
            "unit_type",
            "room_mix",
            "pattern_role",
            "sample_count",
            "parcel_count",
            "avg_area_m2",
            "min_area_m2",
            "max_area_m2",
            "avg_confidence",
            "net_label_samples",
            "sequence_samples",
            "pattern_status",
        ],
    )
    write_table(
        OUT_SHARING_CSV,
        seed["sharing_patterns"],
        [
            "pattern_key",
            "parcel_key",
            "owner_units_total",
            "contractor_units_total",
            "total_units",
            "contractor_share_percent",
            "distribution_item_count",
            "financial_term_count",
            "condition_term_count",
            "risk_score",
            "risk_level",
            "pattern_status",
        ],
    )


def write_table(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            record = {}
            for key in fieldnames:
                value = row.get(key)
                if isinstance(value, (list, dict)):
                    value = json.dumps(value, ensure_ascii=False)
                record[key] = value
            writer.writerow(record)


def md_escape(value: Any) -> str:
    return str(value or "").replace("|", "\\|")


def write_report(seed: dict[str, Any]) -> None:
    summary = seed["summary"]
    layout_counter = Counter(item["pattern_status"] for item in seed["layout_patterns"])
    sharing_counter = Counter(item["pattern_status"] for item in seed["sharing_patterns"])
    lines = [
        "# Ilkbahar Firma Dataset ve Otomasyon Cekirdegi",
        "",
        f"Uretim zamani: {seed['generated_at']}",
        "",
        "Bu asama, eski Ilkbahar proje kayitlarini otomasyon motorlari icin firma hafizasi/dataset olarak normallestirir.",
        "",
        "## Ozet",
        "",
        f"- Firma profili: {summary['company_profiles']}",
        f"- Proje ornegi: {summary['project_examples']}",
        f"- Yerlesim oruntusu: {summary['layout_patterns']}",
        f"- Paylasim oruntusu: {summary['sharing_patterns']}",
        f"- Otomasyon motor modulu: {summary['engine_modules']}",
        f"- Guclu yerlesim oruntusu: {summary['strong_layout_patterns']}",
        f"- Acik paylasim oruntusu: {summary['explicit_sharing_patterns']}",
        f"- Risk iceren ornek: {summary['risk_examples']}",
        "",
        "## Motor Sirasi",
        "",
        "| Sira | Modul | Durum | Cikti |",
        "|---:|---|---|---|",
    ]
    for module in seed["engine_modules"]:
        lines.append(
            f"| {module['sequence_no']} | {md_escape(module['display_name'])} | {md_escape(module['status'])} | {md_escape(', '.join(module['output_contract']))} |"
        )

    lines.extend(["", "## Yerlesim Oruntusu Durumu", "", "| Durum | Adet |", "|---|---:|"])
    for status, count in sorted(layout_counter.items()):
        lines.append(f"| {md_escape(status)} | {count} |")

    lines.extend(["", "## Paylasim Oruntusu Durumu", "", "| Durum | Adet |", "|---|---:|"])
    for status, count in sorted(sharing_counter.items()):
        lines.append(f"| {md_escape(status)} | {count} |")

    lines.extend(["", "## En Sik Daire Oruntuleri", "", "| Tip | Oda | Rol | Ornek | Ortalama m2 | Durum |", "|---|---|---|---:|---:|---|"])
    for pattern in seed["layout_patterns"][:12]:
        lines.append(
            f"| {md_escape(pattern['unit_type'])} | {md_escape(pattern['room_mix'])} | {md_escape(pattern['pattern_role'])} | {pattern['sample_count']} | {pattern['avg_area_m2']} | {md_escape(pattern['pattern_status'])} |"
        )

    lines.extend(
        [
            "",
            "## Sonraki Kod Hedefi",
            "",
            "1. `input_projects` ve `zoning_inputs` ile yeni proje baslatma formu.",
            "2. `engine_runs` ve `engine_run_steps` ile pipeline durum takibi.",
            "3. Ilk motor: imar girdisinden yapi alan programi ureten `building_envelope` prototipi.",
            "",
            "## Cikti Dosyalari",
            "",
            "- `company_dataset_seed.json`",
            "- `project_examples.csv`",
            "- `layout_patterns.csv`",
            "- `sharing_patterns.csv`",
            "- `COMPANY_DATASET_REPORT.md`",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    seed = build_seed()
    write_json(OUT_JSON, seed)
    write_csvs(seed)
    write_report(seed)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_PROJECTS_CSV}")
    print(f"Wrote {OUT_LAYOUT_CSV}")
    print(f"Wrote {OUT_SHARING_CSV}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps(seed["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
