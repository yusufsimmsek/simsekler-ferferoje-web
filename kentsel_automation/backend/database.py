from __future__ import annotations

import json
import math
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4


BACKEND_DIR = Path(__file__).resolve().parent
APP_ROOT = BACKEND_DIR.parent
WORKSPACE_ROOT = APP_ROOT.parent
DATA_DIR = APP_ROOT / "data"
DEFAULT_DB_PATH = DATA_DIR / "kentsel.db"
DEFAULT_SEED_PATH = WORKSPACE_ROOT / "project_analysis" / "automation_blueprint" / "automation_seed.json"
DEFAULT_PROPOSAL_V2_PATH = WORKSPACE_ROOT / "project_analysis" / "proposal_v2" / "proposal_v2_analysis.json"
DEFAULT_CONTRACT_RULES_PATH = WORKSPACE_ROOT / "project_analysis" / "contract_rules" / "contract_rule_analysis.json"
DEFAULT_CAD_UNITS_PATH = WORKSPACE_ROOT / "project_analysis" / "cad_units" / "cad_unit_analysis.json"
DEFAULT_DOCUMENT_QA_PATH = WORKSPACE_ROOT / "project_analysis" / "document_qa" / "document_qa_index.json"
DEFAULT_PERMISSION_WORKFLOW_PATH = WORKSPACE_ROOT / "project_analysis" / "permission_workflow" / "permission_workflow_seed.json"
DEFAULT_COMPANY_DATASET_PATH = WORKSPACE_ROOT / "project_analysis" / "company_dataset" / "company_dataset_seed.json"
SCHEMA_PATH = BACKEND_DIR / "schema.sql"


def db_path() -> Path:
    return Path(os.environ.get("KENTSEL_DB_PATH", str(DEFAULT_DB_PATH)))


def seed_path() -> Path:
    return Path(os.environ.get("KENTSEL_SEED_PATH", str(DEFAULT_SEED_PATH)))


def json_dump(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False)


def connect(path: Path | None = None) -> sqlite3.Connection:
    path = path or db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(path: Path | None = None, *, reset: bool = False) -> Path:
    path = path or db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as conn:
        if reset:
            conn.executescript(
                """
                DROP TABLE IF EXISTS parcel_source_files;
                DROP TABLE IF EXISTS cad_unit_findings;
                DROP TABLE IF EXISTS cad_unit_rooms;
                DROP TABLE IF EXISTS cad_unit_candidates;
                DROP TABLE IF EXISTS cad_unit_plans;
                DROP TABLE IF EXISTS excel_old_metraj;
                DROP TABLE IF EXISTS contract_rule_findings;
                DROP TABLE IF EXISTS contract_rule_evaluations;
                DROP TABLE IF EXISTS proposal_v2_terms;
                DROP TABLE IF EXISTS proposal_v2_records;
                DROP TABLE IF EXISTS proposal_summaries;
                DROP TABLE IF EXISTS cad_plans;
                DROP TABLE IF EXISTS review_decisions;
                DROP TABLE IF EXISTS review_task_evidence;
                DROP TABLE IF EXISTS review_tasks;
                DROP TABLE IF EXISTS document_qa_evidence;
                DROP TABLE IF EXISTS offer_data_packages;
                DROP TABLE IF EXISTS sharing_unit_allocations;
                DROP TABLE IF EXISTS sharing_payment_options;
                DROP TABLE IF EXISTS floor_plan_findings;
                DROP TABLE IF EXISTS floor_plan_zones;
                DROP TABLE IF EXISTS floor_plan_options;
                DROP TABLE IF EXISTS unit_mix_options;
                DROP TABLE IF EXISTS unit_layout_options;
                DROP TABLE IF EXISTS core_placement_results;
                DROP TABLE IF EXISTS building_envelope_results;
                DROP TABLE IF EXISTS engine_run_steps;
                DROP TABLE IF EXISTS engine_runs;
                DROP TABLE IF EXISTS existing_area_inputs;
                DROP TABLE IF EXISTS zoning_inputs;
                DROP TABLE IF EXISTS input_projects;
                DROP TABLE IF EXISTS company_project_examples;
                DROP TABLE IF EXISTS company_layout_patterns;
                DROP TABLE IF EXISTS company_sharing_patterns;
                DROP TABLE IF EXISTS automation_engine_modules;
                DROP TABLE IF EXISTS company_profiles;
                DROP TABLE IF EXISTS warnings;
                DROP TABLE IF EXISTS parcels;
                DROP TABLE IF EXISTS source_files;
                DROP TABLE IF EXISTS meta;
                """
            )
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    return path


def load_seed(path: Path | None = None) -> dict[str, Any]:
    path = path or seed_path()
    return json.loads(path.read_text(encoding="utf-8"))


def _nullable_bool(value: Any) -> int | None:
    if value is None:
        return None
    return 1 if bool(value) else 0


def _parcel_exists(conn: sqlite3.Connection, parcel_key: str | None) -> bool:
    if not parcel_key:
        return False
    return bool(conn.execute("SELECT 1 FROM parcels WHERE parcel_key = ?", (parcel_key,)).fetchone())


def _resolve_v2_parcel_key(conn: sqlite3.Connection, record: dict[str, Any]) -> str | None:
    for candidate in [record.get("parcel_key"), record.get("title_parcel_key"), record.get("body_parcel_key")]:
        if _parcel_exists(conn, candidate):
            return candidate
    return None


def import_proposal_v2(conn: sqlite3.Connection, proposal_v2_file: Path, imported_at: str) -> dict[str, int]:
    if not proposal_v2_file.exists():
        return {"proposal_v2_records": 0, "proposal_v2_terms": 0, "proposal_v2_warnings": 0}

    data = json.loads(proposal_v2_file.read_text(encoding="utf-8"))
    term_count = 0
    warning_count = 0

    for record in data.get("records", []):
        resolved_parcel_key = _resolve_v2_parcel_key(conn, record)
        otopark = record.get("otopark") or {}
        cursor = conn.execute(
            """
            INSERT INTO proposal_v2_records (
                parcel_key, relative_path, title_parcel_key, body_parcel_key, proposal_date,
                existing_independent_units, otopark_label, otopark_floor_no, owner_units_total,
                contractor_units_total, total_unit_mentions, distribution_item_count,
                alternative_item_count, financial_term_count, condition_term_count,
                parser_warning_count, confidence_score, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                resolved_parcel_key,
                record.get("relative_path"),
                record.get("title_parcel_key"),
                record.get("body_parcel_key"),
                record.get("proposal_date"),
                record.get("existing_independent_units"),
                otopark.get("label"),
                otopark.get("floor_no"),
                record.get("owner_units_total"),
                record.get("contractor_units_total"),
                record.get("total_unit_mentions"),
                record.get("distribution_item_count"),
                record.get("alternative_item_count"),
                record.get("financial_term_count"),
                record.get("condition_term_count"),
                len(record.get("parser_warnings") or []),
                record.get("confidence_score"),
                json_dump(record),
            ),
        )
        proposal_record_id = cursor.lastrowid

        grouped_terms = []
        for group_name in ["distribution_terms", "alternative_terms", "financial_terms", "condition_terms"]:
            for term in record.get(group_name, []) or []:
                grouped_terms.append((group_name, term))

        for warning in record.get("parser_warnings", []) or []:
            grouped_terms.append(
                (
                    "parser_warnings",
                    {
                        "term_type": "warning",
                        "label": warning.get("code"),
                        "level": warning.get("level"),
                        "excerpt": warning.get("message"),
                        "confidence": record.get("confidence_score"),
                    },
                )
            )
            conn.execute(
                """
                INSERT INTO warnings (parcel_key, level, code, source, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'open', ?)
                """,
                (
                    resolved_parcel_key,
                    warning.get("level"),
                    warning.get("code"),
                    record.get("relative_path"),
                    warning.get("message"),
                    imported_at,
                ),
            )
            warning_count += 1

        for group_name, term in grouped_terms:
            conn.execute(
                """
                INSERT INTO proposal_v2_terms (
                    proposal_record_id, parcel_key, relative_path, group_name, term_type, label,
                    level, role, floor, unit_count, unit_type, amount, currency, percent,
                    excerpt, confidence, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    proposal_record_id,
                    resolved_parcel_key,
                    record.get("relative_path"),
                    group_name,
                    term.get("term_type"),
                    term.get("label"),
                    term.get("level"),
                    term.get("role"),
                    term.get("floor"),
                    term.get("unit_count"),
                    term.get("unit_type"),
                    term.get("amount"),
                    term.get("currency"),
                    term.get("percent"),
                    term.get("excerpt"),
                    term.get("confidence"),
                    json_dump(term),
                ),
            )
            term_count += 1

    return {
        "proposal_v2_records": len(data.get("records", [])),
        "proposal_v2_terms": term_count,
        "proposal_v2_warnings": warning_count,
    }


def _proposal_record_for_path(conn: sqlite3.Connection, relative_path: str | None) -> sqlite3.Row | None:
    if not relative_path:
        return None
    return conn.execute(
        "SELECT id, parcel_key FROM proposal_v2_records WHERE relative_path = ? ORDER BY id LIMIT 1",
        (relative_path,),
    ).fetchone()


def _warning_level_for_contract(severity: str | None) -> str:
    if severity in {"blocking", "risk"}:
        return "risk"
    if severity == "review":
        return "review"
    return "info"


def import_contract_rules(conn: sqlite3.Connection, contract_rules_file: Path, imported_at: str) -> dict[str, int]:
    if not contract_rules_file.exists():
        return {"contract_rule_evaluations": 0, "contract_rule_findings": 0, "contract_rule_warnings": 0}

    data = json.loads(contract_rules_file.read_text(encoding="utf-8"))
    finding_count = 0
    warning_count = 0

    for evaluation in data.get("evaluations", []):
        proposal_row = _proposal_record_for_path(conn, evaluation.get("relative_path"))
        proposal_record_id = proposal_row["id"] if proposal_row else None
        parcel_key = proposal_row["parcel_key"] if proposal_row else evaluation.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None

        cursor = conn.execute(
            """
            INSERT INTO contract_rule_evaluations (
                proposal_record_id, parcel_key, relative_path, proposal_date, risk_score, risk_level,
                decision_recommendation, finding_count, blocking_count, risk_count, review_count,
                info_count, owner_units_total, contractor_units_total, total_units,
                contractor_share_percent, confidence_score, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                proposal_record_id,
                parcel_key,
                evaluation.get("relative_path"),
                evaluation.get("proposal_date"),
                evaluation.get("risk_score"),
                evaluation.get("risk_level"),
                evaluation.get("decision_recommendation"),
                evaluation.get("finding_count"),
                evaluation.get("blocking_count"),
                evaluation.get("risk_count"),
                evaluation.get("review_count"),
                evaluation.get("info_count"),
                evaluation.get("owner_units_total"),
                evaluation.get("contractor_units_total"),
                evaluation.get("total_units"),
                evaluation.get("contractor_share_percent"),
                evaluation.get("confidence_score"),
                json_dump(evaluation),
            ),
        )
        evaluation_id = cursor.lastrowid

        for finding in evaluation.get("findings", []) or []:
            conn.execute(
                """
                INSERT INTO contract_rule_findings (
                    evaluation_id, proposal_record_id, parcel_key, relative_path, severity,
                    code, title, message, evidence, recommendation, weight, source, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    evaluation_id,
                    proposal_record_id,
                    parcel_key,
                    evaluation.get("relative_path"),
                    finding.get("severity"),
                    finding.get("code"),
                    finding.get("title"),
                    finding.get("message"),
                    finding.get("evidence"),
                    finding.get("recommendation"),
                    finding.get("weight"),
                    finding.get("source"),
                    json_dump(finding),
                ),
            )
            finding_count += 1
            if finding.get("severity") in {"blocking", "risk"}:
                conn.execute(
                    """
                    INSERT INTO warnings (parcel_key, level, code, source, message, status, created_at)
                    VALUES (?, ?, ?, ?, ?, 'open', ?)
                    """,
                    (
                        parcel_key,
                        _warning_level_for_contract(finding.get("severity")),
                        f"contract_{finding.get('code')}",
                        evaluation.get("relative_path"),
                        f"{finding.get('title')}: {finding.get('message')}",
                        imported_at,
                    ),
                )
                warning_count += 1

    return {
        "contract_rule_evaluations": len(data.get("evaluations", [])),
        "contract_rule_findings": finding_count,
        "contract_rule_warnings": warning_count,
    }


def import_cad_units(conn: sqlite3.Connection, cad_units_file: Path, imported_at: str) -> dict[str, int]:
    if not cad_units_file.exists():
        return {"cad_unit_plans": 0, "cad_unit_candidates": 0, "cad_unit_rooms": 0, "cad_unit_findings": 0, "cad_unit_warnings": 0}

    data = json.loads(cad_units_file.read_text(encoding="utf-8"))
    candidate_count = 0
    room_count = 0
    finding_count = 0
    warning_count = 0

    for plan in data.get("plans", []) or []:
        parcel_key = plan.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None
        cursor = conn.execute(
            """
            INSERT INTO cad_unit_plans (
                parcel_key, relative_path, primary_method, primary_candidate_count,
                net_label_candidate_count, sequence_candidate_count, candidate_count,
                room_area_pair_count, total_detected_room_area_m2, net_label_sum_m2,
                cluster_threshold, offer_owner_units, offer_contractor_units,
                offer_total_units, offer_match_status, unit_count_delta,
                confidence_score, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                parcel_key,
                plan.get("relative_path"),
                plan.get("primary_method"),
                plan.get("primary_candidate_count"),
                plan.get("net_label_candidate_count"),
                plan.get("sequence_candidate_count"),
                plan.get("candidate_count"),
                plan.get("room_area_pair_count"),
                plan.get("total_detected_room_area_m2"),
                plan.get("net_label_sum_m2"),
                plan.get("cluster_threshold"),
                plan.get("offer_owner_units"),
                plan.get("offer_contractor_units"),
                plan.get("offer_total_units"),
                plan.get("offer_match_status"),
                plan.get("unit_count_delta"),
                plan.get("confidence_score"),
                json_dump(plan),
            ),
        )
        cad_unit_plan_id = cursor.lastrowid

        for candidate in plan.get("candidates", []) or []:
            center = candidate.get("center") or [None, None]
            cursor = conn.execute(
                """
                INSERT INTO cad_unit_candidates (
                    cad_unit_plan_id, parcel_key, relative_path, candidate_key, method,
                    unit_type, room_mix, area_m2, room_count, living_count, bedroom_count,
                    wet_count, service_count, center_x, center_y, confidence_score,
                    room_types_json, bbox_json, review_notes_json, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cad_unit_plan_id,
                    parcel_key,
                    plan.get("relative_path"),
                    candidate.get("candidate_key"),
                    candidate.get("method"),
                    candidate.get("unit_type"),
                    candidate.get("room_mix"),
                    candidate.get("area_m2"),
                    candidate.get("room_count"),
                    candidate.get("living_count"),
                    candidate.get("bedroom_count"),
                    candidate.get("wet_count"),
                    candidate.get("service_count"),
                    center[0],
                    center[1],
                    candidate.get("confidence_score"),
                    json_dump(candidate.get("room_types") or {}),
                    json_dump(candidate.get("bbox") or {}),
                    json_dump(candidate.get("review_notes") or []),
                    json_dump(candidate),
                ),
            )
            candidate_id = cursor.lastrowid
            candidate_count += 1

            for room in candidate.get("rooms", []) or []:
                point = room.get("point") or [None, None]
                conn.execute(
                    """
                    INSERT INTO cad_unit_rooms (
                        cad_unit_candidate_id, parcel_key, relative_path, room_name,
                        room_type, area_m2, point_x, point_y, pair_quality, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        candidate_id,
                        parcel_key,
                        plan.get("relative_path"),
                        room.get("room_name"),
                        room.get("room_type"),
                        room.get("area_m2"),
                        point[0],
                        point[1],
                        room.get("pair_quality"),
                        json_dump(room),
                    ),
                )
                room_count += 1

        for finding in plan.get("findings", []) or []:
            conn.execute(
                """
                INSERT INTO cad_unit_findings (
                    cad_unit_plan_id, parcel_key, relative_path, severity,
                    code, message, recommendation, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cad_unit_plan_id,
                    parcel_key,
                    plan.get("relative_path"),
                    finding.get("severity"),
                    finding.get("code"),
                    finding.get("message"),
                    finding.get("recommendation"),
                    json_dump(finding),
                ),
            )
            finding_count += 1
            if finding.get("severity") in {"risk", "review"}:
                conn.execute(
                    """
                    INSERT INTO warnings (parcel_key, level, code, source, message, status, created_at)
                    VALUES (?, ?, ?, ?, ?, 'open', ?)
                    """,
                    (
                        parcel_key,
                        "risk" if finding.get("severity") == "risk" else "review",
                        f"cad_unit_{finding.get('code')}",
                        plan.get("relative_path"),
                        finding.get("message"),
                        imported_at,
                    ),
                )
                warning_count += 1

    return {
        "cad_unit_plans": len(data.get("plans", []) or []),
        "cad_unit_candidates": candidate_count,
        "cad_unit_rooms": room_count,
        "cad_unit_findings": finding_count,
        "cad_unit_warnings": warning_count,
    }


def import_document_qa(conn: sqlite3.Connection, document_qa_file: Path) -> dict[str, int]:
    if not document_qa_file.exists():
        return {"document_qa_evidence": 0}

    data = json.loads(document_qa_file.read_text(encoding="utf-8"))
    count = 0
    for evidence in data.get("evidence", []) or []:
        parcel_key = evidence.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None
        conn.execute(
            """
            INSERT OR REPLACE INTO document_qa_evidence (
                evidence_id, parcel_key, source_type, source_path, title, summary,
                excerpt, importance, tags_json, search_text, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                evidence.get("evidence_id"),
                parcel_key,
                evidence.get("source_type"),
                evidence.get("source_path"),
                evidence.get("title"),
                evidence.get("summary"),
                evidence.get("excerpt"),
                evidence.get("importance"),
                json_dump(evidence.get("tags") or []),
                evidence.get("search_text"),
                json_dump(evidence.get("raw") or {}),
            ),
        )
        count += 1

    return {"document_qa_evidence": count}


def _warning_signature(row: sqlite3.Row) -> str:
    parts = [
        row["parcel_key"] or "",
        row["level"] or "",
        row["code"] or "",
        row["source"] or "",
        row["message"] or "",
    ]
    return "|".join(parts)


def _warning_for_task(conn: sqlite3.Connection, task: dict[str, Any]) -> sqlite3.Row | None:
    signature = task.get("warning_signature")
    if signature:
        for row in conn.execute("SELECT * FROM warnings").fetchall():
            if _warning_signature(row) == signature:
                return row
    source_warning_id = task.get("source_warning_id")
    if source_warning_id:
        return conn.execute("SELECT * FROM warnings WHERE id = ?", (source_warning_id,)).fetchone()
    return None


def import_permission_workflow(conn: sqlite3.Connection, workflow_file: Path, imported_at: str) -> dict[str, int]:
    if not workflow_file.exists():
        return {"review_tasks": 0, "review_task_evidence": 0, "review_decisions": 0}

    data = json.loads(workflow_file.read_text(encoding="utf-8"))
    task_ids_by_key: dict[str, int] = {}
    evidence_count = 0

    for task in data.get("tasks", []) or []:
        warning_row = _warning_for_task(conn, task)
        warning_id = warning_row["id"] if warning_row else None
        parcel_key = task.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None

        cursor = conn.execute(
            """
            INSERT OR REPLACE INTO review_tasks (
                task_key, warning_id, parcel_key, level, warning_code, category,
                priority, due_bucket, status, title, summary, required_action,
                decision_template_json, evidence_count, warning_signature,
                created_at, updated_at, closed_at, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                task.get("task_key"),
                warning_id,
                parcel_key,
                task.get("level"),
                task.get("warning_code"),
                task.get("category"),
                task.get("priority"),
                task.get("due_bucket"),
                task.get("status") or "open",
                task.get("title"),
                task.get("summary"),
                task.get("required_action"),
                json_dump(task.get("decision_template") or []),
                task.get("evidence_count") or 0,
                task.get("warning_signature"),
                imported_at,
                None,
                None,
                json_dump(task),
            ),
        )
        task_ids_by_key[task.get("task_key")] = cursor.lastrowid

    for link in data.get("task_evidence", []) or []:
        task_id = task_ids_by_key.get(link.get("task_key"))
        evidence_id = link.get("evidence_id")
        if not task_id or not evidence_id:
            continue
        exists = conn.execute("SELECT 1 FROM document_qa_evidence WHERE evidence_id = ?", (evidence_id,)).fetchone()
        if not exists:
            continue
        conn.execute(
            """
            INSERT OR IGNORE INTO review_task_evidence (
                task_id, evidence_id, rank, relevance_score, note
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                task_id,
                evidence_id,
                link.get("rank"),
                link.get("relevance_score"),
                link.get("note"),
            ),
        )
        evidence_count += 1

    return {
        "review_tasks": len(task_ids_by_key),
        "review_task_evidence": evidence_count,
        "review_decisions": 0,
    }


def import_company_dataset(conn: sqlite3.Connection, dataset_file: Path) -> dict[str, int]:
    if not dataset_file.exists():
        return {
            "company_profiles": 0,
            "company_project_examples": 0,
            "company_layout_patterns": 0,
            "company_sharing_patterns": 0,
            "automation_engine_modules": 0,
        }

    data = json.loads(dataset_file.read_text(encoding="utf-8"))
    generated_at = data.get("generated_at")
    profile = data.get("company_profile") or {}
    company_key = profile.get("company_key")
    if not company_key:
        return {
            "company_profiles": 0,
            "company_project_examples": 0,
            "company_layout_patterns": 0,
            "company_sharing_patterns": 0,
            "automation_engine_modules": 0,
        }

    conn.execute(
        """
        INSERT OR REPLACE INTO company_profiles (
            company_key, company_name, brand_config_json, offer_template_json,
            business_rules_json, generated_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            company_key,
            profile.get("company_name") or company_key,
            json_dump(profile.get("brand_config") or {}),
            json_dump(profile.get("offer_template") or {}),
            json_dump(profile.get("business_rules") or {}),
            generated_at,
            json_dump(profile.get("raw") or {}),
        ),
    )

    project_count = 0
    for example in data.get("project_examples", []) or []:
        parcel_key = example.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None
        conn.execute(
            """
            INSERT OR REPLACE INTO company_project_examples (
                example_key, company_key, parcel_key, ada, parsel, status,
                reconciliation_quality, source_file_count, cad_plan_count,
                excel_count, proposal_count, proposal_v2_count, cad_area_m2,
                old_area_m2, area_delta_m2, cad_unit_candidate_count,
                cad_unit_primary_count, offer_total_units, owner_units_total,
                contractor_units_total, total_unit_mentions, contract_risk_score,
                review_task_count, risk_task_count, evidence_count,
                lesson_tags_json, review_notes_json, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                example.get("example_key"),
                company_key,
                parcel_key,
                example.get("ada"),
                example.get("parsel"),
                example.get("status"),
                example.get("reconciliation_quality"),
                example.get("source_file_count"),
                example.get("cad_plan_count"),
                example.get("excel_count"),
                example.get("proposal_count"),
                example.get("proposal_v2_count"),
                example.get("cad_area_m2"),
                example.get("old_area_m2"),
                example.get("area_delta_m2"),
                example.get("cad_unit_candidate_count"),
                example.get("cad_unit_primary_count"),
                example.get("offer_total_units"),
                example.get("owner_units_total"),
                example.get("contractor_units_total"),
                example.get("total_unit_mentions"),
                example.get("contract_risk_score"),
                example.get("review_task_count"),
                example.get("risk_task_count"),
                example.get("evidence_count"),
                json_dump(example.get("lesson_tags") or []),
                json_dump(example.get("review_notes") or []),
                json_dump(example.get("raw") or {}),
            ),
        )
        project_count += 1

    layout_count = 0
    for pattern in data.get("layout_patterns", []) or []:
        conn.execute(
            """
            INSERT OR REPLACE INTO company_layout_patterns (
                pattern_key, company_key, unit_type, room_mix, pattern_role,
                sample_count, parcel_count, avg_area_m2, min_area_m2, max_area_m2,
                avg_confidence, net_label_samples, sequence_samples,
                pattern_status, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pattern.get("pattern_key"),
                company_key,
                pattern.get("unit_type"),
                pattern.get("room_mix"),
                pattern.get("pattern_role"),
                pattern.get("sample_count"),
                pattern.get("parcel_count"),
                pattern.get("avg_area_m2"),
                pattern.get("min_area_m2"),
                pattern.get("max_area_m2"),
                pattern.get("avg_confidence"),
                pattern.get("net_label_samples"),
                pattern.get("sequence_samples"),
                pattern.get("pattern_status"),
                json_dump(pattern.get("raw") or {}),
            ),
        )
        layout_count += 1

    sharing_count = 0
    for pattern in data.get("sharing_patterns", []) or []:
        parcel_key = pattern.get("parcel_key")
        if not _parcel_exists(conn, parcel_key):
            parcel_key = None
        conn.execute(
            """
            INSERT OR REPLACE INTO company_sharing_patterns (
                pattern_key, company_key, parcel_key, relative_path, proposal_date,
                owner_units_total, contractor_units_total, total_units,
                contractor_share_percent, distribution_item_count,
                alternative_item_count, financial_term_count, condition_term_count,
                confidence_score, risk_score, risk_level, decision_recommendation,
                pattern_status, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                pattern.get("pattern_key"),
                company_key,
                parcel_key,
                pattern.get("relative_path"),
                pattern.get("proposal_date"),
                pattern.get("owner_units_total"),
                pattern.get("contractor_units_total"),
                pattern.get("total_units"),
                pattern.get("contractor_share_percent"),
                pattern.get("distribution_item_count"),
                pattern.get("alternative_item_count"),
                pattern.get("financial_term_count"),
                pattern.get("condition_term_count"),
                pattern.get("confidence_score"),
                pattern.get("risk_score"),
                pattern.get("risk_level"),
                pattern.get("decision_recommendation"),
                pattern.get("pattern_status"),
                json_dump(pattern.get("raw") or {}),
            ),
        )
        sharing_count += 1

    module_count = 0
    for module in data.get("engine_modules", []) or []:
        conn.execute(
            """
            INSERT OR REPLACE INTO automation_engine_modules (
                module_key, company_key, sequence_no, display_name, purpose,
                status, input_contract_json, output_contract_json, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                module.get("module_key"),
                company_key,
                module.get("sequence_no"),
                module.get("display_name"),
                module.get("purpose"),
                module.get("status"),
                json_dump(module.get("input_contract") or []),
                json_dump(module.get("output_contract") or []),
                json_dump(module),
            ),
        )
        module_count += 1

    ensure_floor_plan_module(conn, company_key)
    module_count = conn.execute("SELECT COUNT(*) FROM automation_engine_modules WHERE company_key = ?", (company_key,)).fetchone()[0]

    return {
        "company_profiles": 1,
        "company_project_examples": project_count,
        "company_layout_patterns": layout_count,
        "company_sharing_patterns": sharing_count,
        "automation_engine_modules": module_count,
    }


ENGINE_VERSION = "stage13-floor-plan-v1"
PROTOTYPE_PARTICIPATION_RATE_M2 = 30000.0
PROTOTYPE_PARTICIPATION_CURRENCY = "TRY"

FLOOR_PLAN_MODULE = {
    "module_key": "floor_plan",
    "sequence_no": 7,
    "display_name": "Kat Plan Sistemi",
    "purpose": "tipik kat cekirdegi, dolasim ve daire zonlarini uretme",
    "status": "ready_prototype",
    "input_contract": ["core_placement", "unit_layout_options"],
    "output_contract": ["floor_plan_options", "floor_plan_zones", "floor_plan_findings"],
}


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()} if row else {}


def _num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _int(value: Any) -> int | None:
    number = _num(value)
    return int(number) if number is not None else None


def _round(value: float | None, digits: int = 2) -> float | None:
    return round(value, digits) if value is not None else None


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def first_company_key(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT company_key FROM company_profiles ORDER BY company_key LIMIT 1").fetchone()
    return row["company_key"] if row else "ilkbahar_insaat"


def ensure_floor_plan_module(conn: sqlite3.Connection, company_key: str | None = None) -> None:
    company_key = company_key or first_company_key(conn)
    if not conn.execute("SELECT 1 FROM company_profiles WHERE company_key = ?", (company_key,)).fetchone():
        return
    if conn.execute("SELECT 1 FROM automation_engine_modules WHERE module_key = 'floor_plan'").fetchone():
        return
    conn.execute(
        """
        UPDATE automation_engine_modules
        SET sequence_no = sequence_no + 1
        WHERE sequence_no >= ? AND module_key <> 'floor_plan'
        """,
        (FLOOR_PLAN_MODULE["sequence_no"],),
    )
    conn.execute(
        """
        INSERT INTO automation_engine_modules (
            module_key, company_key, sequence_no, display_name, purpose,
            status, input_contract_json, output_contract_json, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            FLOOR_PLAN_MODULE["module_key"],
            company_key,
            FLOOR_PLAN_MODULE["sequence_no"],
            FLOOR_PLAN_MODULE["display_name"],
            FLOOR_PLAN_MODULE["purpose"],
            FLOOR_PLAN_MODULE["status"],
            json_dump(FLOOR_PLAN_MODULE["input_contract"]),
            json_dump(FLOOR_PLAN_MODULE["output_contract"]),
            json_dump(FLOOR_PLAN_MODULE),
        ),
    )


def _parcel_key_from_input(payload: dict[str, Any]) -> str | None:
    parcel_key = payload.get("parcel_key")
    if parcel_key:
        return str(parcel_key)
    identity = payload.get("parcel_identity") or {}
    zoning = payload.get("zoning_input") or {}
    ada = identity.get("ada") or zoning.get("ada")
    parsel = identity.get("parsel") or zoning.get("parsel")
    if ada and parsel:
        return f"{int(ada)}-{int(parsel)}"
    return None


def _existing_inputs_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if isinstance(payload.get("existing_area_inputs"), list):
        return payload["existing_area_inputs"]
    existing = payload.get("existing_area_input")
    if isinstance(existing, dict):
        return [existing]
    return []


def create_input_project(conn: sqlite3.Connection, payload: dict[str, Any], now: str | None = None) -> str:
    now = now or datetime.now().isoformat(timespec="seconds")
    zoning = payload.get("zoning_input") or {}
    identity = payload.get("parcel_identity") or {}
    company_key = payload.get("company_key") or first_company_key(conn)
    parcel_key = _parcel_key_from_input(payload)
    if not _parcel_exists(conn, parcel_key):
        parcel_key = None

    ada = zoning.get("ada") or identity.get("ada")
    parsel = zoning.get("parsel") or identity.get("parsel")
    project_key = payload.get("project_key") or f"INPUT-{ada or 'X'}-{parsel or 'X'}-{uuid4().hex[:8]}"
    project_name = payload.get("project_name") or f"{ada or '?'}-{parsel or '?'} otomasyon girdisi"

    conn.execute(
        """
        INSERT OR REPLACE INTO input_projects (
            project_key, company_key, parcel_key, project_name, status,
            source_mode, target_offer_template, manual_notes,
            created_at, updated_at, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_key,
            company_key,
            parcel_key,
            project_name,
            payload.get("status") or "draft",
            payload.get("source_mode") or "manual",
            payload.get("target_offer_template") or "kentsel_donusum_teklif",
            payload.get("manual_notes"),
            payload.get("created_at") or now,
            payload.get("updated_at"),
            json_dump(payload),
        ),
    )

    conn.execute(
        """
        INSERT OR REPLACE INTO zoning_inputs (
            project_key, ada, parsel, parcel_area_m2, road_frontage_m,
            zoning_function, taks, kaks_or_emsal, max_floor_count, height_limit_m,
            front_setback_m, side_setback_m, rear_setback_m,
            parking_rule_version, shelter_rule_version, fire_rule_version, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_key,
            _int(zoning.get("ada") or ada),
            _int(zoning.get("parsel") or parsel),
            _num(zoning.get("parcel_area_m2")),
            _num(zoning.get("road_frontage_m")),
            zoning.get("zoning_function"),
            _num(zoning.get("taks")),
            _num(zoning.get("kaks_or_emsal")),
            _int(zoning.get("max_floor_count")),
            _num(zoning.get("height_limit_m")),
            _num(zoning.get("front_setback_m")),
            _num(zoning.get("side_setback_m")),
            _num(zoning.get("rear_setback_m")),
            zoning.get("parking_rule_version"),
            zoning.get("shelter_rule_version"),
            zoning.get("fire_rule_version"),
            json_dump(zoning),
        ),
    )

    conn.execute("DELETE FROM existing_area_inputs WHERE project_key = ?", (project_key,))
    for existing in _existing_inputs_from_payload(payload):
        conn.execute(
            """
            INSERT INTO existing_area_inputs (
                project_key, owner_id, independent_unit_no, existing_gross_m2,
                existing_net_m2, land_share, usage_type, floor_label, notes, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_key,
                existing.get("owner_id"),
                existing.get("independent_unit_no"),
                _num(existing.get("existing_gross_m2")),
                _num(existing.get("existing_net_m2")),
                existing.get("land_share"),
                existing.get("usage_type"),
                existing.get("floor"),
                existing.get("notes"),
                json_dump(existing),
            ),
        )

    return project_key


def _avg_residential_unit_area(conn: sqlite3.Connection) -> float:
    row = conn.execute(
        """
        SELECT AVG(avg_area_m2) AS avg_unit
        FROM company_layout_patterns
        WHERE pattern_role = 'residential' AND pattern_status = 'strong'
        """
    ).fetchone()
    value = _num(row["avg_unit"] if row else None)
    return value if value and value > 0 else 75.0


def build_building_envelope(conn: sqlite3.Connection, project_key: str) -> dict[str, Any]:
    project = _row_dict(conn.execute("SELECT * FROM input_projects WHERE project_key = ?", (project_key,)).fetchone())
    zoning = _row_dict(conn.execute("SELECT * FROM zoning_inputs WHERE project_key = ?", (project_key,)).fetchone())
    if not project or not zoning:
        raise ValueError("input_project_or_zoning_missing")

    findings: list[dict[str, Any]] = []
    parcel_area = _num(zoning.get("parcel_area_m2"))
    taks = _num(zoning.get("taks"))
    kaks = _num(zoning.get("kaks_or_emsal"))
    max_floor_count = _int(zoning.get("max_floor_count"))
    road_frontage = _num(zoning.get("road_frontage_m"))
    front_setback = _num(zoning.get("front_setback_m")) or 0.0
    side_setback = _num(zoning.get("side_setback_m")) or 0.0
    rear_setback = _num(zoning.get("rear_setback_m")) or 0.0

    if not parcel_area or parcel_area <= 0:
        raise ValueError("parcel_area_m2_required")
    if not taks:
        findings.append({"level": "review", "code": "missing_taks", "message": "TAKS girilmedi; zemin oturumu sadece cekme mesafesiyle sinirlanamaz."})
    if not kaks:
        findings.append({"level": "review", "code": "missing_kaks", "message": "KAKS/emsal girilmedi; toplam insaat alani yaklasik hesaplanacak."})
    if not max_floor_count:
        findings.append({"level": "review", "code": "missing_floor_count", "message": "Maksimum kat sayisi girilmedi; kat programi netlesemez."})
    for rule_key in ["parking_rule_version", "shelter_rule_version", "fire_rule_version"]:
        if not zoning.get(rule_key):
            findings.append({"level": "review", "code": f"missing_{rule_key}", "message": f"{rule_key} girilmedi; mevzuat motoru kesin kontrol yapamiyor."})

    taks_footprint = parcel_area * taks if taks else None
    setback_footprint = None
    if road_frontage and road_frontage > 0:
        estimated_depth = parcel_area / road_frontage
        buildable_width = max(0.0, road_frontage - (2 * side_setback))
        buildable_depth = max(0.0, estimated_depth - front_setback - rear_setback)
        setback_footprint = buildable_width * buildable_depth
    else:
        findings.append({"level": "review", "code": "missing_road_frontage", "message": "Yol cephesi girilmedi; cekme mesafesi zarf alani yaklasik hesaplanamadi."})

    footprint_candidates = [value for value in [taks_footprint, setback_footprint] if value is not None and value > 0]
    buildable_footprint = min(footprint_candidates) if footprint_candidates else None
    if buildable_footprint is None:
        findings.append({"level": "risk", "code": "footprint_not_computable", "message": "Zemin oturumu hesaplanamadi; TAKS veya cekme mesafesi girdisi eksik."})

    total_construction = parcel_area * kaks if kaks else None
    if total_construction is None and buildable_footprint and max_floor_count:
        total_construction = buildable_footprint * max_floor_count
    if total_construction is None:
        findings.append({"level": "risk", "code": "construction_area_not_computable", "message": "Toplam yapilabilir alan hesaplanamadi."})

    typical_floor_area = None
    if total_construction and max_floor_count:
        floor_share = total_construction / max_floor_count
        typical_floor_area = min(value for value in [floor_share, buildable_footprint or floor_share] if value > 0)
    elif buildable_footprint:
        typical_floor_area = buildable_footprint

    estimated_floor_count = None
    if total_construction and typical_floor_area:
        estimated_floor_count = math.ceil(total_construction / typical_floor_area)
        if max_floor_count:
            estimated_floor_count = min(estimated_floor_count, max_floor_count)

    residential_efficiency = 82.0
    residential_area = total_construction * (residential_efficiency / 100.0) if total_construction else None
    avg_unit_area = _avg_residential_unit_area(conn)
    estimated_unit_capacity = math.floor(residential_area / avg_unit_area) if residential_area and avg_unit_area else None
    parking_need = estimated_unit_capacity if estimated_unit_capacity is not None else None

    if estimated_unit_capacity is not None:
        findings.append(
            {
                "level": "info",
                "code": "unit_capacity_estimate",
                "message": f"Firma datasetindeki guclu konut oruntulerine gore yaklasik {estimated_unit_capacity} birim kapasite hesaplandi.",
            }
        )

    result = {
        "project_key": project_key,
        "project_name": project.get("project_name"),
        "parcel_key": project.get("parcel_key"),
        "parcel_area_m2": _round(parcel_area),
        "taks_footprint_m2": _round(taks_footprint),
        "setback_footprint_m2": _round(setback_footprint),
        "buildable_footprint_m2": _round(buildable_footprint),
        "total_construction_area_m2": _round(total_construction),
        "typical_floor_area_m2": _round(typical_floor_area),
        "estimated_floor_count": estimated_floor_count,
        "residential_efficiency_percent": residential_efficiency,
        "estimated_residential_area_m2": _round(residential_area),
        "avg_residential_unit_m2": _round(avg_unit_area),
        "estimated_unit_capacity": estimated_unit_capacity,
        "parking_need_estimate": parking_need,
        "review_required": any(item["level"] in {"review", "risk"} for item in findings),
        "findings": findings,
        "assumptions": [
            "Bu Asama 10 prototipi mimari avan proje veya ruhsat hesabi yerine kaba yapilasma zarfi uretir.",
            "Cekme mesafesi hesabinda parsel geometrisi yol cephesinden yaklasik derinlik olarak turetilir.",
            "Konut verimliligi prototipte %82 olarak alinmistir.",
        ],
    }
    return result


def build_core_placement(run_key: str, project_key: str, envelope: dict[str, Any]) -> dict[str, Any]:
    typical_floor_area = _num(envelope.get("typical_floor_area_m2"))
    floor_count = _int(envelope.get("estimated_floor_count"))
    findings: list[dict[str, Any]] = []

    if typical_floor_area is None or typical_floor_area <= 0:
        findings.append(
            {
                "level": "risk",
                "code": "typical_floor_missing",
                "message": "Tipik kat alani olmadigi icin cekirdek yerlesimi net hesaplanamadi.",
            }
        )
        core_type = "unknown_core"
        core_area = None
        circulation_area = None
        net_floor_area = None
        core_efficiency = None
    else:
        if typical_floor_area >= 550:
            core_type = "central_core"
            core_ratio = 0.11
            circulation_ratio = 0.05
            wet_core_score = 88.0
        elif typical_floor_area >= 350:
            core_type = "compact_core"
            core_ratio = 0.12
            circulation_ratio = 0.06
            wet_core_score = 82.0
        else:
            core_type = "linear_core"
            core_ratio = 0.14
            circulation_ratio = 0.08
            wet_core_score = 74.0

        core_area = _clamp(typical_floor_area * core_ratio, 42.0, 115.0)
        circulation_area = typical_floor_area * circulation_ratio
        net_floor_area = max(0.0, typical_floor_area - core_area - circulation_area)
        core_efficiency = (net_floor_area / typical_floor_area) * 100.0 if typical_floor_area else None
        if core_efficiency is not None and core_efficiency < 72:
            findings.append(
                {
                    "level": "review",
                    "code": "low_core_efficiency",
                    "message": f"Cekirdek sonrasi tipik kat verimliligi %{core_efficiency:.1f}; mimari kontrol gerekir.",
                }
            )
        if core_type == "linear_core":
            findings.append(
                {
                    "level": "info",
                    "code": "linear_core_assumption",
                    "message": "Tipik kat alani dusuk oldugu icin lineer cekirdek varsayildi.",
                }
            )
    wet_core_alignment_score = locals().get("wet_core_score", 60.0)
    if not floor_count:
        findings.append({"level": "review", "code": "floor_count_missing_for_core", "message": "Kat sayisi net olmadigi icin cekirdek tekrar sayisi tahmini."})

    return {
        "run_key": run_key,
        "project_key": project_key,
        "core_type": core_type,
        "core_area_m2": _round(core_area),
        "circulation_area_m2": _round(circulation_area),
        "net_floor_area_m2": _round(net_floor_area),
        "gross_floor_area_m2": _round(typical_floor_area),
        "floor_count": floor_count,
        "core_efficiency_percent": _round(core_efficiency),
        "wet_core_alignment_score": _round(wet_core_alignment_score),
        "review_required": any(item["level"] in {"review", "risk"} for item in findings),
        "findings": findings,
        "assumptions": [
            "Asama 11 prototipi cekirdek tipini tipik kat alani bandina gore secer.",
            "Cekirdek ve sirkulasyon alanlari firma teklif motoruna girdi uretmek icin kaba oranlarla hesaplanir.",
            "Islak hacim hizalama skoru mimari aks cizimi yerine dataset/prototip sinyalidir.",
        ],
    }


def _residential_layout_patterns(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT * FROM company_layout_patterns
        WHERE pattern_role = 'residential'
        ORDER BY
            CASE pattern_status WHEN 'strong' THEN 1 ELSE 2 END,
            sample_count DESC,
            avg_area_m2
        """
    ).fetchall()
    patterns: dict[str, dict[str, Any]] = {}
    for row in rows:
        pattern = _row_dict(row)
        room_mix = pattern.get("room_mix")
        avg_area = _num(pattern.get("avg_area_m2"))
        if room_mix and avg_area and avg_area > 0 and room_mix not in patterns:
            patterns[room_mix] = pattern
    return patterns


def _layout_strategy_rows(patterns: dict[str, dict[str, Any]], desired: list[tuple[str, float]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for room_mix, weight in desired:
        pattern = patterns.get(room_mix)
        if not pattern:
            continue
        rows.append(
            {
                "pattern_key": pattern.get("pattern_key"),
                "unit_type": pattern.get("unit_type"),
                "room_mix": pattern.get("room_mix"),
                "pattern_role": pattern.get("pattern_role"),
                "avg_area_m2": _num(pattern.get("avg_area_m2")) or 75.0,
                "weight": weight,
            }
        )
    return rows


def _score_layout_fit(target_area: float, used_area: float, target_units: int | None, unit_count: int) -> float:
    if target_area <= 0:
        return 0.0
    area_score = 100.0 - min(100.0, (abs(target_area - used_area) / target_area) * 100.0)
    if not target_units:
        return _round(area_score) or 0.0
    unit_delta = abs(unit_count - target_units)
    unit_penalty = min(20.0, unit_delta * 1.5)
    return _round(_clamp(area_score - unit_penalty, 0.0, 100.0)) or 0.0


def _build_layout_mix_counts(target_area: float, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if target_area <= 0 or not rows:
        return []
    counts: list[dict[str, Any]] = []
    total_weight = sum(item["weight"] for item in rows) or 1.0
    for item in rows:
        area = item["avg_area_m2"]
        normalized_weight = item["weight"] / total_weight
        unit_count = max(1, math.floor((target_area * normalized_weight) / area))
        counts.append({**item, "unit_count": unit_count})

    def used() -> float:
        return sum(item["unit_count"] * item["avg_area_m2"] for item in counts)

    while used() > target_area * 1.08:
        reducible = [item for item in counts if item["unit_count"] > 1]
        if not reducible:
            break
        max(reducible, key=lambda item: item["avg_area_m2"])["unit_count"] -= 1

    while counts and used() + min(item["avg_area_m2"] for item in counts) <= target_area * 1.03:
        best = max(counts, key=lambda item: item["weight"] / item["avg_area_m2"])
        best["unit_count"] += 1

    return counts


def build_unit_layout_options(
    conn: sqlite3.Connection,
    run_key: str,
    project_key: str,
    envelope: dict[str, Any],
    core: dict[str, Any],
) -> list[dict[str, Any]]:
    gross_residential_area = _num(envelope.get("estimated_residential_area_m2")) or 0.0
    floor_count = _int(core.get("floor_count")) or _int(envelope.get("estimated_floor_count")) or 0
    net_floor_area = _num(core.get("net_floor_area_m2")) or 0.0
    core_net_residential = net_floor_area * floor_count * 0.96 if net_floor_area and floor_count else gross_residential_area
    net_residential_area = min(value for value in [gross_residential_area, core_net_residential] if value and value > 0) if any(
        value and value > 0 for value in [gross_residential_area, core_net_residential]
    ) else 0.0
    target_unit_count = _int(envelope.get("estimated_unit_capacity"))
    patterns = _residential_layout_patterns(conn)
    strategies = [
        ("balanced_family_mix", "Dengeli aile karmasi", [("1+1", 0.18), ("2+1", 0.57), ("3+1", 0.25)]),
        ("compact_high_count", "Kompakt yuksek adet", [("1+1", 0.45), ("2+0", 0.20), ("2+1", 0.35)]),
        ("family_large_units", "Buyuk aile agirligi", [("2+1", 0.45), ("3+1", 0.40), ("4+1", 0.15)]),
    ]
    options: list[dict[str, Any]] = []
    for rank, (strategy_key, option_name, desired) in enumerate(strategies, start=1):
        rows = _layout_strategy_rows(patterns, desired)
        findings: list[dict[str, Any]] = []
        missing = [room_mix for room_mix, _weight in desired if room_mix not in patterns]
        if missing:
            findings.append({"level": "review", "code": "layout_pattern_missing", "message": f"Eksik konut oruntusu: {', '.join(missing)}."})
        mix_rows = _build_layout_mix_counts(net_residential_area, rows)
        used_area = sum(item["unit_count"] * item["avg_area_m2"] for item in mix_rows)
        unit_count = sum(item["unit_count"] for item in mix_rows)
        avg_unit_area = used_area / unit_count if unit_count else None
        efficiency = (net_residential_area / gross_residential_area) * 100.0 if gross_residential_area else None
        fit_score = _score_layout_fit(net_residential_area, used_area, target_unit_count, unit_count)
        area_fit_delta = net_residential_area - used_area
        if not unit_count:
            findings.append({"level": "risk", "code": "unit_mix_empty", "message": "Daire karmasi uretilemedi; layout pattern dataseti veya alan girdisi eksik."})
        if net_residential_area and abs(area_fit_delta) / net_residential_area > 0.18:
            findings.append({"level": "review", "code": "layout_area_delta_high", "message": "Daire karmasi hedef net konut alanindan %18'den fazla sapti."})
        if fit_score < 75:
            findings.append({"level": "review", "code": "layout_fit_score_low", "message": f"Layout uyum skoru {fit_score}; mimari revizyon gerekir."})

        option_key = f"{run_key}-LAYOUT-{rank}"
        mixes = [
            {
                "unit_type": item.get("unit_type"),
                "room_mix": item.get("room_mix"),
                "unit_count": item["unit_count"],
                "avg_area_m2": _round(item["avg_area_m2"]),
                "total_area_m2": _round(item["unit_count"] * item["avg_area_m2"]),
                "pattern_key": item.get("pattern_key"),
                "pattern_role": item.get("pattern_role"),
            }
            for item in mix_rows
        ]
        options.append(
            {
                "option_key": option_key,
                "run_key": run_key,
                "project_key": project_key,
                "option_rank": rank,
                "option_name": option_name,
                "strategy_key": strategy_key,
                "target_unit_count": target_unit_count,
                "unit_count": unit_count,
                "avg_unit_area_m2": _round(avg_unit_area),
                "gross_residential_area_m2": _round(gross_residential_area),
                "net_residential_area_m2": _round(net_residential_area),
                "efficiency_percent": _round(efficiency),
                "area_fit_delta_m2": _round(area_fit_delta),
                "fit_score": fit_score,
                "review_required": any(item["level"] in {"review", "risk"} for item in findings),
                "mixes": mixes,
                "findings": findings,
                "assumptions": [
                    "Daire karmasi firma datasetindeki konut oruntulerinin ortalama alanlariyla uretilir.",
                    "Bu cikti mimari plan cizimi degil, paylasim ve teklif motorlari icin ilk program taslagidir.",
                    "Fit skoru hedef net konut alani ve envelope tahmini birim kapasitesine gore hesaplanir.",
                ],
            }
        )
    return options


def _floor_zone(
    *,
    zone_key: str,
    zone_type: str,
    label: str,
    x: float,
    y: float,
    width: float,
    height: float,
    area_m2: float | None = None,
    orientation: str | None = None,
    unit_type: str | None = None,
    room_mix: str | None = None,
    unit_index: int | None = None,
) -> dict[str, Any]:
    return {
        "zone_key": zone_key,
        "zone_type": zone_type,
        "label": label,
        "unit_type": unit_type,
        "room_mix": room_mix,
        "unit_index": unit_index,
        "area_m2": _round(area_m2),
        "x": _round(x),
        "y": _round(y),
        "width": _round(width),
        "height": _round(height),
        "orientation": orientation,
    }


def _core_circulation_zones(core_type: str, core_area: float | None, circulation_area: float | None) -> list[dict[str, Any]]:
    circulation_half = (circulation_area or 0.0) / 2.0 if circulation_area else None
    if core_type == "linear_core":
        return [
            _floor_zone(
                zone_key="core",
                zone_type="core",
                label="Cekirdek",
                x=5,
                y=31,
                width=18,
                height=38,
                area_m2=core_area,
                orientation="west",
            ),
            _floor_zone(
                zone_key="corridor-main",
                zone_type="circulation",
                label="Dolasim",
                x=24,
                y=44,
                width=70,
                height=12,
                area_m2=circulation_area,
                orientation="east-west",
            ),
        ]
    return [
        _floor_zone(
            zone_key="core",
            zone_type="core",
            label="Cekirdek",
            x=42,
            y=38,
            width=16,
            height=24,
            area_m2=core_area,
            orientation="center",
        ),
        _floor_zone(
            zone_key="corridor-vertical",
            zone_type="circulation",
            label="Dikey Dolasim",
            x=47,
            y=8,
            width=6,
            height=84,
            area_m2=circulation_half,
            orientation="north-south",
        ),
        _floor_zone(
            zone_key="corridor-horizontal",
            zone_type="circulation",
            label="Yatay Dolasim",
            x=8,
            y=47,
            width=84,
            height=6,
            area_m2=circulation_half,
            orientation="east-west",
        ),
    ]


def _unit_slots(core_type: str) -> list[dict[str, Any]]:
    if core_type == "linear_core":
        return [
            {"x": 25, "y": 8, "width": 22, "height": 32, "orientation": "north"},
            {"x": 49, "y": 8, "width": 22, "height": 32, "orientation": "north"},
            {"x": 73, "y": 8, "width": 21, "height": 32, "orientation": "north"},
            {"x": 25, "y": 60, "width": 22, "height": 32, "orientation": "south"},
            {"x": 49, "y": 60, "width": 22, "height": 32, "orientation": "south"},
            {"x": 73, "y": 60, "width": 21, "height": 32, "orientation": "south"},
            {"x": 5, "y": 8, "width": 18, "height": 20, "orientation": "north-west"},
            {"x": 5, "y": 72, "width": 18, "height": 20, "orientation": "south-west"},
        ]
    return [
        {"x": 5, "y": 7, "width": 34, "height": 28, "orientation": "north-west"},
        {"x": 61, "y": 7, "width": 34, "height": 28, "orientation": "north-east"},
        {"x": 61, "y": 65, "width": 34, "height": 28, "orientation": "south-east"},
        {"x": 5, "y": 65, "width": 34, "height": 28, "orientation": "south-west"},
        {"x": 5, "y": 38, "width": 30, "height": 24, "orientation": "west"},
        {"x": 65, "y": 38, "width": 30, "height": 24, "orientation": "east"},
        {"x": 40, "y": 7, "width": 20, "height": 24, "orientation": "north"},
        {"x": 40, "y": 69, "width": 20, "height": 24, "orientation": "south"},
    ]


def _typical_floor_units(layout_option: dict[str, Any], floor_count: int, target_count: int) -> list[dict[str, Any]]:
    mixes = [item for item in layout_option.get("mixes", []) or [] if (_int(item.get("unit_count")) or 0) > 0]
    if not mixes or target_count <= 0:
        return []
    floor_count = max(1, floor_count)
    expanded: list[dict[str, Any]] = []
    for mix in sorted(mixes, key=lambda item: _num(item.get("total_area_m2")) or 0.0, reverse=True):
        total_count = _int(mix.get("unit_count")) or 0
        per_floor = int(round(total_count / floor_count))
        if total_count > 0 and per_floor == 0:
            per_floor = 1
        expanded.extend([mix] * per_floor)
    fallback = max(mixes, key=lambda item: _int(item.get("unit_count")) or 0)
    while len(expanded) < target_count:
        expanded.append(fallback)
    return expanded[:target_count]


def build_floor_plan_options(
    run_key: str,
    project_key: str,
    envelope: dict[str, Any],
    core: dict[str, Any],
    layout_options: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    floor_count = _int(core.get("floor_count")) or _int(envelope.get("estimated_floor_count")) or 1
    core_type = core.get("core_type") or "unknown_core"
    gross_floor_area = _num(core.get("gross_floor_area_m2")) or _num(envelope.get("typical_floor_area_m2"))
    net_floor_area = _num(core.get("net_floor_area_m2"))
    core_area = _num(core.get("core_area_m2"))
    circulation_area = _num(core.get("circulation_area_m2"))
    wet_score = _num(core.get("wet_core_alignment_score")) or 60.0
    options: list[dict[str, Any]] = []

    for rank, layout in enumerate(layout_options, start=1):
        findings: list[dict[str, Any]] = []
        total_units = _int(layout.get("unit_count")) or 0
        units_per_floor = math.ceil(total_units / max(1, floor_count)) if total_units else 0
        slots = _unit_slots(core_type)
        drawn_unit_count = min(units_per_floor, len(slots))
        if units_per_floor > len(slots):
            findings.append(
                {
                    "level": "review",
                    "severity": "review",
                    "code": "units_per_floor_above_slot_capacity",
                    "message": f"Tipik katta {units_per_floor} birim hedefi var; prototip plan {len(slots)} zon gosterir.",
                    "recommendation": "Kat dagilimini azaltin veya ikinci cekirdek/koridor varyanti uretin.",
                }
            )
        if core_type == "unknown_core":
            findings.append(
                {
                    "level": "risk",
                    "severity": "risk",
                    "code": "core_type_unknown",
                    "message": "Cekirdek tipi bilinmeden kat plan semasi kesinlesemez.",
                    "recommendation": "Core placement girdilerini kontrol edin.",
                }
            )
        if not gross_floor_area:
            findings.append(
                {
                    "level": "risk",
                    "severity": "risk",
                    "code": "gross_floor_area_missing",
                    "message": "Brut tipik kat alani yok; plan verimliligi hesaplanamadi.",
                    "recommendation": "Yapilasma zarfi sonucunu yeniden uretin.",
                }
            )

        target_residential_area = None
        layout_net_area = _num(layout.get("net_residential_area_m2"))
        if layout_net_area:
            target_residential_area = layout_net_area / max(1, floor_count)
        if target_residential_area and net_floor_area:
            residential_area = min(target_residential_area, net_floor_area)
        else:
            residential_area = target_residential_area or net_floor_area

        efficiency = (residential_area / gross_floor_area * 100.0) if residential_area and gross_floor_area else None
        if efficiency is not None and efficiency < 68.0:
            findings.append(
                {
                    "level": "review",
                    "severity": "review",
                    "code": "floor_plan_efficiency_low",
                    "message": f"Kat plan verimliligi %{efficiency:.1f}; dolasim/cekirdek kontrolu gerekir.",
                    "recommendation": "Cekirdek alani ve koridor uzunlugunu mimari ofisle kontrol edin.",
                }
            )

        daylight_score = 92.0 - max(0, units_per_floor - 4) * 5.0
        if core_type == "linear_core":
            daylight_score += 4.0
        elif core_type == "central_core":
            daylight_score -= 2.0
        daylight_score = _clamp(daylight_score, 55.0, 96.0)

        constructability_score = 90.0 if units_per_floor <= 4 else 82.0 if units_per_floor <= 6 else 74.0
        if core_type == "central_core":
            constructability_score += 3.0
        elif core_type == "linear_core":
            constructability_score -= 2.0
        constructability_score = _clamp(constructability_score, 55.0, 96.0)

        layout_fit = _num(layout.get("fit_score")) or 0.0
        fit_score = (
            (layout_fit * 0.42)
            + (daylight_score * 0.28)
            + (constructability_score * 0.20)
            + (wet_score * 0.10)
        )
        if fit_score < 72.0:
            findings.append(
                {
                    "level": "review",
                    "severity": "review",
                    "code": "floor_plan_fit_low",
                    "message": f"Kat plan fit skoru {fit_score:.1f}; alternatif plan gerekir.",
                    "recommendation": "Daire karmasi ve cekirdek tipini yeniden deneyin.",
                }
            )

        plan_key = f"{run_key}-FLOOR-{rank}"
        zones = _core_circulation_zones(core_type, core_area, circulation_area)
        unit_sequence = _typical_floor_units(layout, floor_count, drawn_unit_count)
        for index, mix in enumerate(unit_sequence, start=1):
            slot = slots[index - 1]
            zones.append(
                _floor_zone(
                    zone_key=f"unit-{index}",
                    zone_type="unit",
                    label=f"{mix.get('room_mix') or 'Daire'}-{index}",
                    unit_type=mix.get("unit_type"),
                    room_mix=mix.get("room_mix"),
                    unit_index=index,
                    area_m2=_num(mix.get("avg_area_m2")),
                    **slot,
                )
            )

        options.append(
            {
                "plan_key": plan_key,
                "run_key": run_key,
                "project_key": project_key,
                "layout_option_key": layout.get("option_key"),
                "plan_rank": rank,
                "plan_name": f"{layout.get('option_name') or 'Layout'} Kat Plan",
                "plan_type": core_type,
                "floor_label": "Tipik Kat",
                "floor_count": floor_count,
                "units_per_floor": units_per_floor,
                "gross_floor_area_m2": _round(gross_floor_area),
                "net_floor_area_m2": _round(net_floor_area),
                "core_area_m2": _round(core_area),
                "circulation_area_m2": _round(circulation_area),
                "residential_area_m2": _round(residential_area),
                "efficiency_percent": _round(efficiency),
                "wet_core_alignment_score": _round(wet_score),
                "daylight_score": _round(daylight_score),
                "constructability_score": _round(constructability_score),
                "fit_score": _round(fit_score),
                "review_required": any(item.get("level") in {"review", "risk"} for item in findings),
                "zones": zones,
                "findings": findings,
                "assumptions": [
                    "Kat plan sistemi tipik kat icin sematik zon uretir; uygulama projesi yerine teklif oncesi kontrol girdisidir.",
                    "Daire zonlari unit layout karmasindan tipik kata dagitilir.",
                    "Koordinatlar yuzdelik plan kanvasi uzerindedir ve UI tarafinda cizime donusur.",
                ],
            }
        )
    return options


def _median(values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2.0


def _company_sharing_stats(conn: sqlite3.Connection) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT contractor_share_percent, pattern_key
        FROM company_sharing_patterns
        WHERE contractor_share_percent IS NOT NULL
          AND total_units > 0
          AND pattern_status = 'explicit_owner_contractor_distribution'
        ORDER BY contractor_share_percent
        """
    ).fetchall()
    shares = [_num(row["contractor_share_percent"]) for row in rows]
    shares = [share for share in shares if share is not None]
    median_share = _median(shares) or 40.0
    avg_share = sum(shares) / len(shares) if shares else median_share
    return {
        "explicit_pattern_count": len(shares),
        "median_contractor_share_percent": _round(median_share),
        "avg_contractor_share_percent": _round(avg_share),
        "min_contractor_share_percent": _round(min(shares) if shares else median_share),
        "max_contractor_share_percent": _round(max(shares) if shares else median_share),
    }


def _project_sharing_context(conn: sqlite3.Connection, project_key: str) -> dict[str, Any]:
    project = _row_dict(conn.execute("SELECT * FROM input_projects WHERE project_key = ?", (project_key,)).fetchone())
    parcel_key = project.get("parcel_key")
    existing = conn.execute(
        """
        SELECT COUNT(*) AS count,
               SUM(existing_gross_m2) AS existing_gross_m2,
               SUM(existing_net_m2) AS existing_net_m2
        FROM existing_area_inputs
        WHERE project_key = ?
        """,
        (project_key,),
    ).fetchone()
    proposal = None
    example = None
    cad_plan = None
    if parcel_key:
        proposal = conn.execute(
            """
            SELECT existing_independent_units, owner_units_total, contractor_units_total
            FROM proposal_v2_records
            WHERE parcel_key = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (parcel_key,),
        ).fetchone()
        example = conn.execute(
            """
            SELECT cad_unit_primary_count, offer_total_units, owner_units_total,
                   contractor_units_total, old_area_m2, cad_area_m2
            FROM company_project_examples
            WHERE parcel_key = ?
            LIMIT 1
            """,
            (parcel_key,),
        ).fetchone()
        cad_plan = conn.execute(
            """
            SELECT offer_total_units, offer_owner_units, offer_contractor_units, primary_candidate_count
            FROM cad_unit_plans
            WHERE parcel_key = ?
            ORDER BY id DESC
            LIMIT 1
            """,
            (parcel_key,),
        ).fetchone()

    source_pattern = None
    missing_pattern = None
    if parcel_key:
        source_pattern = conn.execute(
            """
            SELECT *
            FROM company_sharing_patterns
            WHERE parcel_key = ?
              AND contractor_share_percent IS NOT NULL
              AND total_units > 0
            ORDER BY confidence_score DESC, risk_score, pattern_key
            LIMIT 1
            """,
            (parcel_key,),
        ).fetchone()
        missing_pattern = conn.execute(
            """
            SELECT *
            FROM company_sharing_patterns
            WHERE parcel_key = ?
            ORDER BY confidence_score DESC, risk_score, pattern_key
            LIMIT 1
            """,
            (parcel_key,),
        ).fetchone()

    proposal_dict = _row_dict(proposal)
    example_dict = _row_dict(example)
    cad_dict = _row_dict(cad_plan)
    source_pattern_dict = _row_dict(source_pattern)
    missing_pattern_dict = _row_dict(missing_pattern)

    existing_area = _num(existing["existing_gross_m2"] if existing else None)
    if not existing_area:
        existing_area = _num(example_dict.get("old_area_m2")) or _num(existing["existing_net_m2"] if existing else None)

    existing_unit_count = (
        _int(proposal_dict.get("existing_independent_units"))
        or _int(example_dict.get("offer_total_units"))
        or _int(cad_dict.get("offer_total_units"))
        or _int(cad_dict.get("primary_candidate_count"))
        or _int(existing["count"] if existing else None)
    )
    return {
        "project": project,
        "parcel_key": parcel_key,
        "existing_area_m2": _round(existing_area),
        "existing_net_area_m2": _round(_num(existing["existing_net_m2"] if existing else None)),
        "existing_unit_count": existing_unit_count,
        "proposal": proposal_dict,
        "company_example": example_dict,
        "cad_plan": cad_dict,
        "source_pattern": source_pattern_dict,
        "parcel_pattern": missing_pattern_dict,
    }


def _sharing_strategy_targets(stats: dict[str, Any], context: dict[str, Any]) -> list[dict[str, Any]]:
    source_pattern = context.get("source_pattern") or {}
    source_share = _num(source_pattern.get("contractor_share_percent"))
    median_share = _num(stats.get("median_contractor_share_percent")) or 40.0
    base_share = source_share if source_share is not None else median_share
    source_pattern_key = source_pattern.get("pattern_key") if source_share is not None else None
    source_label = "parcel_pattern" if source_pattern_key else "company_median"
    return [
        {
            "strategy_key": "dataset_pattern",
            "option_name": "Dataset paylasim oruntusu",
            "target_share": base_share,
            "source_pattern_key": source_pattern_key,
            "source_label": source_label,
        },
        {
            "strategy_key": "owner_protection",
            "option_name": "Mal sahibi korumali senaryo",
            "target_share": max(12.0, base_share - 8.0),
            "source_pattern_key": source_pattern_key,
            "source_label": source_label,
        },
        {
            "strategy_key": "contractor_feasibility",
            "option_name": "Muteahhit fizibilite senaryosu",
            "target_share": min(65.0, base_share + 8.0),
            "source_pattern_key": source_pattern_key,
            "source_label": source_label,
        },
    ]


def _sharing_allocations(option: dict[str, Any], contractor_units: int) -> list[dict[str, Any]]:
    mixes = list(option.get("mixes") or [])
    contractor_remaining = max(0, contractor_units)
    contractor_counts: dict[str, int] = {}
    for mix in sorted(mixes, key=lambda item: (_num(item.get("avg_area_m2")) or 9999.0, item.get("room_mix") or "")):
        count = _int(mix.get("unit_count")) or 0
        take = min(count, contractor_remaining)
        contractor_counts[mix.get("room_mix") or "unknown"] = take
        contractor_remaining -= take

    allocations: list[dict[str, Any]] = []
    for mix in mixes:
        room_mix = mix.get("room_mix") or "unknown"
        total_count = _int(mix.get("unit_count")) or 0
        avg_area = _num(mix.get("avg_area_m2")) or 0.0
        contractor_count = contractor_counts.get(room_mix, 0)
        owner_count = max(0, total_count - contractor_count)
        for role, count in [("owner", owner_count), ("contractor", contractor_count)]:
            allocations.append(
                {
                    "role": role,
                    "room_mix": mix.get("room_mix"),
                    "unit_type": mix.get("unit_type"),
                    "unit_count": count,
                    "avg_area_m2": _round(avg_area),
                    "total_area_m2": _round(count * avg_area),
                }
            )
    return allocations


def _score_sharing_option(
    *,
    target_share: float,
    actual_share: float,
    owner_units: int,
    contractor_units: int,
    total_units: int,
    owner_area: float,
    existing_area: float | None,
    existing_unit_count: int | None,
    layout_fit_score: float,
    median_share: float,
    has_parcel_pattern: bool,
    source_risk_level: str | None,
) -> tuple[float, float, float, list[dict[str, Any]]]:
    findings: list[dict[str, Any]] = []
    share_penalty = abs(actual_share - target_share) * 0.6
    owner_area_delta = owner_area - existing_area if existing_area else None
    area_penalty = 0.0
    if existing_area and owner_area_delta is not None and owner_area_delta < 0:
        area_gap_ratio = abs(owner_area_delta) / existing_area
        area_penalty = min(45.0, area_gap_ratio * 70.0)
        if area_gap_ratio > 0.10:
            findings.append(
                {
                    "level": "review",
                    "code": "owner_area_gap",
                    "message": "Mal sahibi yeni alan tahmini mevcut alandan %10'dan fazla dusuk.",
                }
            )
    if existing_unit_count and owner_units < existing_unit_count:
        findings.append(
            {
                "level": "review",
                "code": "owner_units_below_existing",
                "message": f"Mal sahibi birim adedi {owner_units}; mevcut/tahmini birim sayisi {existing_unit_count}.",
            }
        )
        area_penalty += min(20.0, (existing_unit_count - owner_units) * 3.0)
    if not has_parcel_pattern:
        findings.append(
            {
                "level": "review",
                "code": "parcel_sharing_pattern_missing",
                "message": "Bu parsel icin acik mal sahibi/muteahhit paylasim oruntusu yok; firma median payi kullanildi.",
            }
        )
    if source_risk_level in {"blocking", "high"}:
        findings.append(
            {
                "level": "review",
                "code": "source_pattern_risky",
                "message": f"Kaynak paylasim oruntusu risk seviyesi {source_risk_level}.",
            }
        )

    fairness_score = _clamp(100.0 - share_penalty - area_penalty, 0.0, 100.0)
    feasibility_score = _clamp(100.0 - abs(actual_share - median_share) * 0.55, 0.0, 100.0)
    if contractor_units < 2 and total_units >= 8:
        feasibility_score = max(0.0, feasibility_score - 15.0)
        findings.append({"level": "review", "code": "contractor_units_low", "message": "Muteahhit birim adedi fizibilite icin dusuk olabilir."})
    offer_ready_score = _clamp((fairness_score * 0.42) + (feasibility_score * 0.34) + (layout_fit_score * 0.24), 0.0, 100.0)
    if offer_ready_score < 70:
        findings.append({"level": "review", "code": "offer_ready_score_low", "message": f"Teklif hazirlik skoru {offer_ready_score:.1f}; manuel kontrol gerekir."})
    return _round(fairness_score) or 0.0, _round(feasibility_score) or 0.0, _round(offer_ready_score) or 0.0, findings


def build_sharing_payment_options(
    conn: sqlite3.Connection,
    run_key: str,
    project_key: str,
    layout_options: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    if not layout_options:
        return [], {}
    stats = _company_sharing_stats(conn)
    context = _project_sharing_context(conn, project_key)
    best_layout = max(layout_options, key=lambda item: item.get("fit_score") or 0)
    total_units = _int(best_layout.get("unit_count")) or 0
    target_rows = _sharing_strategy_targets(stats, context)
    existing_area = _num(context.get("existing_area_m2"))
    existing_unit_count = _int(context.get("existing_unit_count"))
    median_share = _num(stats.get("median_contractor_share_percent")) or 40.0
    source_pattern = context.get("source_pattern") or {}
    parcel_pattern = context.get("parcel_pattern") or {}
    has_parcel_pattern = bool(source_pattern.get("pattern_key"))
    source_risk_level = source_pattern.get("risk_level") or parcel_pattern.get("risk_level")

    options: list[dict[str, Any]] = []
    for rank, strategy in enumerate(target_rows, start=1):
        target_share = _clamp(_num(strategy.get("target_share")) or median_share, 0.0, 80.0)
        contractor_units = int(round(total_units * target_share / 100.0)) if total_units else 0
        if target_share > 0 and total_units >= 6:
            contractor_units = max(1, contractor_units)
        contractor_units = min(total_units, contractor_units)
        owner_units = max(0, total_units - contractor_units)
        actual_share = (contractor_units / total_units * 100.0) if total_units else 0.0
        owner_share = 100.0 - actual_share if total_units else 0.0
        allocations = _sharing_allocations(best_layout, contractor_units)
        owner_area = sum(_num(item.get("total_area_m2")) or 0.0 for item in allocations if item.get("role") == "owner")
        contractor_area = sum(_num(item.get("total_area_m2")) or 0.0 for item in allocations if item.get("role") == "contractor")
        owner_area_delta = owner_area - existing_area if existing_area else None
        participation_payment = max(0.0, owner_area_delta or 0.0) * PROTOTYPE_PARTICIPATION_RATE_M2
        fairness, feasibility, offer_ready, findings = _score_sharing_option(
            target_share=target_share,
            actual_share=actual_share,
            owner_units=owner_units,
            contractor_units=contractor_units,
            total_units=total_units,
            owner_area=owner_area,
            existing_area=existing_area,
            existing_unit_count=existing_unit_count,
            layout_fit_score=_num(best_layout.get("fit_score")) or 0.0,
            median_share=median_share,
            has_parcel_pattern=has_parcel_pattern,
            source_risk_level=source_risk_level,
        )
        if participation_payment > 0:
            findings.append(
                {
                    "level": "review",
                    "code": "participation_payment_requires_valuation",
                    "message": "Katilim payi tutari prototip m2 katsayisi ile hesaplandi; ekspertiz/birim fiyat girisi gerekir.",
                }
            )
        sharing_key = f"{run_key}-SHARE-{rank}"
        option = {
            "sharing_key": sharing_key,
            "run_key": run_key,
            "project_key": project_key,
            "layout_option_key": best_layout.get("option_key"),
            "sharing_rank": rank,
            "strategy_key": strategy.get("strategy_key"),
            "option_name": strategy.get("option_name"),
            "source_pattern_key": strategy.get("source_pattern_key"),
            "source_label": strategy.get("source_label"),
            "target_contractor_share_percent": _round(target_share),
            "owner_units": owner_units,
            "contractor_units": contractor_units,
            "total_units": total_units,
            "owner_share_percent": _round(owner_share),
            "contractor_share_percent": _round(actual_share),
            "owner_area_m2": _round(owner_area),
            "contractor_area_m2": _round(contractor_area),
            "existing_area_m2": _round(existing_area),
            "existing_unit_count": existing_unit_count,
            "owner_area_delta_m2": _round(owner_area_delta),
            "participation_payment_estimate": _round(participation_payment),
            "participation_payment_rate_m2": PROTOTYPE_PARTICIPATION_RATE_M2,
            "participation_currency": PROTOTYPE_PARTICIPATION_CURRENCY,
            "fairness_score": fairness,
            "feasibility_score": feasibility,
            "offer_ready_score": offer_ready,
            "review_required": any(item["level"] in {"review", "risk"} for item in findings),
            "allocations": allocations,
            "findings": findings,
            "context": {
                "sharing_stats": stats,
                "parcel_key": context.get("parcel_key"),
                "source_pattern_status": (context.get("parcel_pattern") or {}).get("pattern_status"),
                "source_risk_level": source_risk_level,
            },
            "assumptions": [
                "Asama 12 prototipi en yuksek fit skoruna sahip unit layout uzerinden paylasim adaylari uretir.",
                "Paylasim yuzdesi varsa parselin eski teklif oruntusunden, yoksa firma median muteahhit payindan turetilir.",
                "Katilim payi tutari gecici prototip m2 katsayisi ile hesaplanir; nihai teklif icin ekspertiz gerekir.",
            ],
        }
        options.append(option)

    best_sharing = max(options, key=lambda item: item.get("offer_ready_score") or 0, default={})
    package = {}
    if best_sharing:
        package = {
            "package_key": f"{run_key}-OFFER-PACKAGE",
            "run_key": run_key,
            "project_key": project_key,
            "sharing_key": best_sharing.get("sharing_key"),
            "layout_option_key": best_sharing.get("layout_option_key"),
            "package_status": "review_required" if best_sharing.get("review_required") else "draft_ready",
            "offer_ready_score": best_sharing.get("offer_ready_score"),
            "review_required": best_sharing.get("review_required"),
            "package": {
                "project_key": project_key,
                "run_key": run_key,
                "engine_version": ENGINE_VERSION,
                "layout": {
                    "layout_option_key": best_layout.get("option_key"),
                    "option_name": best_layout.get("option_name"),
                    "unit_count": best_layout.get("unit_count"),
                    "fit_score": best_layout.get("fit_score"),
                },
                "sharing": {
                    "sharing_key": best_sharing.get("sharing_key"),
                    "strategy_key": best_sharing.get("strategy_key"),
                    "owner_units": best_sharing.get("owner_units"),
                    "contractor_units": best_sharing.get("contractor_units"),
                    "contractor_share_percent": best_sharing.get("contractor_share_percent"),
                    "owner_area_m2": best_sharing.get("owner_area_m2"),
                    "contractor_area_m2": best_sharing.get("contractor_area_m2"),
                    "owner_area_delta_m2": best_sharing.get("owner_area_delta_m2"),
                },
                "participation_payment": {
                    "estimate": best_sharing.get("participation_payment_estimate"),
                    "rate_m2": best_sharing.get("participation_payment_rate_m2"),
                    "currency": best_sharing.get("participation_currency"),
                },
                "allocations": best_sharing.get("allocations") or [],
                "review_findings": best_sharing.get("findings") or [],
                "renderer_targets": ["share_table", "review_summary", "proposal_pdf"],
            },
        }
    return options, package


def _insert_engine_step(
    conn: sqlite3.Connection,
    *,
    run_key: str,
    module_key: str,
    sequence_no: int,
    status: str,
    now: str,
    input_data: dict[str, Any] | None = None,
    output_data: dict[str, Any] | None = None,
    findings: list[dict[str, Any]] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO engine_run_steps (
            run_key, module_key, sequence_no, status, started_at, completed_at,
            input_json, output_json, findings_json, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            run_key,
            module_key,
            sequence_no,
            status,
            now,
            now if status not in {"pending", "waiting_for_input"} else None,
            json_dump(input_data or {}),
            json_dump(output_data or {}),
            json_dump(findings or []),
            json_dump({"module_key": module_key, "status": status}),
        ),
    )


def run_engine_for_project(
    conn: sqlite3.Connection,
    project_key: str,
    *,
    triggered_by: str = "system",
    now: str | None = None,
    run_key: str | None = None,
) -> dict[str, Any]:
    now = now or datetime.now().isoformat(timespec="seconds")
    project = conn.execute("SELECT * FROM input_projects WHERE project_key = ?", (project_key,)).fetchone()
    if not project:
        raise ValueError("input_project_not_found")
    ensure_floor_plan_module(conn)
    modules = conn.execute("SELECT * FROM automation_engine_modules ORDER BY sequence_no, module_key").fetchall()
    if not modules:
        raise ValueError("automation_modules_missing")

    run_key = run_key or f"RUN-{project_key}-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid4().hex[:6]}"
    conn.execute(
        """
        INSERT INTO engine_runs (
            run_key, project_key, status, engine_version, started_at,
            completed_at, triggered_by, result_summary_json, raw_json
        ) VALUES (?, ?, 'running', ?, ?, NULL, ?, '{}', '{}')
        """,
        (run_key, project_key, ENGINE_VERSION, now, triggered_by),
    )

    zoning = _row_dict(conn.execute("SELECT * FROM zoning_inputs WHERE project_key = ?", (project_key,)).fetchone())
    existing_count = conn.execute("SELECT COUNT(*) FROM existing_area_inputs WHERE project_key = ?", (project_key,)).fetchone()[0]
    envelope = build_building_envelope(conn, project_key)
    core = build_core_placement(run_key, project_key, envelope)
    layout_options = build_unit_layout_options(conn, run_key, project_key, envelope, core)
    floor_plan_options = build_floor_plan_options(run_key, project_key, envelope, core, layout_options)
    sharing_options, offer_package = build_sharing_payment_options(conn, run_key, project_key, layout_options)

    for module in modules:
        module_key = module["module_key"]
        if module_key == "input_model":
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="completed",
                now=now,
                input_data={"project_key": project_key},
                output_data={"project": _row_dict(project), "zoning_input": zoning, "existing_area_count": existing_count},
            )
        elif module_key == "regulation_engine":
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="review_required",
                now=now,
                input_data={"zoning_input": zoning},
                output_data={"rule_check_mode": "placeholder", "validated_rules": []},
                findings=[item for item in envelope["findings"] if item["code"].startswith("missing_")],
            )
        elif module_key == "building_envelope":
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="completed",
                now=now,
                input_data={"zoning_input": zoning},
                output_data=envelope,
                findings=envelope["findings"],
            )
            conn.execute(
                """
                INSERT INTO building_envelope_results (
                    run_key, project_key, parcel_area_m2, taks_footprint_m2,
                    setback_footprint_m2, buildable_footprint_m2,
                    total_construction_area_m2, typical_floor_area_m2,
                    estimated_floor_count, residential_efficiency_percent,
                    estimated_residential_area_m2, avg_residential_unit_m2,
                    estimated_unit_capacity, parking_need_estimate,
                    review_required, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_key,
                    project_key,
                    envelope.get("parcel_area_m2"),
                    envelope.get("taks_footprint_m2"),
                    envelope.get("setback_footprint_m2"),
                    envelope.get("buildable_footprint_m2"),
                    envelope.get("total_construction_area_m2"),
                    envelope.get("typical_floor_area_m2"),
                    envelope.get("estimated_floor_count"),
                    envelope.get("residential_efficiency_percent"),
                    envelope.get("estimated_residential_area_m2"),
                    envelope.get("avg_residential_unit_m2"),
                    envelope.get("estimated_unit_capacity"),
                    envelope.get("parking_need_estimate"),
                    1 if envelope.get("review_required") else 0,
                    json_dump(envelope),
                ),
            )
        elif module_key == "core_placement":
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="review_required" if core.get("review_required") else "completed",
                now=now,
                input_data={"building_envelope": envelope},
                output_data=core,
                findings=core["findings"],
            )
            conn.execute(
                """
                INSERT INTO core_placement_results (
                    run_key, project_key, core_type, core_area_m2,
                    circulation_area_m2, net_floor_area_m2, gross_floor_area_m2,
                    floor_count, core_efficiency_percent, wet_core_alignment_score,
                    review_required, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_key,
                    project_key,
                    core.get("core_type"),
                    core.get("core_area_m2"),
                    core.get("circulation_area_m2"),
                    core.get("net_floor_area_m2"),
                    core.get("gross_floor_area_m2"),
                    core.get("floor_count"),
                    core.get("core_efficiency_percent"),
                    core.get("wet_core_alignment_score"),
                    1 if core.get("review_required") else 0,
                    json_dump(core),
                ),
            )
        elif module_key == "unit_layout":
            layout_findings: list[dict[str, Any]] = []
            for option in layout_options:
                for finding in option.get("findings", []):
                    layout_findings.append({**finding, "option_key": option.get("option_key")})
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="review_required" if any(option.get("review_required") for option in layout_options) else "completed",
                now=now,
                input_data={"building_envelope": envelope, "core_placement": core},
                output_data={"options": layout_options},
                findings=layout_findings,
            )
            for option in layout_options:
                conn.execute(
                    """
                    INSERT INTO unit_layout_options (
                        option_key, run_key, project_key, option_rank, option_name,
                        strategy_key, target_unit_count, unit_count, avg_unit_area_m2,
                        gross_residential_area_m2, net_residential_area_m2,
                        efficiency_percent, area_fit_delta_m2, fit_score,
                        review_required, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        option.get("option_key"),
                        run_key,
                        project_key,
                        option.get("option_rank"),
                        option.get("option_name"),
                        option.get("strategy_key"),
                        option.get("target_unit_count"),
                        option.get("unit_count"),
                        option.get("avg_unit_area_m2"),
                        option.get("gross_residential_area_m2"),
                        option.get("net_residential_area_m2"),
                        option.get("efficiency_percent"),
                        option.get("area_fit_delta_m2"),
                        option.get("fit_score"),
                        1 if option.get("review_required") else 0,
                        json_dump(option),
                    ),
                )
                for mix in option.get("mixes", []):
                    conn.execute(
                        """
                        INSERT INTO unit_mix_options (
                            option_key, run_key, project_key, unit_type, room_mix,
                            unit_count, avg_area_m2, total_area_m2, pattern_key,
                            pattern_role, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            option.get("option_key"),
                            run_key,
                            project_key,
                            mix.get("unit_type"),
                            mix.get("room_mix"),
                            mix.get("unit_count"),
                            mix.get("avg_area_m2"),
                            mix.get("total_area_m2"),
                            mix.get("pattern_key"),
                            mix.get("pattern_role"),
                            json_dump(mix),
                        ),
                    )
        elif module_key == "floor_plan":
            floor_findings: list[dict[str, Any]] = []
            for option in floor_plan_options:
                for finding in option.get("findings", []):
                    floor_findings.append({**finding, "plan_key": option.get("plan_key")})
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="review_required" if any(option.get("review_required") for option in floor_plan_options) else "completed",
                now=now,
                input_data={"core_placement": core, "unit_layout_options": layout_options},
                output_data={"floor_plan_options": floor_plan_options},
                findings=floor_findings,
            )
            for option in floor_plan_options:
                conn.execute(
                    """
                    INSERT INTO floor_plan_options (
                        plan_key, run_key, project_key, layout_option_key,
                        plan_rank, plan_name, plan_type, floor_label, floor_count,
                        units_per_floor, gross_floor_area_m2, net_floor_area_m2,
                        core_area_m2, circulation_area_m2, residential_area_m2,
                        efficiency_percent, wet_core_alignment_score, daylight_score,
                        constructability_score, fit_score, review_required, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        option.get("plan_key"),
                        run_key,
                        project_key,
                        option.get("layout_option_key"),
                        option.get("plan_rank"),
                        option.get("plan_name"),
                        option.get("plan_type"),
                        option.get("floor_label"),
                        option.get("floor_count"),
                        option.get("units_per_floor"),
                        option.get("gross_floor_area_m2"),
                        option.get("net_floor_area_m2"),
                        option.get("core_area_m2"),
                        option.get("circulation_area_m2"),
                        option.get("residential_area_m2"),
                        option.get("efficiency_percent"),
                        option.get("wet_core_alignment_score"),
                        option.get("daylight_score"),
                        option.get("constructability_score"),
                        option.get("fit_score"),
                        1 if option.get("review_required") else 0,
                        json_dump(option),
                    ),
                )
                for zone in option.get("zones", []):
                    conn.execute(
                        """
                        INSERT INTO floor_plan_zones (
                            plan_key, run_key, project_key, zone_key, zone_type,
                            label, unit_type, room_mix, unit_index, area_m2,
                            x, y, width, height, orientation, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            option.get("plan_key"),
                            run_key,
                            project_key,
                            zone.get("zone_key"),
                            zone.get("zone_type"),
                            zone.get("label"),
                            zone.get("unit_type"),
                            zone.get("room_mix"),
                            zone.get("unit_index"),
                            zone.get("area_m2"),
                            zone.get("x"),
                            zone.get("y"),
                            zone.get("width"),
                            zone.get("height"),
                            zone.get("orientation"),
                            json_dump(zone),
                        ),
                    )
                for finding in option.get("findings", []):
                    conn.execute(
                        """
                        INSERT INTO floor_plan_findings (
                            plan_key, run_key, project_key, severity, code,
                            message, recommendation, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            option.get("plan_key"),
                            run_key,
                            project_key,
                            finding.get("severity") or finding.get("level") or "info",
                            finding.get("code"),
                            finding.get("message"),
                            finding.get("recommendation"),
                            json_dump(finding),
                        ),
                    )
        elif module_key == "sharing_payment":
            sharing_findings: list[dict[str, Any]] = []
            for option in sharing_options:
                for finding in option.get("findings", []):
                    sharing_findings.append({**finding, "sharing_key": option.get("sharing_key")})
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status="review_required" if any(option.get("review_required") for option in sharing_options) else "completed",
                now=now,
                input_data={"unit_layout_options": layout_options},
                output_data={"sharing_options": sharing_options, "offer_data_package": offer_package},
                findings=sharing_findings,
            )
            for option in sharing_options:
                conn.execute(
                    """
                    INSERT INTO sharing_payment_options (
                        sharing_key, run_key, project_key, layout_option_key,
                        sharing_rank, strategy_key, option_name, source_pattern_key,
                        target_contractor_share_percent, owner_units, contractor_units,
                        total_units, owner_share_percent, contractor_share_percent,
                        owner_area_m2, contractor_area_m2, existing_area_m2,
                        existing_unit_count, owner_area_delta_m2,
                        participation_payment_estimate, participation_payment_rate_m2,
                        participation_currency, fairness_score, feasibility_score,
                        offer_ready_score, review_required, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        option.get("sharing_key"),
                        run_key,
                        project_key,
                        option.get("layout_option_key"),
                        option.get("sharing_rank"),
                        option.get("strategy_key"),
                        option.get("option_name"),
                        option.get("source_pattern_key"),
                        option.get("target_contractor_share_percent"),
                        option.get("owner_units"),
                        option.get("contractor_units"),
                        option.get("total_units"),
                        option.get("owner_share_percent"),
                        option.get("contractor_share_percent"),
                        option.get("owner_area_m2"),
                        option.get("contractor_area_m2"),
                        option.get("existing_area_m2"),
                        option.get("existing_unit_count"),
                        option.get("owner_area_delta_m2"),
                        option.get("participation_payment_estimate"),
                        option.get("participation_payment_rate_m2"),
                        option.get("participation_currency"),
                        option.get("fairness_score"),
                        option.get("feasibility_score"),
                        option.get("offer_ready_score"),
                        1 if option.get("review_required") else 0,
                        json_dump(option),
                    ),
                )
                for allocation in option.get("allocations", []):
                    conn.execute(
                        """
                        INSERT INTO sharing_unit_allocations (
                            sharing_key, run_key, project_key, layout_option_key,
                            role, room_mix, unit_type, unit_count, avg_area_m2,
                            total_area_m2, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            option.get("sharing_key"),
                            run_key,
                            project_key,
                            option.get("layout_option_key"),
                            allocation.get("role"),
                            allocation.get("room_mix"),
                            allocation.get("unit_type"),
                            allocation.get("unit_count"),
                            allocation.get("avg_area_m2"),
                            allocation.get("total_area_m2"),
                            json_dump(allocation),
                        ),
                    )
            if offer_package:
                conn.execute(
                    """
                    INSERT INTO offer_data_packages (
                        package_key, run_key, project_key, sharing_key,
                        layout_option_key, package_status, offer_ready_score,
                        review_required, package_json, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        offer_package.get("package_key"),
                        run_key,
                        project_key,
                        offer_package.get("sharing_key"),
                        offer_package.get("layout_option_key"),
                        offer_package.get("package_status"),
                        offer_package.get("offer_ready_score"),
                        1 if offer_package.get("review_required") else 0,
                        json_dump(offer_package.get("package") or {}),
                        json_dump(offer_package),
                    ),
                )
        else:
            status = "waiting_for_input" if module["status"] == "dataset_ready" else "pending"
            dependency = ["offer_data_package"] if module_key in {"offer_renderer", "validation_review"} else ["building_envelope"]
            _insert_engine_step(
                conn,
                run_key=run_key,
                module_key=module_key,
                sequence_no=module["sequence_no"],
                status=status,
                now=now,
                input_data={"depends_on": dependency},
                output_data={"next_stage": module_key},
                findings=[{"level": "info", "code": "future_stage", "message": "Bu modul Asama 12 kapsaminda henuz calistirilmadi."}],
            )

    best_layout = max(layout_options, key=lambda item: item.get("fit_score") or 0, default={})
    best_sharing = max(sharing_options, key=lambda item: item.get("offer_ready_score") or 0, default={})
    summary = {
        "project_key": project_key,
        "engine_version": ENGINE_VERSION,
        "status": "floor_plan_and_sharing_ready",
        "completed_steps": 6,
        "review_steps": sum(1 for item in [envelope, core, *layout_options, *floor_plan_options, *sharing_options] if item.get("review_required")),
        "review_required": (
            envelope.get("review_required")
            or core.get("review_required")
            or any(option.get("review_required") for option in layout_options)
            or any(option.get("review_required") for option in floor_plan_options)
            or any(option.get("review_required") for option in sharing_options)
        ),
        "estimated_unit_capacity": envelope.get("estimated_unit_capacity"),
        "total_construction_area_m2": envelope.get("total_construction_area_m2"),
        "core_type": core.get("core_type"),
        "core_efficiency_percent": core.get("core_efficiency_percent"),
        "layout_option_count": len(layout_options),
        "best_layout_option_key": best_layout.get("option_key"),
        "best_layout_name": best_layout.get("option_name"),
        "best_unit_count": best_layout.get("unit_count"),
        "best_fit_score": best_layout.get("fit_score"),
        "floor_plan_option_count": len(floor_plan_options),
        "best_floor_plan_key": max(floor_plan_options, key=lambda item: item.get("fit_score") or 0, default={}).get("plan_key"),
        "best_floor_plan_score": max(floor_plan_options, key=lambda item: item.get("fit_score") or 0, default={}).get("fit_score"),
        "sharing_option_count": len(sharing_options),
        "best_sharing_key": best_sharing.get("sharing_key"),
        "best_sharing_strategy": best_sharing.get("strategy_key"),
        "best_owner_units": best_sharing.get("owner_units"),
        "best_contractor_units": best_sharing.get("contractor_units"),
        "best_contractor_share_percent": best_sharing.get("contractor_share_percent"),
        "best_offer_ready_score": best_sharing.get("offer_ready_score"),
        "offer_package_key": offer_package.get("package_key"),
        "next_modules": ["offer_renderer", "validation_review"],
    }
    conn.execute(
        """
        UPDATE engine_runs
        SET status = ?, completed_at = ?, result_summary_json = ?, raw_json = ?
        WHERE run_key = ?
        """,
        (
            summary["status"],
            now,
            json_dump(summary),
            json_dump(
                {
                    "envelope": envelope,
                    "core_placement": core,
                    "unit_layout_options": layout_options,
                    "floor_plan_options": floor_plan_options,
                    "sharing_payment_options": sharing_options,
                    "offer_data_package": offer_package,
                }
            ),
            run_key,
        ),
    )
    conn.execute("UPDATE input_projects SET status = ?, updated_at = ? WHERE project_key = ?", ("floor_plan_ready", now, project_key))
    return {
        "run_key": run_key,
        "summary": summary,
        "building_envelope": envelope,
        "core_placement": core,
        "unit_layout_options": layout_options,
        "floor_plan_options": floor_plan_options,
        "sharing_payment_options": sharing_options,
        "offer_data_package": offer_package,
    }


def import_input_project_prototypes(conn: sqlite3.Connection, imported_at: str) -> dict[str, int]:
    rows = conn.execute(
        """
        SELECT * FROM company_project_examples
        WHERE parcel_key IS NOT NULL
          AND (cad_area_m2 IS NOT NULL OR old_area_m2 IS NOT NULL)
        ORDER BY
            CASE parcel_key
                WHEN '2532-1' THEN 1
                WHEN '2647-6' THEN 2
                WHEN '4309-21' THEN 3
                ELSE 99
            END,
            risk_task_count DESC,
            parcel_key
        LIMIT 3
        """
    ).fetchall()
    project_count = 0
    existing_count = 0
    run_count = 0
    step_count = 0
    envelope_count = 0
    core_count = 0
    layout_count = 0
    mix_count = 0
    floor_plan_count = 0
    floor_zone_count = 0
    floor_finding_count = 0
    sharing_count = 0
    allocation_count = 0
    offer_package_count = 0
    company_key = first_company_key(conn)

    for row in rows:
        parcel_key = row["parcel_key"]
        reference_area = _num(row["old_area_m2"]) or _num(row["cad_area_m2"]) or 1000.0
        parcel_area = max(500.0, round(reference_area / 2.0, 2))
        road_frontage = round(max(18.0, min(42.0, math.sqrt(parcel_area) * 0.9)), 2)
        ada, parsel = parcel_key.split("-")
        payload = {
            "project_key": f"INPUT-{parcel_key}",
            "company_key": company_key,
            "parcel_key": parcel_key,
            "project_name": f"{parcel_key} Asama 10 prototip girdisi",
            "status": "seed_ready",
            "source_mode": "seed_from_company_dataset",
            "target_offer_template": "kentsel_donusum_teklif",
            "manual_notes": "Asama 10 prototip girdisi; parsel alani ve imar degerleri demonstrasyon icin varsayimsal uretilmistir.",
            "parcel_identity": {"ada": int(ada), "parsel": int(parsel)},
            "zoning_input": {
                "ada": int(ada),
                "parsel": int(parsel),
                "parcel_area_m2": parcel_area,
                "road_frontage_m": road_frontage,
                "zoning_function": "konut",
                "taks": 0.4,
                "kaks_or_emsal": 2.07,
                "max_floor_count": 8,
                "height_limit_m": 24.5,
                "front_setback_m": 5,
                "side_setback_m": 3,
                "rear_setback_m": 3,
                "parking_rule_version": "prototype",
                "shelter_rule_version": "prototype",
                "fire_rule_version": "prototype",
            },
            "existing_area_inputs": [
                {
                    "owner_id": "aggregate_existing",
                    "independent_unit_no": "aggregate",
                    "existing_gross_m2": _round(reference_area),
                    "existing_net_m2": _round(_num(row["cad_area_m2"]) or reference_area),
                    "usage_type": "mixed_existing",
                    "floor": "aggregate",
                    "notes": "Eski kayittan turetilen toplam metraj sinyali.",
                }
            ],
        }
        create_input_project(conn, payload, imported_at)
        project_count += 1
        existing_count += 1
        seed_run_key = f"RUN-{payload['project_key']}-seed"
        run_engine_for_project(conn, payload["project_key"], triggered_by="seed_import", now=imported_at, run_key=seed_run_key)
        run_count += 1
        step_count += conn.execute("SELECT COUNT(*) FROM engine_run_steps WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        envelope_count += conn.execute("SELECT COUNT(*) FROM building_envelope_results WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        core_count += conn.execute("SELECT COUNT(*) FROM core_placement_results WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        layout_count += conn.execute("SELECT COUNT(*) FROM unit_layout_options WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        mix_count += conn.execute("SELECT COUNT(*) FROM unit_mix_options WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        floor_plan_count += conn.execute("SELECT COUNT(*) FROM floor_plan_options WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        floor_zone_count += conn.execute("SELECT COUNT(*) FROM floor_plan_zones WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        floor_finding_count += conn.execute("SELECT COUNT(*) FROM floor_plan_findings WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        sharing_count += conn.execute("SELECT COUNT(*) FROM sharing_payment_options WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        allocation_count += conn.execute("SELECT COUNT(*) FROM sharing_unit_allocations WHERE run_key = ?", (seed_run_key,)).fetchone()[0]
        offer_package_count += conn.execute("SELECT COUNT(*) FROM offer_data_packages WHERE run_key = ?", (seed_run_key,)).fetchone()[0]

    return {
        "input_projects": project_count,
        "zoning_inputs": project_count,
        "existing_area_inputs": existing_count,
        "engine_runs": run_count,
        "engine_run_steps": step_count,
        "building_envelope_results": envelope_count,
        "core_placement_results": core_count,
        "unit_layout_options": layout_count,
        "unit_mix_options": mix_count,
        "floor_plan_options": floor_plan_count,
        "floor_plan_zones": floor_zone_count,
        "floor_plan_findings": floor_finding_count,
        "sharing_payment_options": sharing_count,
        "sharing_unit_allocations": allocation_count,
        "offer_data_packages": offer_package_count,
    }


def import_seed(seed_file: Path | None = None, database_file: Path | None = None, *, reset: bool = True) -> dict[str, Any]:
    seed_file = seed_file or seed_path()
    database_file = init_db(database_file or db_path(), reset=reset)
    seed = load_seed(seed_file)
    imported_at = datetime.now().isoformat(timespec="seconds")

    with connect(database_file) as conn:
        for source in seed.get("source_files", []):
            conn.execute(
                """
                INSERT OR REPLACE INTO source_files (
                    file_id, relative_path, absolute_path, stage, kind, extension, size_mb, modified, sha256
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    source.get("file_id"),
                    source.get("relative_path"),
                    source.get("absolute_path"),
                    source.get("stage"),
                    source.get("kind"),
                    source.get("extension"),
                    source.get("size_mb"),
                    source.get("modified"),
                    source.get("sha256"),
                ),
            )

        for parcel in seed.get("parcels", []):
            conn.execute(
                """
                INSERT OR REPLACE INTO parcels (
                    parcel_key, ada, parsel, status, reconciliation_quality, review_notes_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    parcel.get("parcel_key"),
                    parcel.get("ada"),
                    parcel.get("parsel"),
                    parcel.get("status"),
                    parcel.get("reconciliation_quality"),
                    json_dump(parcel.get("review_notes") or []),
                ),
            )

            for file_id in parcel.get("source_file_ids", []):
                conn.execute(
                    "INSERT OR IGNORE INTO parcel_source_files (parcel_key, file_id) VALUES (?, ?)",
                    (parcel.get("parcel_key"), file_id),
                )

            for cad in parcel.get("cad_plans", []):
                conn.execute(
                    """
                    INSERT INTO cad_plans (
                        parcel_key, relative_path, entity_count, layer_count, room_area_pair_count,
                        detected_room_area_m2, net_label_count, net_label_sum_m2,
                        dominant_rooms_json, top_area_types_json, sample_pairs_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        parcel.get("parcel_key"),
                        cad.get("relative_path"),
                        cad.get("entity_count"),
                        cad.get("layer_count"),
                        cad.get("room_area_pair_count"),
                        cad.get("detected_room_area_m2"),
                        cad.get("net_label_count"),
                        cad.get("net_label_sum_m2"),
                        json_dump(cad.get("dominant_rooms") or {}),
                        json_dump(cad.get("top_area_types_m2") or {}),
                        json_dump(cad.get("sample_pairs") or []),
                    ),
                )

            excel = parcel.get("excel_old_metraj")
            if excel:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO excel_old_metraj (
                        parcel_key, relative_path, old_total_m2, method, component_count, components_json
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        parcel.get("parcel_key"),
                        excel.get("relative_path"),
                        excel.get("old_total_m2"),
                        excel.get("method"),
                        excel.get("component_count"),
                        json_dump(excel.get("components") or []),
                    ),
                )

            for proposal in parcel.get("proposal_summaries", []):
                conn.execute(
                    """
                    INSERT INTO proposal_summaries (
                        parcel_key, relative_path, proposal_date, existing_independent_units, otopark,
                        owner_unit_mentions, contractor_unit_mentions, dukkan_mentions, dubleks_mentions,
                        title_body_mismatch, special_notes_json, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        parcel.get("parcel_key"),
                        proposal.get("relative_path"),
                        proposal.get("proposal_date"),
                        proposal.get("existing_independent_units"),
                        proposal.get("otopark"),
                        proposal.get("owner_unit_mentions"),
                        proposal.get("contractor_unit_mentions"),
                        proposal.get("dukkkan_mentions"),
                        proposal.get("dubleks_mentions"),
                        _nullable_bool(proposal.get("title_body_mismatch")),
                        json_dump(proposal.get("special_notes") or []),
                        json_dump(proposal),
                    ),
                )

        for item in seed.get("warnings", []):
            conn.execute(
                """
                INSERT INTO warnings (parcel_key, level, code, source, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, 'open', ?)
                """,
                (
                    item.get("parcel_key"),
                    item.get("level"),
                    item.get("code"),
                    item.get("source"),
                    item.get("message"),
                    imported_at,
                ),
            )

        v2_counts = import_proposal_v2(conn, DEFAULT_PROPOSAL_V2_PATH, imported_at)
        contract_counts = import_contract_rules(conn, DEFAULT_CONTRACT_RULES_PATH, imported_at)
        cad_unit_counts = import_cad_units(conn, DEFAULT_CAD_UNITS_PATH, imported_at)
        document_qa_counts = import_document_qa(conn, DEFAULT_DOCUMENT_QA_PATH)
        permission_workflow_counts = import_permission_workflow(conn, DEFAULT_PERMISSION_WORKFLOW_PATH, imported_at)
        company_dataset_counts = import_company_dataset(conn, DEFAULT_COMPANY_DATASET_PATH)
        input_project_counts = import_input_project_prototypes(conn, imported_at)
        company_dataset = {}
        if DEFAULT_COMPANY_DATASET_PATH.exists():
            company_dataset = json.loads(DEFAULT_COMPANY_DATASET_PATH.read_text(encoding="utf-8"))

        meta_values = {
            "generated_at": seed.get("generated_at"),
            "source_root": seed.get("source_root"),
            "seed_path": str(seed_file),
            "proposal_v2_path": str(DEFAULT_PROPOSAL_V2_PATH),
            "proposal_v2_counts_json": json_dump(v2_counts),
            "contract_rules_path": str(DEFAULT_CONTRACT_RULES_PATH),
            "contract_rule_counts_json": json_dump(contract_counts),
            "cad_units_path": str(DEFAULT_CAD_UNITS_PATH),
            "cad_unit_counts_json": json_dump(cad_unit_counts),
            "document_qa_path": str(DEFAULT_DOCUMENT_QA_PATH),
            "document_qa_counts_json": json_dump(document_qa_counts),
            "permission_workflow_path": str(DEFAULT_PERMISSION_WORKFLOW_PATH),
            "permission_workflow_counts_json": json_dump(permission_workflow_counts),
            "company_dataset_path": str(DEFAULT_COMPANY_DATASET_PATH),
            "company_dataset_counts_json": json_dump(company_dataset_counts),
            "company_dataset_summary_json": json_dump(company_dataset.get("summary") or {}),
            "company_dataset_input_schema_json": json_dump(company_dataset.get("input_schema") or {}),
            "input_project_counts_json": json_dump(input_project_counts),
            "imported_at": imported_at,
            "summary_json": json_dump(seed.get("summary") or {}),
            "module_readiness_json": json_dump(seed.get("module_readiness") or {}),
        }
        for key, value in meta_values.items():
            conn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", (key, str(value)))

    return inspect_database(database_file)


def scalar(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> Any:
    return conn.execute(sql, params).fetchone()[0]


def inspect_database(path: Path | None = None) -> dict[str, Any]:
    path = path or db_path()
    with connect(path) as conn:
        return {
            "db_path": str(path),
            "source_files": scalar(conn, "SELECT COUNT(*) FROM source_files"),
            "parcels": scalar(conn, "SELECT COUNT(*) FROM parcels"),
            "cad_plans": scalar(conn, "SELECT COUNT(*) FROM cad_plans"),
            "cad_unit_plans": scalar(conn, "SELECT COUNT(*) FROM cad_unit_plans"),
            "cad_unit_candidates": scalar(conn, "SELECT COUNT(*) FROM cad_unit_candidates"),
            "cad_unit_rooms": scalar(conn, "SELECT COUNT(*) FROM cad_unit_rooms"),
            "cad_unit_findings": scalar(conn, "SELECT COUNT(*) FROM cad_unit_findings"),
            "excel_old_metraj": scalar(conn, "SELECT COUNT(*) FROM excel_old_metraj"),
            "proposal_summaries": scalar(conn, "SELECT COUNT(*) FROM proposal_summaries"),
            "proposal_v2_records": scalar(conn, "SELECT COUNT(*) FROM proposal_v2_records"),
            "proposal_v2_terms": scalar(conn, "SELECT COUNT(*) FROM proposal_v2_terms"),
            "contract_rule_evaluations": scalar(conn, "SELECT COUNT(*) FROM contract_rule_evaluations"),
            "contract_rule_findings": scalar(conn, "SELECT COUNT(*) FROM contract_rule_findings"),
            "document_qa_evidence": scalar(conn, "SELECT COUNT(*) FROM document_qa_evidence"),
            "review_tasks": scalar(conn, "SELECT COUNT(*) FROM review_tasks"),
            "review_task_evidence": scalar(conn, "SELECT COUNT(*) FROM review_task_evidence"),
            "review_decisions": scalar(conn, "SELECT COUNT(*) FROM review_decisions"),
            "company_profiles": scalar(conn, "SELECT COUNT(*) FROM company_profiles"),
            "company_project_examples": scalar(conn, "SELECT COUNT(*) FROM company_project_examples"),
            "company_layout_patterns": scalar(conn, "SELECT COUNT(*) FROM company_layout_patterns"),
            "company_sharing_patterns": scalar(conn, "SELECT COUNT(*) FROM company_sharing_patterns"),
            "automation_engine_modules": scalar(conn, "SELECT COUNT(*) FROM automation_engine_modules"),
            "input_projects": scalar(conn, "SELECT COUNT(*) FROM input_projects"),
            "zoning_inputs": scalar(conn, "SELECT COUNT(*) FROM zoning_inputs"),
            "existing_area_inputs": scalar(conn, "SELECT COUNT(*) FROM existing_area_inputs"),
            "engine_runs": scalar(conn, "SELECT COUNT(*) FROM engine_runs"),
            "engine_run_steps": scalar(conn, "SELECT COUNT(*) FROM engine_run_steps"),
            "building_envelope_results": scalar(conn, "SELECT COUNT(*) FROM building_envelope_results"),
            "core_placement_results": scalar(conn, "SELECT COUNT(*) FROM core_placement_results"),
            "unit_layout_options": scalar(conn, "SELECT COUNT(*) FROM unit_layout_options"),
            "unit_mix_options": scalar(conn, "SELECT COUNT(*) FROM unit_mix_options"),
            "floor_plan_options": scalar(conn, "SELECT COUNT(*) FROM floor_plan_options"),
            "floor_plan_zones": scalar(conn, "SELECT COUNT(*) FROM floor_plan_zones"),
            "floor_plan_findings": scalar(conn, "SELECT COUNT(*) FROM floor_plan_findings"),
            "sharing_payment_options": scalar(conn, "SELECT COUNT(*) FROM sharing_payment_options"),
            "sharing_unit_allocations": scalar(conn, "SELECT COUNT(*) FROM sharing_unit_allocations"),
            "offer_data_packages": scalar(conn, "SELECT COUNT(*) FROM offer_data_packages"),
            "warnings": scalar(conn, "SELECT COUNT(*) FROM warnings"),
            "open_warnings": scalar(conn, "SELECT COUNT(*) FROM warnings WHERE status = 'open'"),
        }


def main() -> None:
    result = import_seed()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
