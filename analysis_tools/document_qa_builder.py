from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
ANALYSIS_ROOT = WORKSPACE_ROOT / "project_analysis"
OUT = ANALYSIS_ROOT / "document_qa"

SEED_JSON = ANALYSIS_ROOT / "automation_blueprint" / "automation_seed.json"
PROPOSAL_V2_JSON = ANALYSIS_ROOT / "proposal_v2" / "proposal_v2_analysis.json"
CONTRACT_RULES_JSON = ANALYSIS_ROOT / "contract_rules" / "contract_rule_analysis.json"
CAD_UNITS_JSON = ANALYSIS_ROOT / "cad_units" / "cad_unit_analysis.json"

OUT_JSON = OUT / "document_qa_index.json"
OUT_CSV = OUT / "document_qa_evidence.csv"
OUT_MD = OUT / "DOCUMENT_QA_REPORT.md"

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

TERM_GROUPS = ["distribution_terms", "alternative_terms", "financial_terms", "condition_terms", "parser_warnings"]


def load_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def compact_text(value: Any, limit: int = 360) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def fmt_number(value: Any, digits: int = 2) -> str:
    if value is None:
        return "-"
    try:
        number = float(value)
    except (TypeError, ValueError):
        return str(value)
    if number.is_integer():
        return str(int(number))
    return f"{number:.{digits}f}"


def normalize_search(value: Any) -> str:
    text = str(value or "").translate(TURKISH_FOLD).casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9_\-./%+]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def importance_for_level(level: str | None) -> int:
    return {"risk": 92, "blocking": 98, "high": 90, "review": 76, "medium": 72, "info": 48, "low": 42}.get(
        str(level or "").lower(),
        55,
    )


def source_kind_importance(kind: str | None) -> int:
    return {
        "proposal_pdf": 62,
        "cad_plan_dwg": 58,
        "excel_old_metraj": 58,
        "old_plan_raster": 45,
        "regulation_or_reference_pdf": 42,
    }.get(str(kind or ""), 38)


def term_importance(group_name: str, term: dict[str, Any]) -> int:
    if group_name == "parser_warnings":
        return importance_for_level(term.get("level"))
    if group_name == "financial_terms":
        return 74
    if group_name == "condition_terms":
        return 68
    if group_name == "alternative_terms":
        return 64
    if term.get("role") in {"owner", "contractor", "total"}:
        return 62
    return 54


class EvidenceBuilder:
    def __init__(self) -> None:
        self.records: list[dict[str, Any]] = []
        self.counter = 0

    def add(
        self,
        *,
        parcel_key: str | None,
        source_type: str,
        source_path: str | None,
        title: str,
        summary: str,
        excerpt: str | None = None,
        importance: int = 50,
        tags: list[str] | None = None,
        raw: dict[str, Any] | None = None,
    ) -> None:
        self.counter += 1
        tags = sorted({normalize_search(tag) for tag in tags or [] if normalize_search(tag)})
        raw = raw or {}
        search_parts = [
            parcel_key,
            source_type,
            source_path,
            title,
            summary,
            excerpt,
            " ".join(tags),
            json.dumps(raw, ensure_ascii=False, sort_keys=True, default=str)[:2000],
        ]
        digest = hashlib.sha1("|".join(str(part or "") for part in search_parts).encode("utf-8")).hexdigest()[:8]
        evidence_id = f"EVD-{self.counter:06d}-{digest}"
        self.records.append(
            {
                "evidence_id": evidence_id,
                "parcel_key": parcel_key,
                "source_type": source_type,
                "source_path": source_path,
                "title": compact_text(title, 180),
                "summary": compact_text(summary, 520),
                "excerpt": compact_text(excerpt, 720),
                "importance": int(max(1, min(100, importance))),
                "tags": tags,
                "search_text": normalize_search(" ".join(str(part or "") for part in search_parts)),
                "raw": raw,
            }
        )


def source_files_by_id(seed: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {item.get("file_id"): item for item in seed.get("source_files", []) if item.get("file_id")}


def known_parcel_key(parcel_key: str | None, valid_parcel_keys: set[str]) -> str | None:
    return parcel_key if parcel_key in valid_parcel_keys else None


def build_seed_evidence(builder: EvidenceBuilder, seed: dict[str, Any]) -> None:
    files_by_id = source_files_by_id(seed)
    linked_file_ids: set[str] = set()

    for parcel in seed.get("parcels", []) or []:
        parcel_key = parcel.get("parcel_key")
        source_ids = parcel.get("source_file_ids") or []
        linked_file_ids.update(source_ids)
        cad_plans = parcel.get("cad_plans") or []
        proposals = parcel.get("proposal_summaries") or []
        warnings = parcel.get("warnings") or []
        excel = parcel.get("excel_old_metraj")
        title = f"{parcel_key} parsel ozeti"
        summary = (
            f"Durum {parcel.get('status')}; kalite {parcel.get('reconciliation_quality')}; "
            f"{len(source_ids)} kaynak dosya, {len(cad_plans)} CAD plan, "
            f"{1 if excel else 0} eski metraj, {len(proposals)} teklif PDF, {len(warnings)} uyari."
        )
        builder.add(
            parcel_key=parcel_key,
            source_type="parcel_summary",
            source_path=None,
            title=title,
            summary=summary,
            excerpt=" | ".join(parcel.get("review_notes") or []),
            importance=64 + min(len(warnings) * 3, 18),
            tags=["parcel", parcel.get("status"), parcel.get("reconciliation_quality")],
            raw={
                "ada": parcel.get("ada"),
                "parsel": parcel.get("parsel"),
                "status": parcel.get("status"),
                "quality": parcel.get("reconciliation_quality"),
                "review_notes": parcel.get("review_notes") or [],
            },
        )

        for file_id in source_ids:
            source = files_by_id.get(file_id)
            if not source:
                continue
            builder.add(
                parcel_key=parcel_key,
                source_type="source_file",
                source_path=source.get("relative_path"),
                title=f"{parcel_key} kaynak dosya",
                summary=(
                    f"{source.get('kind')} kaynagi; asama {source.get('stage') or '-'}; "
                    f"uzanti {source.get('extension') or '-'}; boyut {fmt_number(source.get('size_mb'))} MB."
                ),
                excerpt=source.get("absolute_path"),
                importance=source_kind_importance(source.get("kind")),
                tags=["source", source.get("kind"), source.get("extension"), source.get("stage")],
                raw=source,
            )

        for cad in cad_plans:
            dominant = ", ".join(f"{key}:{value}" for key, value in (cad.get("dominant_rooms") or {}).items())
            top_areas = ", ".join(f"{key}:{fmt_number(value)} m2" for key, value in (cad.get("top_area_types_m2") or {}).items())
            builder.add(
                parcel_key=parcel_key,
                source_type="cad_summary",
                source_path=cad.get("relative_path"),
                title=f"{parcel_key} CAD semantik ozeti",
                summary=(
                    f"{cad.get('room_area_pair_count') or 0} oda-m2 eslesmesi; "
                    f"oda toplam {fmt_number(cad.get('detected_room_area_m2'))} m2; "
                    f"NET etiket {cad.get('net_label_count') or 0}; NET toplam {fmt_number(cad.get('net_label_sum_m2'))} m2."
                ),
                excerpt=f"Dominant odalar: {dominant}. En buyuk alanlar: {top_areas}.",
                importance=72 if cad.get("room_area_pair_count") else 45,
                tags=["cad", "semantic", "area", "room"],
                raw=cad,
            )

        if excel:
            component_excerpt = ", ".join(
                f"{item.get('cell')}={fmt_number(item.get('value_m2'))} m2"
                for item in (excel.get("components") or [])[:18]
            )
            builder.add(
                parcel_key=parcel_key,
                source_type="excel_metraj",
                source_path=excel.get("relative_path"),
                title=f"{parcel_key} eski metraj",
                summary=(
                    f"Eski toplam metraj {fmt_number(excel.get('old_total_m2'))} m2; "
                    f"yontem {excel.get('method') or '-'}; {excel.get('component_count') or 0} bilesen."
                ),
                excerpt=component_excerpt,
                importance=68,
                tags=["excel", "metraj", "old_area", excel.get("method")],
                raw=excel,
            )

        for proposal in proposals:
            builder.add(
                parcel_key=parcel_key,
                source_type="proposal_legacy",
                source_path=proposal.get("relative_path"),
                title=f"{parcel_key} eski teklif ozeti",
                summary=(
                    f"Tarih {proposal.get('proposal_date') or '-'}; otopark {proposal.get('otopark') or '-'}; "
                    f"mal sahibi sinyali {proposal.get('owner_unit_mentions') or 0}; "
                    f"muteahhit sinyali {proposal.get('contractor_unit_mentions') or 0}; "
                    f"dukkan {proposal.get('dukkkan_mentions') or 0}; dubleks {proposal.get('dubleks_mentions') or 0}."
                ),
                excerpt=" | ".join(proposal.get("special_notes") or []),
                importance=66 if proposal.get("special_notes") else 58,
                tags=["proposal", "legacy", "pdf", "otopark"],
                raw=proposal,
            )

        for warning in warnings:
            builder.add(
                parcel_key=parcel_key,
                source_type="warning",
                source_path=warning.get("source"),
                title=f"{parcel_key} {warning.get('code')}",
                summary=warning.get("message") or "",
                excerpt=warning.get("level"),
                importance=importance_for_level(warning.get("level")),
                tags=["warning", warning.get("level"), warning.get("code")],
                raw=warning,
            )

    for warning in seed.get("warnings", []) or []:
        if warning.get("parcel_key"):
            continue
        builder.add(
            parcel_key=None,
            source_type="warning",
            source_path=warning.get("source"),
            title=warning.get("code") or "genel uyari",
            summary=warning.get("message") or "",
            excerpt=warning.get("level"),
            importance=importance_for_level(warning.get("level")),
            tags=["warning", "global", warning.get("level"), warning.get("code")],
            raw=warning,
        )

    for source in seed.get("source_files", []) or []:
        if source.get("file_id") in linked_file_ids:
            continue
        builder.add(
            parcel_key=None,
            source_type="source_file",
            source_path=source.get("relative_path"),
            title="Genel kaynak dosya",
            summary=(
                f"{source.get('kind')} kaynagi; asama {source.get('stage') or '-'}; "
                f"uzanti {source.get('extension') or '-'}; boyut {fmt_number(source.get('size_mb'))} MB."
            ),
            excerpt=source.get("absolute_path"),
            importance=source_kind_importance(source.get("kind")),
            tags=["source", "global", source.get("kind"), source.get("extension"), source.get("stage")],
            raw=source,
        )


def build_proposal_v2_evidence(builder: EvidenceBuilder, data: dict[str, Any], valid_parcel_keys: set[str]) -> None:
    for record in data.get("records", []) or []:
        raw_parcel_key = record.get("parcel_key") or record.get("title_parcel_key") or record.get("body_parcel_key")
        parcel_key = known_parcel_key(raw_parcel_key, valid_parcel_keys)
        otopark = record.get("otopark") or {}
        builder.add(
            parcel_key=parcel_key,
            source_type="proposal_v2",
            source_path=record.get("relative_path"),
            title=f"{raw_parcel_key or 'genel'} teklif V2",
            summary=(
                f"Tarih {record.get('proposal_date') or '-'}; mevcut birim {record.get('existing_independent_units') or '-'}; "
                f"mal sahibi toplam {record.get('owner_units_total') or 0}; "
                f"muteahhit toplam {record.get('contractor_units_total') or 0}; "
                f"toplam sinyal {record.get('total_unit_mentions') or 0}; otopark {(otopark.get('label') if isinstance(otopark, dict) else None) or '-'}; "
                f"parser uyari {len(record.get('parser_warnings') or [])}; guven {fmt_number(record.get('confidence_score'))}."
            ),
            excerpt=record.get("clean_text"),
            importance=72 if record.get("confidence_score", 0) >= 0.7 else 62,
            tags=["proposal", "v2", "pdf", "distribution", "otopark"],
            raw={
                **{
                    key: value
                    for key, value in record.items()
                    if key not in {"distribution_terms", "alternative_terms", "financial_terms", "condition_terms"}
                },
                "raw_parcel_key": raw_parcel_key,
            },
        )

        for group_name in TERM_GROUPS:
            for index, term in enumerate(record.get(group_name, []) or [], start=1):
                label = term.get("label") or term.get("term_type") or term.get("code") or f"term_{index}"
                parts = [
                    f"grup {group_name}",
                    f"etiket {label}",
                    f"rol {term.get('role') or '-'}",
                    f"kat {term.get('floor') or '-'}",
                    f"adet {term.get('unit_count') if term.get('unit_count') is not None else '-'}",
                    f"tip {term.get('unit_type') or '-'}",
                    f"tutar {fmt_number(term.get('amount'))} {term.get('currency') or ''}".strip(),
                    f"oran {term.get('percent') if term.get('percent') is not None else '-'}",
                ]
                builder.add(
                    parcel_key=parcel_key,
                    source_type="proposal_term",
                    source_path=record.get("relative_path"),
                    title=f"{raw_parcel_key or 'genel'} teklif terimi: {label}",
                    summary="; ".join(parts),
                    excerpt=term.get("excerpt") or term.get("message"),
                    importance=term_importance(group_name, term),
                    tags=["proposal", "term", group_name, term.get("term_type"), label, term.get("role")],
                    raw={"group_name": group_name, "record_path": record.get("relative_path"), "raw_parcel_key": raw_parcel_key, **term},
                )


def build_contract_evidence(builder: EvidenceBuilder, data: dict[str, Any], valid_parcel_keys: set[str]) -> None:
    for evaluation in data.get("evaluations", []) or []:
        raw_parcel_key = evaluation.get("parcel_key")
        parcel_key = known_parcel_key(raw_parcel_key, valid_parcel_keys)
        builder.add(
            parcel_key=parcel_key,
            source_type="contract_rule",
            source_path=evaluation.get("relative_path"),
            title=f"{raw_parcel_key or 'genel'} sozlesme kural skoru",
            summary=(
                f"Risk seviyesi {evaluation.get('risk_level')}; skor {evaluation.get('risk_score')}; "
                f"karar {evaluation.get('decision_recommendation')}; bulgu {evaluation.get('finding_count')}; "
                f"blokaj {evaluation.get('blocking_count')}; risk {evaluation.get('risk_count')}; "
                f"inceleme {evaluation.get('review_count')}; muteahhit payi {fmt_number(evaluation.get('contractor_share_percent'))}%."
            ),
            excerpt=f"Guven {fmt_number(evaluation.get('confidence_score'))}; tarih {evaluation.get('proposal_date') or '-'}",
            importance=importance_for_level(evaluation.get("risk_level")),
            tags=["contract", "rule", "risk", evaluation.get("risk_level"), evaluation.get("decision_recommendation")],
            raw={**{key: value for key, value in evaluation.items() if key != "findings"}, "raw_parcel_key": raw_parcel_key},
        )

        for finding in evaluation.get("findings", []) or []:
            builder.add(
                parcel_key=parcel_key,
                source_type="contract_finding",
                source_path=evaluation.get("relative_path"),
                title=f"{raw_parcel_key or 'genel'} {finding.get('title') or finding.get('code')}",
                summary=finding.get("message") or "",
                excerpt=finding.get("evidence") or finding.get("recommendation"),
                importance=importance_for_level(finding.get("severity")) + min(int(finding.get("weight") or 0), 12),
                tags=["contract", "finding", finding.get("severity"), finding.get("code"), finding.get("source")],
                raw={**finding, "raw_parcel_key": raw_parcel_key},
            )


def candidate_room_summary(candidate: dict[str, Any]) -> str:
    room_types = ", ".join(f"{key}:{value}" for key, value in (candidate.get("room_types") or {}).items())
    rooms = ", ".join(
        f"{room.get('room_type') or room.get('room_name')} {fmt_number(room.get('area_m2'))} m2"
        for room in (candidate.get("rooms") or [])[:12]
    )
    return f"Oda tipleri {room_types or '-'}; odalar {rooms or '-'}."


def build_cad_unit_evidence(builder: EvidenceBuilder, data: dict[str, Any], valid_parcel_keys: set[str]) -> None:
    for plan in data.get("plans", []) or []:
        raw_parcel_key = plan.get("parcel_key")
        parcel_key = known_parcel_key(raw_parcel_key, valid_parcel_keys)
        builder.add(
            parcel_key=parcel_key,
            source_type="cad_unit_plan",
            source_path=plan.get("relative_path"),
            title=f"{raw_parcel_key or 'genel'} CAD bagimsiz bolum plani",
            summary=(
                f"Birincil yontem {plan.get('primary_method')}; birincil aday {plan.get('primary_candidate_count') or 0}; "
                f"NET aday {plan.get('net_label_candidate_count') or 0}; oda kumesi {plan.get('sequence_candidate_count') or 0}; "
                f"teklif toplam {plan.get('offer_total_units') or '-'}; durum {plan.get('offer_match_status') or '-'}; "
                f"fark {plan.get('unit_count_delta') if plan.get('unit_count_delta') is not None else '-'}; "
                f"guven {fmt_number(plan.get('confidence_score'))}."
            ),
            excerpt=(
                f"Oda-m2 eslesmesi {plan.get('room_area_pair_count') or 0}; "
                f"CAD toplam {fmt_number(plan.get('total_detected_room_area_m2'))} m2; "
                f"teklif {plan.get('offer_relative_path') or '-'}."
            ),
            importance=76 if plan.get("offer_match_status") not in {"match", "no_offer_unit_total"} else 66,
            tags=["cad", "unit", "plan", plan.get("primary_method"), plan.get("offer_match_status")],
            raw={**{key: value for key, value in plan.items() if key != "candidates"}, "raw_parcel_key": raw_parcel_key},
        )

        for candidate in plan.get("candidates", []) or []:
            low_confidence = float(candidate.get("confidence_score") or 0) < 0.65
            builder.add(
                parcel_key=parcel_key,
                source_type="cad_unit_candidate",
                source_path=plan.get("relative_path"),
                title=f"{candidate.get('candidate_key')} CAD aday bolum",
                summary=(
                    f"Yontem {candidate.get('method')}; tip {candidate.get('unit_type') or '-'}; "
                    f"oda miksi {candidate.get('room_mix') or '-'}; alan {fmt_number(candidate.get('area_m2'))} m2; "
                    f"oda {candidate.get('room_count') or 0}; yasam {candidate.get('living_count') or 0}; "
                    f"yatak {candidate.get('bedroom_count') or 0}; islak {candidate.get('wet_count') or 0}; "
                    f"servis {candidate.get('service_count') or 0}; guven {fmt_number(candidate.get('confidence_score'))}."
                ),
                excerpt=candidate_room_summary(candidate),
                importance=58 if low_confidence else 66,
                tags=["cad", "unit", "candidate", candidate.get("method"), candidate.get("unit_type"), candidate.get("room_mix")],
                raw={**candidate, "plan_path": plan.get("relative_path"), "raw_parcel_key": raw_parcel_key},
            )

        for finding in plan.get("findings", []) or []:
            builder.add(
                parcel_key=parcel_key,
                source_type="cad_unit_finding",
                source_path=plan.get("relative_path"),
                title=f"{raw_parcel_key or 'genel'} {finding.get('code')}",
                summary=finding.get("message") or "",
                excerpt=finding.get("recommendation"),
                importance=importance_for_level(finding.get("severity")),
                tags=["cad", "unit", "finding", finding.get("severity"), finding.get("code")],
                raw={**finding, "raw_parcel_key": raw_parcel_key},
            )


def build_index() -> dict[str, Any]:
    seed = load_json(SEED_JSON, {})
    proposal_v2 = load_json(PROPOSAL_V2_JSON, {})
    contract_rules = load_json(CONTRACT_RULES_JSON, {})
    cad_units = load_json(CAD_UNITS_JSON, {})

    builder = EvidenceBuilder()
    valid_parcel_keys = {parcel.get("parcel_key") for parcel in seed.get("parcels", []) or [] if parcel.get("parcel_key")}
    build_seed_evidence(builder, seed)
    build_proposal_v2_evidence(builder, proposal_v2, valid_parcel_keys)
    build_contract_evidence(builder, contract_rules, valid_parcel_keys)
    build_cad_unit_evidence(builder, cad_units, valid_parcel_keys)

    by_type = Counter(record["source_type"] for record in builder.records)
    by_parcel = Counter(record["parcel_key"] or "GENEL" for record in builder.records)
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "inputs": {
            "seed": str(SEED_JSON),
            "proposal_v2": str(PROPOSAL_V2_JSON),
            "contract_rules": str(CONTRACT_RULES_JSON),
            "cad_units": str(CAD_UNITS_JSON),
        },
        "summary": {
            "evidence_count": len(builder.records),
            "source_types": dict(sorted(by_type.items())),
            "parcel_count": sum(1 for key in by_parcel if key != "GENEL"),
            "top_parcels": dict(by_parcel.most_common(12)),
        },
        "evidence": sorted(builder.records, key=lambda item: (item["parcel_key"] or "ZZZ", -item["importance"], item["evidence_id"])),
    }


def write_csv(records: list[dict[str, Any]]) -> None:
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "evidence_id",
                "parcel_key",
                "source_type",
                "source_path",
                "title",
                "summary",
                "excerpt",
                "importance",
                "tags",
            ],
        )
        writer.writeheader()
        for record in records:
            writer.writerow(
                {
                    "evidence_id": record["evidence_id"],
                    "parcel_key": record["parcel_key"] or "",
                    "source_type": record["source_type"],
                    "source_path": record["source_path"] or "",
                    "title": record["title"],
                    "summary": record["summary"],
                    "excerpt": record["excerpt"],
                    "importance": record["importance"],
                    "tags": ", ".join(record["tags"]),
                }
            )


def md_escape(value: Any) -> str:
    return str(value or "").replace("|", "\\|")


def write_report(index: dict[str, Any]) -> None:
    records = index["evidence"]
    by_type = index["summary"]["source_types"]
    by_parcel = Counter(record["parcel_key"] or "GENEL" for record in records)
    lines = [
        "# DocumentQA Kanit Indeksi",
        "",
        f"Uretim zamani: {index['generated_at']}",
        "",
        "Bu asama, onceki PDF/CAD/Excel/kontrat analizlerini deterministik soru-cevap icin tek bir kanit indeksinde toplar.",
        "",
        "## Ozet",
        "",
        f"- Kanit kaydi: {index['summary']['evidence_count']}",
        f"- Parselli kanit kapsami: {index['summary']['parcel_count']} ada-parsel",
        f"- Kaynak tipi: {len(by_type)}",
        "",
        "## Kaynak Tipleri",
        "",
        "| Tip | Kayit |",
        "|---|---:|",
    ]
    for source_type, count in sorted(by_type.items()):
        lines.append(f"| {md_escape(source_type)} | {count} |")

    lines.extend(["", "## En Yogun Parseller", "", "| Ada-Parsel | Kanit |", "|---|---:|"])
    for parcel_key, count in by_parcel.most_common(12):
        lines.append(f"| {md_escape(parcel_key)} | {count} |")

    lines.extend(["", "## En Yuksek Onemli Kanitlar", "", "| Kanit | Parsel | Tip | Onem | Ozet |", "|---|---|---|---:|---|"])
    for record in sorted(records, key=lambda item: (-item["importance"], item["source_type"], item["evidence_id"]))[:24]:
        lines.append(
            "| "
            + " | ".join(
                [
                    md_escape(record["evidence_id"]),
                    md_escape(record["parcel_key"] or "GENEL"),
                    md_escape(record["source_type"]),
                    str(record["importance"]),
                    md_escape(compact_text(record["summary"], 140)),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## API Tasarimi",
            "",
            "- `GET /api/document-qa/evidence?parcel_key=&source_type=&q=&limit=&offset=`",
            "- `GET /api/document-qa/ask?parcel_key=&q=&limit=`",
            "",
            "Soru-cevap yaniti LLM'e gitmeden, bu indeksin arama skoruna ve kanit ozetlerine dayali deterministik cevap uretir.",
            "",
            "## Cikti Dosyalari",
            "",
            "- `document_qa_index.json`",
            "- `document_qa_evidence.csv`",
            "- `DOCUMENT_QA_REPORT.md`",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    index = build_index()
    write_json(OUT_JSON, index)
    write_csv(index["evidence"])
    write_report(index)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_CSV}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps(index["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
