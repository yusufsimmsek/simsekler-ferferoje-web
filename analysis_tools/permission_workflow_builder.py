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
OUT = WORKSPACE_ROOT / "project_analysis" / "permission_workflow"

OUT_JSON = OUT / "permission_workflow_seed.json"
OUT_TASKS_CSV = OUT / "review_tasks.csv"
OUT_EVIDENCE_CSV = OUT / "review_task_evidence.csv"
OUT_MD = OUT / "PERMISSION_WORKFLOW_REPORT.md"

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


def normalize_search(value: Any) -> str:
    text = str(value or "").translate(TURKISH_FOLD).casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9_\-./%+]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokens(value: Any) -> list[str]:
    stop = {
        "icin",
        "ile",
        "bir",
        "bu",
        "var",
        "yok",
        "olarak",
        "adet",
        "m2",
        "pdf",
        "cad",
    }
    return [token for token in normalize_search(value).split() if len(token) > 2 and token not in stop][:18]


def compact_text(value: Any, limit: int = 360) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def task_category(code: str | None) -> str:
    code = normalize_search(code)
    if "contract" in code:
        return "contract"
    if "cad" in code:
        return "cad"
    if "proposal" in code or "parser" in code:
        return "proposal"
    if "source" in code:
        return "source"
    return "general"


def task_title(warning: dict[str, Any]) -> str:
    category = task_category(warning.get("code"))
    labels = {
        "contract": "Sozlesme kontrolu",
        "cad": "CAD/metraj kontrolu",
        "proposal": "Teklif kontrolu",
        "source": "Kaynak dosya kontrolu",
        "general": "Inceleme kontrolu",
    }
    return f"{labels[category]}: {warning.get('code')}"


def task_priority(level: str | None, code: str | None) -> int:
    base = {"risk": 88, "review": 64, "info": 32}.get(str(level or ""), 45)
    code_text = normalize_search(code)
    if "contract" in code_text:
        base += 8
    if "title_body_mismatch" in code_text or "area_delta" in code_text:
        base += 7
    if "missing" in code_text:
        base += 3
    return max(1, min(100, base))


def due_bucket(priority: int) -> str:
    if priority >= 85:
        return "same_day"
    if priority >= 65:
        return "three_days"
    return "backlog"


def warning_signature(warning: dict[str, Any]) -> str:
    parts = [
        warning.get("parcel_key") or "",
        warning.get("level") or "",
        warning.get("code") or "",
        warning.get("source") or "",
        warning.get("message") or "",
    ]
    return "|".join(parts)


def task_key(warning: dict[str, Any]) -> str:
    digest = hashlib.sha1(warning_signature(warning).encode("utf-8")).hexdigest()[:10]
    return f"TASK-{digest}"


def evidence_relation_score(warning: dict[str, Any], evidence: dict[str, Any]) -> int:
    score = int(evidence.get("importance") or 0)
    source_type = evidence.get("source_type") or ""
    code_text = normalize_search(warning.get("code"))
    warning_tokens = set(tokens(" ".join([warning.get("code") or "", warning.get("message") or ""])))
    evidence_text = evidence.get("search_text") or normalize_search(
        " ".join([evidence.get("title") or "", evidence.get("summary") or "", evidence.get("excerpt") or ""])
    )
    score += sum(9 for token in warning_tokens if token in evidence_text)
    if warning.get("source") and warning.get("source") == evidence.get("source_path"):
        score += 28
    if warning.get("code") and warning.get("code") in (evidence.get("title") or ""):
        score += 18
    if "contract" in code_text and source_type in {"contract_rule", "contract_finding", "proposal_term", "proposal_v2"}:
        score += 18
    if "cad_unit" in code_text and source_type in {"cad_unit_plan", "cad_unit_finding", "cad_unit_candidate"}:
        score += 22
    elif "cad" in code_text and source_type in {"cad_summary", "cad_unit_plan", "cad_unit_finding", "excel_metraj"}:
        score += 18
    if "proposal" in code_text and source_type in {"proposal_v2", "proposal_term", "proposal_legacy"}:
        score += 18
    if "missing_cad" in code_text and source_type in {"source_file", "parcel_summary"}:
        score += 10
    if source_type == "warning":
        score += 8
    return score


def load_rows() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with connect() as conn:
        warnings = [
            dict(row)
            for row in conn.execute(
                """
                SELECT id AS source_warning_id, parcel_key, level, code, source, message, status, created_at
                FROM warnings
                ORDER BY
                    CASE level WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                    parcel_key,
                    id
                """
            )
        ]
        evidence = [
            dict(row)
            for row in conn.execute(
                """
                SELECT evidence_id, parcel_key, source_type, source_path, title, summary, excerpt, importance, search_text
                FROM document_qa_evidence
                ORDER BY importance DESC, id
                """
            )
        ]
    return warnings, evidence


def build_workflow() -> dict[str, Any]:
    warnings, evidence_rows = load_rows()
    evidence_by_scope: dict[str, list[dict[str, Any]]] = {}
    for evidence in evidence_rows:
        key = evidence.get("parcel_key") or "GENEL"
        evidence_by_scope.setdefault(key, []).append(evidence)

    tasks: list[dict[str, Any]] = []
    links: list[dict[str, Any]] = []

    for warning in warnings:
        priority = task_priority(warning.get("level"), warning.get("code"))
        category = task_category(warning.get("code"))
        key = task_key(warning)
        candidates = list(evidence_by_scope.get(warning.get("parcel_key") or "GENEL", []))
        if warning.get("parcel_key"):
            candidates.extend(evidence_by_scope.get("GENEL", []))
        scored = []
        for evidence in candidates:
            scored.append((evidence_relation_score(warning, evidence), evidence))
        scored.sort(key=lambda item: (-item[0], -(item[1].get("importance") or 0), item[1].get("evidence_id") or ""))
        selected = [item for item in scored[:3] if item[0] > 20]

        task = {
            "task_key": key,
            "warning_signature": warning_signature(warning),
            "source_warning_id": warning.get("source_warning_id"),
            "parcel_key": warning.get("parcel_key"),
            "level": warning.get("level"),
            "warning_code": warning.get("code"),
            "category": category,
            "priority": priority,
            "due_bucket": due_bucket(priority),
            "status": warning.get("status") if warning.get("status") in {"open", "reviewing", "resolved", "ignored"} else "open",
            "title": task_title(warning),
            "summary": compact_text(warning.get("message"), 520),
            "required_action": required_action(category, warning.get("level"), warning.get("code")),
            "decision_template": decision_template(category, warning.get("level")),
            "evidence_count": len(selected),
            "raw": warning,
        }
        tasks.append(task)
        for rank, (score, evidence) in enumerate(selected, start=1):
            links.append(
                {
                    "task_key": key,
                    "evidence_id": evidence.get("evidence_id"),
                    "rank": rank,
                    "relevance_score": int(score),
                    "note": compact_text(evidence.get("summary"), 240),
                }
            )

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_database": str(DB_PATH),
        "summary": {
            "task_count": len(tasks),
            "task_evidence_count": len(links),
            "tasks_by_status": dict(Counter(task["status"] for task in tasks)),
            "tasks_by_level": dict(Counter(task["level"] for task in tasks)),
            "tasks_by_category": dict(Counter(task["category"] for task in tasks)),
            "tasks_by_due_bucket": dict(Counter(task["due_bucket"] for task in tasks)),
        },
        "tasks": tasks,
        "task_evidence": links,
    }


def required_action(category: str, level: str | None, code: str | None) -> str:
    code_text = normalize_search(code)
    if category == "contract":
        return "Sozlesme taslagina gecmeden once teklif terimleri, risk bulgusu ve hak sahipleri dagilimi kontrol edilmeli."
    if "area_delta" in code_text:
        return "CAD oda toplami, eski metraj ve teklif alanlari birlikte karsilastirilmali."
    if category == "cad":
        return "CAD semantik veri ve bagimsiz bolum adaylari manuel plan okumasiyla dogrulanmali."
    if category == "proposal":
        return "Teklif PDF metni manuel okunarak parser sinyali ve ozel kosullar teyit edilmeli."
    if category == "source":
        return "Kaynak dosya ada-parsel eslesmesi elle tamamlanmali."
    if level == "risk":
        return "Risk kapatilana kadar sozlesme/karar sureci bekletilmeli."
    return "Inceleme sonucu kayda baglanmali."


def decision_template(category: str, level: str | None) -> list[str]:
    options = ["needs_review", "approved_with_note", "resolved", "ignored"]
    if category == "contract" or level == "risk":
        return ["hold", "needs_legal_review", "approved_with_note", "resolved"]
    if category == "cad":
        return ["needs_cad_review", "approved_with_note", "resolved", "ignored"]
    if category == "proposal":
        return ["needs_offer_review", "approved_with_note", "resolved", "ignored"]
    return options


def write_csvs(workflow: dict[str, Any]) -> None:
    with OUT_TASKS_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "task_key",
                "source_warning_id",
                "parcel_key",
                "level",
                "warning_code",
                "category",
                "priority",
                "due_bucket",
                "status",
                "title",
                "summary",
                "required_action",
                "evidence_count",
            ],
        )
        writer.writeheader()
        for task in workflow["tasks"]:
            writer.writerow({key: task.get(key) for key in writer.fieldnames})

    with OUT_EVIDENCE_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["task_key", "evidence_id", "rank", "relevance_score", "note"])
        writer.writeheader()
        for link in workflow["task_evidence"]:
            writer.writerow(link)


def md_escape(value: Any) -> str:
    return str(value or "").replace("|", "\\|")


def write_report(workflow: dict[str, Any]) -> None:
    summary = workflow["summary"]
    lines = [
        "# PermissionWorkflow Gorev Cekirdegi",
        "",
        f"Uretim zamani: {workflow['generated_at']}",
        "",
        "Bu asama, acik uyarilari kanit bagli insan inceleme gorevlerine donusturur.",
        "",
        "## Ozet",
        "",
        f"- Gorev: {summary['task_count']}",
        f"- Gorev-kanit bagi: {summary['task_evidence_count']}",
        "",
        "## Kategori Dagilimi",
        "",
        "| Kategori | Gorev |",
        "|---|---:|",
    ]
    for category, count in sorted(summary["tasks_by_category"].items()):
        lines.append(f"| {md_escape(category)} | {count} |")

    lines.extend(["", "## Oncelik Dagilimi", "", "| Termin | Gorev |", "|---|---:|"])
    for bucket, count in sorted(summary["tasks_by_due_bucket"].items()):
        lines.append(f"| {md_escape(bucket)} | {count} |")

    lines.extend(["", "## En Yuksek Oncelikli Gorevler", "", "| Gorev | Parsel | Seviye | Oncelik | Aksiyon |", "|---|---|---|---:|---|"])
    for task in sorted(workflow["tasks"], key=lambda item: (-item["priority"], item.get("parcel_key") or "", item["task_key"]))[:24]:
        lines.append(
            "| "
            + " | ".join(
                [
                    md_escape(task["task_key"]),
                    md_escape(task.get("parcel_key") or "GENEL"),
                    md_escape(task["level"]),
                    str(task["priority"]),
                    md_escape(compact_text(task["required_action"], 120)),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            "## Backend Hedefi",
            "",
            "- `review_tasks`: uyaridan tureyen insan inceleme gorevi.",
            "- `review_task_evidence`: goreve baglanan DocumentQA kanitlari.",
            "- `review_decisions`: insanin gorev icin verdigi karar ve not gecmisi.",
            "",
            "## Cikti Dosyalari",
            "",
            "- `permission_workflow_seed.json`",
            "- `review_tasks.csv`",
            "- `review_task_evidence.csv`",
            "- `PERMISSION_WORKFLOW_REPORT.md`",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    workflow = build_workflow()
    write_json(OUT_JSON, workflow)
    write_csvs(workflow)
    write_report(workflow)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_TASKS_CSV}")
    print(f"Wrote {OUT_EVIDENCE_CSV}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps(workflow["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
