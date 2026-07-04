from __future__ import annotations

import argparse
import json
import mimetypes
import re
import sqlite3
import unicodedata
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from database import DEFAULT_DB_PATH, connect, create_input_project, import_seed, init_db, inspect_database, run_engine_for_project


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
FRONTEND_BUILD_DIR = FRONTEND_DIR / "dist"

JSON_FIELDS = {
    "review_notes_json": "review_notes",
    "dominant_rooms_json": "dominant_rooms",
    "top_area_types_json": "top_area_types_m2",
    "sample_pairs_json": "sample_pairs",
    "room_types_json": "room_types",
    "bbox_json": "bbox",
    "components_json": "components",
    "special_notes_json": "special_notes",
    "tags_json": "tags",
    "decision_template_json": "decision_template",
    "evidence_snapshot_json": "evidence_snapshot",
    "brand_config_json": "brand_config",
    "offer_template_json": "offer_template",
    "business_rules_json": "business_rules",
    "lesson_tags_json": "lesson_tags",
    "input_contract_json": "input_contract",
    "output_contract_json": "output_contract",
    "result_summary_json": "result_summary",
    "input_json": "input",
    "output_json": "output",
    "findings_json": "findings",
    "package_json": "package",
    "raw_json": "raw",
}

JSON_OBJECT_FIELDS = {
    "dominant_rooms_json",
    "top_area_types_json",
    "room_types_json",
    "bbox_json",
    "brand_config_json",
    "offer_template_json",
    "business_rules_json",
    "result_summary_json",
    "input_json",
    "output_json",
    "package_json",
    "raw_json",
}

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


def parse_json_field(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    data: dict[str, Any] = {}
    for key in row.keys():
        if key in JSON_FIELDS:
            fallback = {} if key in JSON_OBJECT_FIELDS else []
            data[JSON_FIELDS[key]] = parse_json_field(row[key], fallback)
        elif key == "title_body_mismatch" and row[key] is not None:
            data[key] = bool(row[key])
        else:
            data[key] = row[key]
    return data


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [row_to_dict(row) or {} for row in rows]


def int_param(params: dict[str, list[str]], key: str, default: int, max_value: int = 500) -> int:
    try:
        value = int((params.get(key) or [default])[0])
        return max(0, min(value, max_value))
    except (TypeError, ValueError):
        return default


def add_filter(where: list[str], values: list[Any], column: str, params: dict[str, list[str]], name: str | None = None) -> None:
    name = name or column
    value = (params.get(name) or [None])[0]
    if value:
        where.append(f"{column} = ?")
        values.append(value)


def like_filter(where: list[str], values: list[Any], columns: list[str], query: str | None) -> None:
    if not query:
        return
    clause = " OR ".join(f"{column} LIKE ?" for column in columns)
    where.append(f"({clause})")
    values.extend([f"%{query}%"] * len(columns))


def normalize_search(value: Any) -> str:
    text = str(value or "").translate(TURKISH_FOLD).casefold()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9_\-./%+]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def query_tokens(value: str | None) -> list[str]:
    return [token for token in normalize_search(value).split() if len(token) > 1][:8]


def evidence_score(record: dict[str, Any], tokens: list[str]) -> int:
    score = int(record.get("importance") or 0)
    search_text = record.get("search_text") or ""
    title = normalize_search(record.get("title"))
    source_type = normalize_search(record.get("source_type"))
    for token in tokens:
        if token in search_text:
            score += 8
        if token in title:
            score += 5
        if token in source_type:
            score += 4
    return score


def answer_actions(evidence: list[dict[str, Any]]) -> list[str]:
    source_types = {item.get("source_type") for item in evidence}
    actions: list[str] = []
    if {"contract_rule", "contract_finding"} & source_types:
        actions.append("Sozlesme kural bulgularini hukuk/finans kontrolune alin.")
    if {"cad_unit_plan", "cad_unit_candidate", "cad_unit_finding", "cad_summary", "excel_metraj"} & source_types:
        actions.append("CAD, bagimsiz bolum ve eski metraj degerlerini ayni tabloda karsilastirin.")
    if {"proposal_v2", "proposal_term", "proposal_legacy"} & source_types:
        actions.append("Teklif PDF terimlerini manuel okuma ile dogrulayin.")
    if "warning" in source_types:
        actions.append("Ilgili uyari kuyrugu kaydina inceleme sonucu girin.")
    return actions[:4]


class ApiHandler(BaseHTTPRequestHandler):
    db_file: Path = DEFAULT_DB_PATH

    def log_message(self, format: str, *args: Any) -> None:
        return

    @property
    def conn(self) -> sqlite3.Connection:
        return connect(self.db_file)

    def send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html: str, status: int = 200) -> None:
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, file_path: Path) -> None:
        body = file_path.read_bytes()
        content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        if file_path.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"
        elif file_path.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif file_path.suffix == ".html":
            content_type = "text/html; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        params = parse_qs(parsed.query)

        try:
            if path in {"/", "/app"}:
                self.handle_app()
            elif path.startswith("/app/"):
                self.handle_app_static(path)
            elif path == "/home":
                self.handle_home()
            elif path == "/health":
                self.send_json({"ok": True, "database": inspect_database(self.db_file)})
            elif path == "/api":
                self.handle_api_index()
            elif path == "/api/summary":
                self.handle_summary()
            elif path == "/api/parcels":
                self.handle_parcels(params)
            elif path.startswith("/api/parcels/"):
                parcel_key = unquote(path.removeprefix("/api/parcels/"))
                if parcel_key.endswith("/files"):
                    self.handle_parcel_files(parcel_key.removesuffix("/files"))
                else:
                    self.handle_parcel_detail(parcel_key)
            elif path == "/api/source-files":
                self.handle_source_files(params)
            elif path.startswith("/api/source-files/"):
                self.handle_source_file_detail(unquote(path.removeprefix("/api/source-files/")))
            elif path == "/api/cad-units":
                self.handle_cad_units(params)
            elif path == "/api/cad-units/candidates":
                self.handle_cad_unit_candidates(params)
            elif path == "/api/cad-units/findings":
                self.handle_cad_unit_findings(params)
            elif path == "/api/proposal-v2":
                self.handle_proposal_v2(params)
            elif path == "/api/proposal-v2/terms":
                self.handle_proposal_v2_terms(params)
            elif path == "/api/contract-rules":
                self.handle_contract_rules(params)
            elif path == "/api/contract-rules/findings":
                self.handle_contract_rule_findings(params)
            elif path == "/api/document-qa/evidence":
                self.handle_document_qa_evidence(params)
            elif path == "/api/document-qa/ask":
                self.handle_document_qa_ask(params)
            elif path == "/api/review-tasks":
                self.handle_review_tasks(params)
            elif path.startswith("/api/review-tasks/"):
                self.handle_review_task_detail(int(unquote(path.removeprefix("/api/review-tasks/"))))
            elif path == "/api/company-dataset":
                self.handle_company_dataset()
            elif path == "/api/company-dataset/project-examples":
                self.handle_company_project_examples(params)
            elif path == "/api/company-dataset/layout-patterns":
                self.handle_company_layout_patterns(params)
            elif path == "/api/company-dataset/sharing-patterns":
                self.handle_company_sharing_patterns(params)
            elif path == "/api/automation-core/modules":
                self.handle_automation_modules(params)
            elif path == "/api/input-projects":
                self.handle_input_projects(params)
            elif path.startswith("/api/input-projects/"):
                suffix = unquote(path.removeprefix("/api/input-projects/"))
                if suffix.endswith("/engine-runs"):
                    self.handle_engine_runs(params, project_key=suffix.removesuffix("/engine-runs").rstrip("/"))
                else:
                    self.handle_input_project_detail(suffix)
            elif path == "/api/engine-runs":
                self.handle_engine_runs(params)
            elif path.startswith("/api/engine-runs/"):
                self.handle_engine_run_detail(unquote(path.removeprefix("/api/engine-runs/")))
            elif path == "/api/core-placement-results":
                self.handle_core_placement_results(params)
            elif path == "/api/unit-layout-options":
                self.handle_unit_layout_options(params)
            elif path.startswith("/api/unit-layout-options/"):
                self.handle_unit_layout_option_detail(unquote(path.removeprefix("/api/unit-layout-options/")))
            elif path == "/api/unit-mix-options":
                self.handle_unit_mix_options(params)
            elif path == "/api/floor-plan-options":
                self.handle_floor_plan_options(params)
            elif path.startswith("/api/floor-plan-options/"):
                self.handle_floor_plan_option_detail(unquote(path.removeprefix("/api/floor-plan-options/")))
            elif path == "/api/floor-plan-zones":
                self.handle_floor_plan_zones(params)
            elif path == "/api/floor-plan-findings":
                self.handle_floor_plan_findings(params)
            elif path == "/api/sharing-payment-options":
                self.handle_sharing_payment_options(params)
            elif path.startswith("/api/sharing-payment-options/"):
                self.handle_sharing_payment_option_detail(unquote(path.removeprefix("/api/sharing-payment-options/")))
            elif path == "/api/sharing-unit-allocations":
                self.handle_sharing_unit_allocations(params)
            elif path == "/api/offer-data-packages":
                self.handle_offer_data_packages(params)
            elif path.startswith("/api/offer-data-packages/"):
                self.handle_offer_data_package_detail(unquote(path.removeprefix("/api/offer-data-packages/")))
            elif path == "/api/warnings":
                self.handle_warnings(params)
            elif path == "/api/search":
                self.handle_search(params)
            else:
                self.send_json({"error": "not_found", "path": path}, 404)
        except Exception as exc:
            self.send_json({"error": "server_error", "detail": str(exc)}, 500)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        try:
            if path == "/api/import-seed":
                self.send_json(import_seed(database_file=self.db_file, reset=True))
            elif path == "/api/input-projects":
                self.handle_create_input_project()
            else:
                engine_match = re.fullmatch(r"/api/input-projects/([^/]+)/engine-runs", path)
                if engine_match:
                    self.handle_create_engine_run(unquote(engine_match.group(1)))
                    return
                match = re.fullmatch(r"/api/review-tasks/(\d+)/decisions", path)
                if match:
                    self.handle_create_review_decision(int(match.group(1)))
                    return
                self.send_json({"error": "not_found", "path": path}, 404)
                return
        except Exception as exc:
            self.send_json({"error": "server_error", "detail": str(exc)}, 500)

    def do_PATCH(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"
        try:
            match = re.fullmatch(r"/api/warnings/(\d+)", path)
            if not match:
                self.send_json({"error": "not_found", "path": path}, 404)
                return
            self.handle_update_warning(int(match.group(1)))
        except Exception as exc:
            self.send_json({"error": "server_error", "detail": str(exc)}, 500)

    def handle_home(self) -> None:
        self.send_html(
            """
            <!doctype html>
            <html lang="tr">
            <head><meta charset="utf-8"><title>Kentsel Otomasyon API</title></head>
            <body style="font-family:Arial,sans-serif;max-width:900px;margin:40px auto;line-height:1.5">
              <h1>Kentsel Otomasyon API</h1>
              <p>Backend calisiyor. Baslangic endpointleri:</p>
              <ul>
                <li><a href="/health">/health</a></li>
                <li><a href="/api/summary">/api/summary</a></li>
                <li><a href="/api/parcels">/api/parcels</a></li>
                <li><a href="/api/warnings">/api/warnings</a></li>
                <li><a href="/api/source-files">/api/source-files</a></li>
              </ul>
            </body>
            </html>
            """
        )

    def handle_app(self) -> None:
        index_file = FRONTEND_BUILD_DIR / "index.html"
        if not index_file.is_file():
            index_file = FRONTEND_DIR / "index.html"
        self.send_file(index_file)

    def handle_app_static(self, path: str) -> None:
        relative = path.removeprefix("/app/") or "index.html"
        if relative in {"", "/"}:
            relative = "index.html"
        static_root = FRONTEND_BUILD_DIR if FRONTEND_BUILD_DIR.is_dir() else FRONTEND_DIR
        candidate = (static_root / relative).resolve()
        frontend_root = static_root.resolve()
        if not str(candidate).startswith(str(frontend_root)) or not candidate.is_file():
            self.send_json({"error": "asset_not_found", "path": path}, 404)
            return
        self.send_file(candidate)

    def handle_api_index(self) -> None:
        self.send_json(
            {
                "name": "Kentsel Donusum Automation API",
                "version": "0.1.0",
                "endpoints": [
                    "GET /health",
                    "GET /api/summary",
                    "GET /api/parcels?status=&quality=&q=&limit=&offset=",
                    "GET /api/parcels/{parcel_key}",
                    "GET /api/parcels/{parcel_key}/files",
                    "GET /api/source-files?kind=&stage=&parcel_key=&q=&limit=&offset=",
                    "GET /api/source-files/{file_id}",
                    "GET /api/cad-units?parcel_key=&offer_match_status=&q=&limit=&offset=",
                    "GET /api/cad-units/candidates?parcel_key=&method=&unit_type=&q=&limit=&offset=",
                    "GET /api/cad-units/findings?parcel_key=&severity=&code=&q=&limit=&offset=",
                    "GET /api/proposal-v2?parcel_key=&q=&limit=&offset=",
                    "GET /api/proposal-v2/terms?parcel_key=&group_name=&term_type=&label=&q=&limit=&offset=",
                    "GET /api/contract-rules?parcel_key=&risk_level=&decision=&q=&limit=&offset=",
                    "GET /api/contract-rules/findings?parcel_key=&severity=&code=&q=&limit=&offset=",
                    "GET /api/document-qa/evidence?parcel_key=&source_type=&q=&limit=&offset=",
                    "GET /api/document-qa/ask?parcel_key=&q=&limit=",
                    "GET /api/review-tasks?parcel_key=&status=&level=&category=&q=&limit=&offset=",
                    "GET /api/review-tasks/{id}",
                    "POST /api/review-tasks/{id}/decisions",
                    "GET /api/company-dataset",
                    "GET /api/company-dataset/project-examples?parcel_key=&status=&quality=&q=&limit=&offset=",
                    "GET /api/company-dataset/layout-patterns?unit_type=&room_mix=&pattern_role=&pattern_status=&q=&limit=&offset=",
                    "GET /api/company-dataset/sharing-patterns?parcel_key=&risk_level=&pattern_status=&q=&limit=&offset=",
                    "GET /api/automation-core/modules?status=",
                    "GET /api/input-projects?parcel_key=&status=&q=&limit=&offset=",
                    "POST /api/input-projects",
                    "GET /api/input-projects/{project_key}",
                    "POST /api/input-projects/{project_key}/engine-runs",
                    "GET /api/engine-runs?project_key=&status=&q=&limit=&offset=",
                    "GET /api/engine-runs/{run_key}",
                    "GET /api/core-placement-results?project_key=&run_key=&core_type=&q=&limit=&offset=",
                    "GET /api/unit-layout-options?project_key=&run_key=&strategy_key=&q=&limit=&offset=",
                    "GET /api/unit-layout-options/{option_key}",
                    "GET /api/unit-mix-options?project_key=&run_key=&option_key=&room_mix=&q=&limit=&offset=",
                    "GET /api/floor-plan-options?project_key=&run_key=&layout_option_key=&plan_type=&q=&limit=&offset=",
                    "GET /api/floor-plan-options/{plan_key}",
                    "GET /api/floor-plan-zones?project_key=&run_key=&plan_key=&zone_type=&q=&limit=&offset=",
                    "GET /api/floor-plan-findings?project_key=&run_key=&plan_key=&severity=&code=&q=&limit=&offset=",
                    "GET /api/sharing-payment-options?project_key=&run_key=&layout_option_key=&strategy_key=&q=&limit=&offset=",
                    "GET /api/sharing-payment-options/{sharing_key}",
                    "GET /api/sharing-unit-allocations?project_key=&run_key=&sharing_key=&role=&room_mix=&q=&limit=&offset=",
                    "GET /api/offer-data-packages?project_key=&run_key=&package_status=&q=&limit=&offset=",
                    "GET /api/offer-data-packages/{package_key}",
                    "GET /api/warnings?status=&level=&code=&parcel_key=&q=&limit=&offset=",
                    "PATCH /api/warnings/{id}",
                    "GET /api/search?q=",
                    "POST /api/import-seed",
                ],
            }
        )

    def handle_summary(self) -> None:
        with self.conn as conn:
            meta = {row["key"]: row["value"] for row in conn.execute("SELECT key, value FROM meta")}
            payload = inspect_database(self.db_file)
            payload["by_parcel_status"] = rows_to_dicts(
                conn.execute("SELECT status, COUNT(*) AS count FROM parcels GROUP BY status ORDER BY status").fetchall()
            )
            payload["by_reconciliation_quality"] = rows_to_dicts(
                conn.execute(
                    "SELECT reconciliation_quality AS quality, COUNT(*) AS count FROM parcels GROUP BY reconciliation_quality ORDER BY reconciliation_quality"
                ).fetchall()
            )
            payload["warnings_by_level"] = rows_to_dicts(
                conn.execute("SELECT level, COUNT(*) AS count FROM warnings GROUP BY level ORDER BY level").fetchall()
            )
            payload["warnings_by_code"] = rows_to_dicts(
                conn.execute("SELECT code, COUNT(*) AS count FROM warnings GROUP BY code ORDER BY count DESC, code").fetchall()
            )
            payload["cad_unit_findings_by_severity"] = rows_to_dicts(
                conn.execute(
                    "SELECT severity, COUNT(*) AS count FROM cad_unit_findings GROUP BY severity ORDER BY count DESC, severity"
                ).fetchall()
            )
            payload["cad_unit_match_status"] = rows_to_dicts(
                conn.execute(
                    "SELECT offer_match_status AS status, COUNT(*) AS count FROM cad_unit_plans GROUP BY offer_match_status ORDER BY count DESC, offer_match_status"
                ).fetchall()
            )
            payload["contract_rules_by_level"] = rows_to_dicts(
                conn.execute(
                    "SELECT risk_level AS level, COUNT(*) AS count FROM contract_rule_evaluations GROUP BY risk_level ORDER BY count DESC, risk_level"
                ).fetchall()
            )
            payload["contract_findings_by_severity"] = rows_to_dicts(
                conn.execute(
                    "SELECT severity, COUNT(*) AS count FROM contract_rule_findings GROUP BY severity ORDER BY count DESC, severity"
                ).fetchall()
            )
            payload["document_qa_by_source_type"] = rows_to_dicts(
                conn.execute(
                    "SELECT source_type, COUNT(*) AS count FROM document_qa_evidence GROUP BY source_type ORDER BY count DESC, source_type"
                ).fetchall()
            )
            payload["review_tasks_by_status"] = rows_to_dicts(
                conn.execute("SELECT status, COUNT(*) AS count FROM review_tasks GROUP BY status ORDER BY count DESC, status").fetchall()
            )
            payload["review_tasks_by_category"] = rows_to_dicts(
                conn.execute("SELECT category, COUNT(*) AS count FROM review_tasks GROUP BY category ORDER BY count DESC, category").fetchall()
            )
            payload["review_tasks_by_due_bucket"] = rows_to_dicts(
                conn.execute("SELECT due_bucket, COUNT(*) AS count FROM review_tasks GROUP BY due_bucket ORDER BY count DESC, due_bucket").fetchall()
            )
            payload["company_layout_pattern_status"] = rows_to_dicts(
                conn.execute(
                    "SELECT pattern_status AS status, COUNT(*) AS count FROM company_layout_patterns GROUP BY pattern_status ORDER BY count DESC, pattern_status"
                ).fetchall()
            )
            payload["company_layout_pattern_role"] = rows_to_dicts(
                conn.execute(
                    "SELECT pattern_role AS role, COUNT(*) AS count FROM company_layout_patterns GROUP BY pattern_role ORDER BY count DESC, pattern_role"
                ).fetchall()
            )
            payload["company_sharing_pattern_status"] = rows_to_dicts(
                conn.execute(
                    "SELECT pattern_status AS status, COUNT(*) AS count FROM company_sharing_patterns GROUP BY pattern_status ORDER BY count DESC, pattern_status"
                ).fetchall()
            )
            payload["automation_modules_by_status"] = rows_to_dicts(
                conn.execute(
                    "SELECT status, COUNT(*) AS count FROM automation_engine_modules GROUP BY status ORDER BY count DESC, status"
                ).fetchall()
            )
            payload["input_projects_by_status"] = rows_to_dicts(
                conn.execute("SELECT status, COUNT(*) AS count FROM input_projects GROUP BY status ORDER BY count DESC, status").fetchall()
            )
            payload["engine_runs_by_status"] = rows_to_dicts(
                conn.execute("SELECT status, COUNT(*) AS count FROM engine_runs GROUP BY status ORDER BY count DESC, status").fetchall()
            )
            payload["engine_steps_by_status"] = rows_to_dicts(
                conn.execute("SELECT status, COUNT(*) AS count FROM engine_run_steps GROUP BY status ORDER BY count DESC, status").fetchall()
            )
            payload["core_placement_by_type"] = rows_to_dicts(
                conn.execute(
                    "SELECT core_type, COUNT(*) AS count FROM core_placement_results GROUP BY core_type ORDER BY count DESC, core_type"
                ).fetchall()
            )
            payload["unit_layout_by_strategy"] = rows_to_dicts(
                conn.execute(
                    "SELECT strategy_key, COUNT(*) AS count FROM unit_layout_options GROUP BY strategy_key ORDER BY count DESC, strategy_key"
                ).fetchall()
            )
            payload["unit_layout_by_review"] = rows_to_dicts(
                conn.execute(
                    "SELECT review_required, COUNT(*) AS count FROM unit_layout_options GROUP BY review_required ORDER BY review_required DESC"
                ).fetchall()
            )
            payload["floor_plan_by_type"] = rows_to_dicts(
                conn.execute(
                    "SELECT plan_type, COUNT(*) AS count FROM floor_plan_options GROUP BY plan_type ORDER BY count DESC, plan_type"
                ).fetchall()
            )
            payload["floor_plan_by_review"] = rows_to_dicts(
                conn.execute(
                    "SELECT review_required, COUNT(*) AS count FROM floor_plan_options GROUP BY review_required ORDER BY review_required DESC"
                ).fetchall()
            )
            payload["floor_plan_findings_by_severity"] = rows_to_dicts(
                conn.execute(
                    "SELECT severity, COUNT(*) AS count FROM floor_plan_findings GROUP BY severity ORDER BY count DESC, severity"
                ).fetchall()
            )
            payload["sharing_payment_by_strategy"] = rows_to_dicts(
                conn.execute(
                    "SELECT strategy_key, COUNT(*) AS count FROM sharing_payment_options GROUP BY strategy_key ORDER BY count DESC, strategy_key"
                ).fetchall()
            )
            payload["sharing_payment_by_review"] = rows_to_dicts(
                conn.execute(
                    "SELECT review_required, COUNT(*) AS count FROM sharing_payment_options GROUP BY review_required ORDER BY review_required DESC"
                ).fetchall()
            )
            payload["offer_packages_by_status"] = rows_to_dicts(
                conn.execute(
                    "SELECT package_status, COUNT(*) AS count FROM offer_data_packages GROUP BY package_status ORDER BY count DESC, package_status"
                ).fetchall()
            )
            payload["seed_summary"] = parse_json_field(meta.get("summary_json"), {})
            payload["module_readiness"] = parse_json_field(meta.get("module_readiness_json"), {})
            payload["company_dataset_summary"] = parse_json_field(meta.get("company_dataset_summary_json"), {})
            payload["company_dataset_input_schema"] = parse_json_field(meta.get("company_dataset_input_schema_json"), {})
            payload["source_root"] = meta.get("source_root")
            payload["generated_at"] = meta.get("generated_at")
            payload["imported_at"] = meta.get("imported_at")
            self.send_json(payload)

    def handle_parcels(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "p.status", params, "status")
        add_filter(where, values, "p.reconciliation_quality", params, "quality")
        like_filter(where, values, ["p.parcel_key", "p.status", "p.reconciliation_quality"], (params.get("q") or [None])[0])
        if (params.get("has_warning") or [None])[0] in {"1", "true", "yes"}:
            where.append("EXISTS (SELECT 1 FROM warnings w WHERE w.parcel_key = p.parcel_key AND w.status = 'open')")
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        sql = f"""
            SELECT p.*,
                   (SELECT COUNT(*) FROM parcel_source_files psf WHERE psf.parcel_key = p.parcel_key) AS source_file_count,
                   (SELECT COUNT(*) FROM cad_plans c WHERE c.parcel_key = p.parcel_key) AS cad_plan_count,
                   (SELECT COUNT(*) FROM cad_unit_plans cup WHERE cup.parcel_key = p.parcel_key) AS cad_unit_plan_count,
                   (SELECT COUNT(*) FROM cad_unit_candidates cuc WHERE cuc.parcel_key = p.parcel_key) AS cad_unit_candidate_count,
                   (SELECT COUNT(*) FROM proposal_summaries s WHERE s.parcel_key = p.parcel_key) AS proposal_count,
                   (SELECT COUNT(*) FROM proposal_v2_records pv2 WHERE pv2.parcel_key = p.parcel_key) AS proposal_v2_count,
                   (SELECT COUNT(*) FROM contract_rule_evaluations cre WHERE cre.parcel_key = p.parcel_key) AS contract_rule_count,
                   (SELECT MAX(risk_score) FROM contract_rule_evaluations cre WHERE cre.parcel_key = p.parcel_key) AS contract_risk_score,
                   (SELECT COUNT(*) FROM document_qa_evidence dqa WHERE dqa.parcel_key = p.parcel_key) AS document_qa_evidence_count,
                   (SELECT COUNT(*) FROM review_tasks rt WHERE rt.parcel_key = p.parcel_key) AS review_task_count,
                   (SELECT COUNT(*) FROM review_tasks rt WHERE rt.parcel_key = p.parcel_key AND rt.status IN ('open', 'reviewing')) AS active_review_task_count,
                   (SELECT COUNT(*) FROM warnings w WHERE w.parcel_key = p.parcel_key AND w.status = 'open') AS open_warning_count
            FROM parcels p
            {where_sql}
            ORDER BY p.ada, p.parsel
            LIMIT ? OFFSET ?
        """
        count_sql = f"SELECT COUNT(*) FROM parcels p {where_sql}"
        with self.conn as conn:
            total = conn.execute(count_sql, values).fetchone()[0]
            rows = conn.execute(sql, values + [limit, offset]).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_parcel_detail(self, parcel_key: str) -> None:
        with self.conn as conn:
            parcel = row_to_dict(conn.execute("SELECT * FROM parcels WHERE parcel_key = ?", (parcel_key,)).fetchone())
            if not parcel:
                self.send_json({"error": "parcel_not_found", "parcel_key": parcel_key}, 404)
                return
            parcel["source_files"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT sf.* FROM source_files sf
                    JOIN parcel_source_files psf ON psf.file_id = sf.file_id
                    WHERE psf.parcel_key = ?
                    ORDER BY sf.stage, sf.kind, sf.relative_path
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["cad_plans"] = rows_to_dicts(
                conn.execute("SELECT * FROM cad_plans WHERE parcel_key = ? ORDER BY id", (parcel_key,)).fetchall()
            )
            parcel["cad_unit_plans"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM cad_unit_plans
                    WHERE parcel_key = ?
                    ORDER BY confidence_score DESC, id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["cad_unit_candidates"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM cad_unit_candidates
                    WHERE parcel_key = ?
                    ORDER BY
                        CASE method WHEN 'net_area_label' THEN 1 ELSE 2 END,
                        confidence_score DESC,
                        id
                    LIMIT 80
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["cad_unit_findings"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM cad_unit_findings
                    WHERE parcel_key = ?
                    ORDER BY
                        CASE severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                        id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["excel_old_metraj"] = row_to_dict(
                conn.execute("SELECT * FROM excel_old_metraj WHERE parcel_key = ?", (parcel_key,)).fetchone()
            )
            parcel["proposal_summaries"] = rows_to_dicts(
                conn.execute("SELECT * FROM proposal_summaries WHERE parcel_key = ? ORDER BY id", (parcel_key,)).fetchall()
            )
            parcel["proposal_v2_records"] = rows_to_dicts(
                conn.execute("SELECT * FROM proposal_v2_records WHERE parcel_key = ? ORDER BY id", (parcel_key,)).fetchall()
            )
            parcel["proposal_v2_terms"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM proposal_v2_terms
                    WHERE parcel_key = ?
                    ORDER BY group_name, proposal_record_id, id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["contract_rule_evaluations"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM contract_rule_evaluations
                    WHERE parcel_key = ?
                    ORDER BY risk_score DESC, id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["contract_rule_findings"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM contract_rule_findings
                    WHERE parcel_key = ?
                    ORDER BY
                        CASE severity
                            WHEN 'blocking' THEN 1
                            WHEN 'risk' THEN 2
                            WHEN 'review' THEN 3
                            ELSE 4
                        END,
                        weight DESC,
                        id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["document_qa_evidence"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM document_qa_evidence
                    WHERE parcel_key = ?
                    ORDER BY importance DESC, source_type, id
                    LIMIT 30
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["review_tasks"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT rt.*,
                           w.status AS warning_status,
                           (SELECT COUNT(*) FROM review_task_evidence rte WHERE rte.task_id = rt.id) AS linked_evidence_count,
                           (SELECT COUNT(*) FROM review_decisions rd WHERE rd.task_id = rt.id) AS decision_count
                    FROM review_tasks rt
                    LEFT JOIN warnings w ON w.id = rt.warning_id
                    WHERE rt.parcel_key = ?
                    ORDER BY
                        CASE rt.status WHEN 'open' THEN 1 WHEN 'reviewing' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END,
                        rt.priority DESC,
                        rt.id
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["company_project_example"] = row_to_dict(
                conn.execute(
                    """
                    SELECT * FROM company_project_examples
                    WHERE parcel_key = ?
                    ORDER BY risk_task_count DESC, example_key
                    LIMIT 1
                    """,
                    (parcel_key,),
                ).fetchone()
            )
            parcel["company_layout_patterns"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT clp.*
                    FROM company_layout_patterns clp
                    WHERE EXISTS (
                        SELECT 1 FROM cad_unit_candidates cuc
                        WHERE cuc.parcel_key = ?
                          AND COALESCE(cuc.unit_type, 'unknown') = COALESCE(clp.unit_type, 'unknown')
                          AND COALESCE(cuc.room_mix, 'unknown') = COALESCE(clp.room_mix, 'unknown')
                    )
                    ORDER BY
                        CASE clp.pattern_status WHEN 'strong' THEN 1 ELSE 2 END,
                        clp.sample_count DESC,
                        clp.pattern_key
                    LIMIT 12
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["company_sharing_patterns"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM company_sharing_patterns
                    WHERE parcel_key = ?
                    ORDER BY risk_score DESC, pattern_key
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["automation_engine_modules"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM automation_engine_modules
                    ORDER BY sequence_no, module_key
                    """
                ).fetchall()
            )
            parcel["input_projects"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT ip.*,
                           zi.parcel_area_m2,
                           zi.taks,
                           zi.kaks_or_emsal,
                           zi.max_floor_count,
                           (SELECT COUNT(*) FROM existing_area_inputs eai WHERE eai.project_key = ip.project_key) AS existing_area_input_count,
                           (SELECT COUNT(*) FROM engine_runs er WHERE er.project_key = ip.project_key) AS engine_run_count,
                           (SELECT er.status FROM engine_runs er WHERE er.project_key = ip.project_key ORDER BY er.started_at DESC, er.run_key DESC LIMIT 1) AS latest_run_status
                    FROM input_projects ip
                    LEFT JOIN zoning_inputs zi ON zi.project_key = ip.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY ip.created_at DESC, ip.project_key
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["engine_runs"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT er.*
                    FROM engine_runs er
                    JOIN input_projects ip ON ip.project_key = er.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, er.run_key DESC
                    LIMIT 12
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["engine_run_steps"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT ers.*
                    FROM engine_run_steps ers
                    JOIN engine_runs er ON er.run_key = ers.run_key
                    JOIN input_projects ip ON ip.project_key = er.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, ers.sequence_no
                    LIMIT 40
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["building_envelope_results"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT ber.*
                    FROM building_envelope_results ber
                    JOIN input_projects ip ON ip.project_key = ber.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY ber.id DESC
                    LIMIT 8
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["core_placement_results"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT cpr.*
                    FROM core_placement_results cpr
                    JOIN engine_runs er ON er.run_key = cpr.run_key
                    JOIN input_projects ip ON ip.project_key = cpr.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, cpr.id DESC
                    LIMIT 8
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["unit_layout_options"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT ulo.*
                    FROM unit_layout_options ulo
                    JOIN engine_runs er ON er.run_key = ulo.run_key
                    JOIN input_projects ip ON ip.project_key = ulo.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, ulo.option_rank
                    LIMIT 18
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["unit_mix_options"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT umo.*
                    FROM unit_mix_options umo
                    JOIN engine_runs er ON er.run_key = umo.run_key
                    JOIN input_projects ip ON ip.project_key = umo.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, umo.option_key, umo.id
                    LIMIT 54
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["floor_plan_options"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT fpo.*
                    FROM floor_plan_options fpo
                    JOIN engine_runs er ON er.run_key = fpo.run_key
                    JOIN input_projects ip ON ip.project_key = fpo.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, fpo.plan_rank
                    LIMIT 18
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["floor_plan_zones"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT fpz.*
                    FROM floor_plan_zones fpz
                    JOIN floor_plan_options fpo ON fpo.plan_key = fpz.plan_key
                    JOIN engine_runs er ON er.run_key = fpz.run_key
                    JOIN input_projects ip ON ip.project_key = fpz.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, fpo.plan_rank, fpz.id
                    LIMIT 180
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["floor_plan_findings"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT fpf.*
                    FROM floor_plan_findings fpf
                    JOIN floor_plan_options fpo ON fpo.plan_key = fpf.plan_key
                    JOIN engine_runs er ON er.run_key = fpf.run_key
                    JOIN input_projects ip ON ip.project_key = fpf.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, fpo.plan_rank,
                        CASE fpf.severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                        fpf.id
                    LIMIT 80
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["sharing_payment_options"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT spo.*
                    FROM sharing_payment_options spo
                    JOIN engine_runs er ON er.run_key = spo.run_key
                    JOIN input_projects ip ON ip.project_key = spo.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, spo.sharing_rank
                    LIMIT 18
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["sharing_unit_allocations"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT sua.*
                    FROM sharing_unit_allocations sua
                    JOIN engine_runs er ON er.run_key = sua.run_key
                    JOIN input_projects ip ON ip.project_key = sua.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, sua.sharing_key, sua.role, sua.id
                    LIMIT 108
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["offer_data_packages"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT odp.*
                    FROM offer_data_packages odp
                    JOIN engine_runs er ON er.run_key = odp.run_key
                    JOIN input_projects ip ON ip.project_key = odp.project_key
                    WHERE ip.parcel_key = ?
                    ORDER BY er.started_at DESC, odp.package_key
                    LIMIT 8
                    """,
                    (parcel_key,),
                ).fetchall()
            )
            parcel["warnings"] = rows_to_dicts(
                conn.execute("SELECT * FROM warnings WHERE parcel_key = ? ORDER BY status, level, id", (parcel_key,)).fetchall()
            )
            self.send_json(parcel)

    def handle_parcel_files(self, parcel_key: str) -> None:
        with self.conn as conn:
            rows = conn.execute(
                """
                SELECT sf.* FROM source_files sf
                JOIN parcel_source_files psf ON psf.file_id = sf.file_id
                WHERE psf.parcel_key = ?
                ORDER BY sf.stage, sf.kind, sf.relative_path
                """,
                (parcel_key,),
            ).fetchall()
            self.send_json({"parcel_key": parcel_key, "total": len(rows), "data": rows_to_dicts(rows)})

    def handle_source_files(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "sf.kind", params, "kind")
        add_filter(where, values, "sf.stage", params, "stage")
        like_filter(where, values, ["sf.relative_path", "sf.absolute_path", "sf.kind", "sf.stage"], (params.get("q") or [None])[0])
        parcel_key = (params.get("parcel_key") or [None])[0]
        join = ""
        if parcel_key:
            join = "JOIN parcel_source_files psf ON psf.file_id = sf.file_id"
            where.append("psf.parcel_key = ?")
            values.append(parcel_key)
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM source_files sf {join} {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT sf.* FROM source_files sf {join}
                {where_sql}
                ORDER BY sf.stage, sf.kind, sf.relative_path
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_source_file_detail(self, file_id: str) -> None:
        with self.conn as conn:
            source = row_to_dict(conn.execute("SELECT * FROM source_files WHERE file_id = ?", (file_id,)).fetchone())
            if not source:
                self.send_json({"error": "source_file_not_found", "file_id": file_id}, 404)
                return
            source["parcels"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT p.* FROM parcels p
                    JOIN parcel_source_files psf ON psf.parcel_key = p.parcel_key
                    WHERE psf.file_id = ?
                    ORDER BY p.ada, p.parsel
                    """,
                    (file_id,),
                ).fetchall()
            )
            self.send_json(source)

    def handle_cad_units(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "offer_match_status", params)
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "primary_method", "offer_match_status"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM cad_unit_plans {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM cad_unit_plans
                {where_sql}
                ORDER BY confidence_score DESC, parcel_key, id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_cad_unit_candidates(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "method", params)
        add_filter(where, values, "unit_type", params)
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "candidate_key", "method", "unit_type", "room_mix"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM cad_unit_candidates {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM cad_unit_candidates
                {where_sql}
                ORDER BY
                    CASE method WHEN 'net_area_label' THEN 1 ELSE 2 END,
                    confidence_score DESC,
                    parcel_key,
                    id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_cad_unit_findings(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "severity", params)
        add_filter(where, values, "code", params)
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "severity", "code", "message", "recommendation"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM cad_unit_findings {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM cad_unit_findings
                {where_sql}
                ORDER BY
                    CASE severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                    parcel_key,
                    id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_proposal_v2(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        like_filter(
            where,
            values,
            ["parcel_key", "title_parcel_key", "body_parcel_key", "relative_path", "proposal_date"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM proposal_v2_records {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM proposal_v2_records
                {where_sql}
                ORDER BY parcel_key, relative_path, id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_proposal_v2_terms(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "group_name", params)
        add_filter(where, values, "term_type", params)
        add_filter(where, values, "label", params)
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "group_name", "term_type", "label", "floor", "excerpt"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM proposal_v2_terms {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM proposal_v2_terms
                {where_sql}
                ORDER BY parcel_key, group_name, proposal_record_id, id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_contract_rules(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "risk_level", params)
        add_filter(where, values, "decision_recommendation", params, "decision")
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "risk_level", "decision_recommendation"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM contract_rule_evaluations {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM contract_rule_evaluations
                {where_sql}
                ORDER BY risk_score DESC, parcel_key, id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_contract_rule_findings(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "severity", params)
        add_filter(where, values, "code", params)
        like_filter(
            where,
            values,
            ["parcel_key", "relative_path", "severity", "code", "title", "message", "recommendation", "evidence"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM contract_rule_findings {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM contract_rule_findings
                {where_sql}
                ORDER BY
                    CASE severity
                        WHEN 'blocking' THEN 1
                        WHEN 'risk' THEN 2
                        WHEN 'review' THEN 3
                        ELSE 4
                    END,
                    weight DESC,
                    parcel_key,
                    id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_document_qa_evidence(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "source_type", params)
        tokens = query_tokens((params.get("q") or [None])[0])
        for token in tokens:
            where.append("search_text LIKE ?")
            values.append(f"%{token}%")
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM document_qa_evidence {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM document_qa_evidence
                {where_sql}
                ORDER BY importance DESC, source_type, id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            data = rows_to_dicts(rows)
            if tokens:
                for item in data:
                    item["score"] = evidence_score(item, tokens)
                data.sort(key=lambda item: (-item["score"], -int(item.get("importance") or 0), item.get("evidence_id") or ""))
            self.send_json({"total": total, "limit": limit, "offset": offset, "query_tokens": tokens, "data": data})

    def handle_document_qa_ask(self, params: dict[str, list[str]]) -> None:
        parcel_key = (params.get("parcel_key") or [None])[0]
        query = ((params.get("q") or [""])[0] or "").strip()
        limit = int_param(params, "limit", 6, 20) or 6
        tokens = query_tokens(query)

        def fetch(conn: sqlite3.Connection, *, match_all: bool, scoped: bool, fallback_top: bool = False) -> list[sqlite3.Row]:
            where: list[str] = []
            values: list[Any] = []
            if scoped and parcel_key:
                where.append("parcel_key = ?")
                values.append(parcel_key)
            if tokens and not fallback_top:
                joiner = " AND " if match_all else " OR "
                where.append("(" + joiner.join("search_text LIKE ?" for _ in tokens) + ")")
                values.extend([f"%{token}%" for token in tokens])
            where_sql = f"WHERE {' AND '.join(where)}" if where else ""
            return conn.execute(
                f"""
                SELECT * FROM document_qa_evidence
                {where_sql}
                ORDER BY importance DESC, source_type, id
                LIMIT 250
                """,
                values,
            ).fetchall()

        with self.conn as conn:
            collected: dict[str, sqlite3.Row] = {}
            for row in fetch(conn, match_all=True, scoped=True):
                collected[row["evidence_id"]] = row
            if len(collected) < limit and tokens:
                for row in fetch(conn, match_all=False, scoped=True):
                    collected.setdefault(row["evidence_id"], row)
            if len(collected) < limit and parcel_key:
                for row in fetch(conn, match_all=True, scoped=True, fallback_top=True):
                    collected.setdefault(row["evidence_id"], row)
            if len(collected) < limit:
                for row in fetch(conn, match_all=False, scoped=False):
                    collected.setdefault(row["evidence_id"], row)
            evidence = rows_to_dicts(list(collected.values()))

        for item in evidence:
            item["score"] = evidence_score(item, tokens)
        evidence.sort(key=lambda item: (-item["score"], -int(item.get("importance") or 0), item.get("evidence_id") or ""))
        evidence = evidence[:limit]

        if not evidence:
            answer = "Bu sorgu icin kanit bulunamadi."
        else:
            subject = f"{parcel_key} icin" if parcel_key else "Genel sorgu icin"
            top_lines = [f"{item.get('source_type')}: {item.get('summary')}" for item in evidence[:3]]
            answer = f"{subject} en guclu kanitlar: " + " ".join(top_lines)

        self.send_json(
            {
                "query": query,
                "query_tokens": tokens,
                "parcel_key": parcel_key,
                "answer": answer,
                "evidence": evidence,
                "suggested_actions": answer_actions(evidence),
            }
        )

    def handle_review_tasks(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "rt.parcel_key", params, "parcel_key")
        add_filter(where, values, "rt.status", params, "status")
        add_filter(where, values, "rt.level", params, "level")
        add_filter(where, values, "rt.category", params, "category")
        like_filter(
            where,
            values,
            ["rt.task_key", "rt.parcel_key", "rt.warning_code", "rt.title", "rt.summary", "rt.required_action"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM review_tasks rt {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT rt.*,
                       w.status AS warning_status,
                       (SELECT COUNT(*) FROM review_task_evidence rte WHERE rte.task_id = rt.id) AS linked_evidence_count,
                       (SELECT COUNT(*) FROM review_decisions rd WHERE rd.task_id = rt.id) AS decision_count
                FROM review_tasks rt
                LEFT JOIN warnings w ON w.id = rt.warning_id
                {where_sql}
                ORDER BY
                    CASE rt.status WHEN 'open' THEN 1 WHEN 'reviewing' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END,
                    rt.priority DESC,
                    rt.parcel_key,
                    rt.id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def review_task_payload(self, conn: sqlite3.Connection, task_id: int) -> dict[str, Any] | None:
        task = row_to_dict(
            conn.execute(
                """
                SELECT rt.*,
                       w.status AS warning_status,
                       (SELECT COUNT(*) FROM review_task_evidence rte WHERE rte.task_id = rt.id) AS linked_evidence_count,
                       (SELECT COUNT(*) FROM review_decisions rd WHERE rd.task_id = rt.id) AS decision_count
                FROM review_tasks rt
                LEFT JOIN warnings w ON w.id = rt.warning_id
                WHERE rt.id = ?
                """,
                (task_id,),
            ).fetchone()
        )
        if not task:
            return None
        task["warning"] = row_to_dict(conn.execute("SELECT * FROM warnings WHERE id = ?", (task["warning_id"],)).fetchone())
        task["evidence"] = rows_to_dicts(
            conn.execute(
                """
                SELECT rte.rank, rte.relevance_score, rte.note, dqa.*
                FROM review_task_evidence rte
                JOIN document_qa_evidence dqa ON dqa.evidence_id = rte.evidence_id
                WHERE rte.task_id = ?
                ORDER BY rte.rank, rte.id
                """,
                (task_id,),
            ).fetchall()
        )
        task["decisions"] = rows_to_dicts(
            conn.execute(
                "SELECT * FROM review_decisions WHERE task_id = ? ORDER BY id DESC",
                (task_id,),
            ).fetchall()
        )
        return task

    def handle_review_task_detail(self, task_id: int) -> None:
        with self.conn as conn:
            task = self.review_task_payload(conn, task_id)
            if not task:
                self.send_json({"error": "review_task_not_found", "id": task_id}, 404)
                return
            self.send_json(task)

    def handle_company_dataset(self) -> None:
        with self.conn as conn:
            meta = {row["key"]: row["value"] for row in conn.execute("SELECT key, value FROM meta")}
            profile = row_to_dict(conn.execute("SELECT * FROM company_profiles ORDER BY company_key LIMIT 1").fetchone())
            modules = rows_to_dicts(
                conn.execute("SELECT * FROM automation_engine_modules ORDER BY sequence_no, module_key").fetchall()
            )
            top_layout_patterns = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM company_layout_patterns
                    ORDER BY
                        CASE pattern_status WHEN 'strong' THEN 1 ELSE 2 END,
                        sample_count DESC,
                        pattern_key
                    LIMIT 12
                    """
                ).fetchall()
            )
            sharing_status = rows_to_dicts(
                conn.execute(
                    """
                    SELECT pattern_status AS status, COUNT(*) AS count
                    FROM company_sharing_patterns
                    GROUP BY pattern_status
                    ORDER BY count DESC, pattern_status
                    """
                ).fetchall()
            )
            payload = inspect_database(self.db_file)
            payload.update(
                {
                    "profile": profile,
                    "input_schema": parse_json_field(meta.get("company_dataset_input_schema_json"), {}),
                    "company_dataset_summary": parse_json_field(meta.get("company_dataset_summary_json"), {}),
                    "modules": modules,
                    "top_layout_patterns": top_layout_patterns,
                    "sharing_status": sharing_status,
                }
            )
            self.send_json(payload)

    def handle_company_project_examples(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "cpe.parcel_key", params, "parcel_key")
        add_filter(where, values, "cpe.status", params, "status")
        add_filter(where, values, "cpe.reconciliation_quality", params, "quality")
        like_filter(
            where,
            values,
            ["cpe.example_key", "cpe.parcel_key", "cpe.status", "cpe.reconciliation_quality"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM company_project_examples cpe {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT cpe.*
                FROM company_project_examples cpe
                {where_sql}
                ORDER BY cpe.risk_task_count DESC, cpe.ada, cpe.parsel, cpe.example_key
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_company_layout_patterns(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "unit_type", params)
        add_filter(where, values, "room_mix", params)
        add_filter(where, values, "pattern_role", params)
        add_filter(where, values, "pattern_status", params)
        like_filter(
            where,
            values,
            ["pattern_key", "unit_type", "room_mix", "pattern_role", "pattern_status"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM company_layout_patterns {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM company_layout_patterns
                {where_sql}
                ORDER BY
                    CASE pattern_status WHEN 'strong' THEN 1 ELSE 2 END,
                    sample_count DESC,
                    pattern_key
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_company_sharing_patterns(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "parcel_key", params)
        add_filter(where, values, "risk_level", params)
        add_filter(where, values, "pattern_status", params)
        like_filter(
            where,
            values,
            ["pattern_key", "parcel_key", "relative_path", "risk_level", "decision_recommendation", "pattern_status"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM company_sharing_patterns {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT * FROM company_sharing_patterns
                {where_sql}
                ORDER BY risk_score DESC, parcel_key, pattern_key
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_automation_modules(self, params: dict[str, list[str]]) -> None:
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "status", params)
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM automation_engine_modules
                {where_sql}
                ORDER BY sequence_no, module_key
                """,
                values,
            ).fetchall()
            self.send_json({"total": len(rows), "data": rows_to_dicts(rows)})

    def input_project_payload(self, conn: sqlite3.Connection, project_key: str) -> dict[str, Any] | None:
        project = row_to_dict(conn.execute("SELECT * FROM input_projects WHERE project_key = ?", (project_key,)).fetchone())
        if not project:
            return None
        project["zoning_input"] = row_to_dict(conn.execute("SELECT * FROM zoning_inputs WHERE project_key = ?", (project_key,)).fetchone())
        project["existing_area_inputs"] = rows_to_dicts(
            conn.execute("SELECT * FROM existing_area_inputs WHERE project_key = ? ORDER BY id", (project_key,)).fetchall()
        )
        project["engine_runs"] = rows_to_dicts(
            conn.execute("SELECT * FROM engine_runs WHERE project_key = ? ORDER BY started_at DESC, run_key DESC", (project_key,)).fetchall()
        )
        project["building_envelope_results"] = rows_to_dicts(
            conn.execute("SELECT * FROM building_envelope_results WHERE project_key = ? ORDER BY id DESC", (project_key,)).fetchall()
        )
        project["core_placement_results"] = rows_to_dicts(
            conn.execute("SELECT * FROM core_placement_results WHERE project_key = ? ORDER BY id DESC", (project_key,)).fetchall()
        )
        project["unit_layout_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM unit_layout_options WHERE project_key = ? ORDER BY run_key DESC, option_rank", (project_key,)).fetchall()
        )
        project["unit_mix_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM unit_mix_options WHERE project_key = ? ORDER BY run_key DESC, option_key, id", (project_key,)).fetchall()
        )
        project["floor_plan_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM floor_plan_options WHERE project_key = ? ORDER BY run_key DESC, plan_rank", (project_key,)).fetchall()
        )
        project["floor_plan_zones"] = rows_to_dicts(
            conn.execute("SELECT * FROM floor_plan_zones WHERE project_key = ? ORDER BY run_key DESC, plan_key, id", (project_key,)).fetchall()
        )
        project["floor_plan_findings"] = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM floor_plan_findings
                WHERE project_key = ?
                ORDER BY run_key DESC,
                    CASE severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                    plan_key,
                    id
                """,
                (project_key,),
            ).fetchall()
        )
        project["sharing_payment_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM sharing_payment_options WHERE project_key = ? ORDER BY run_key DESC, sharing_rank", (project_key,)).fetchall()
        )
        project["sharing_unit_allocations"] = rows_to_dicts(
            conn.execute("SELECT * FROM sharing_unit_allocations WHERE project_key = ? ORDER BY run_key DESC, sharing_key, role, id", (project_key,)).fetchall()
        )
        project["offer_data_packages"] = rows_to_dicts(
            conn.execute("SELECT * FROM offer_data_packages WHERE project_key = ? ORDER BY run_key DESC, package_key", (project_key,)).fetchall()
        )
        return project

    def engine_run_payload(self, conn: sqlite3.Connection, run_key: str) -> dict[str, Any] | None:
        run = row_to_dict(conn.execute("SELECT * FROM engine_runs WHERE run_key = ?", (run_key,)).fetchone())
        if not run:
            return None
        run["project"] = row_to_dict(conn.execute("SELECT * FROM input_projects WHERE project_key = ?", (run["project_key"],)).fetchone())
        run["steps"] = rows_to_dicts(
            conn.execute("SELECT * FROM engine_run_steps WHERE run_key = ? ORDER BY sequence_no, id", (run_key,)).fetchall()
        )
        run["building_envelope"] = row_to_dict(
            conn.execute("SELECT * FROM building_envelope_results WHERE run_key = ?", (run_key,)).fetchone()
        )
        run["core_placement"] = row_to_dict(
            conn.execute("SELECT * FROM core_placement_results WHERE run_key = ?", (run_key,)).fetchone()
        )
        run["unit_layout_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM unit_layout_options WHERE run_key = ? ORDER BY option_rank", (run_key,)).fetchall()
        )
        run["unit_mix_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM unit_mix_options WHERE run_key = ? ORDER BY option_key, id", (run_key,)).fetchall()
        )
        run["floor_plan_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM floor_plan_options WHERE run_key = ? ORDER BY plan_rank", (run_key,)).fetchall()
        )
        run["floor_plan_zones"] = rows_to_dicts(
            conn.execute("SELECT * FROM floor_plan_zones WHERE run_key = ? ORDER BY plan_key, id", (run_key,)).fetchall()
        )
        run["floor_plan_findings"] = rows_to_dicts(
            conn.execute(
                """
                SELECT * FROM floor_plan_findings
                WHERE run_key = ?
                ORDER BY
                    CASE severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                    plan_key,
                    id
                """,
                (run_key,),
            ).fetchall()
        )
        run["sharing_payment_options"] = rows_to_dicts(
            conn.execute("SELECT * FROM sharing_payment_options WHERE run_key = ? ORDER BY sharing_rank", (run_key,)).fetchall()
        )
        run["sharing_unit_allocations"] = rows_to_dicts(
            conn.execute("SELECT * FROM sharing_unit_allocations WHERE run_key = ? ORDER BY sharing_key, role, id", (run_key,)).fetchall()
        )
        run["offer_data_package"] = row_to_dict(
            conn.execute("SELECT * FROM offer_data_packages WHERE run_key = ?", (run_key,)).fetchone()
        )
        return run

    def handle_input_projects(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "ip.parcel_key", params, "parcel_key")
        add_filter(where, values, "ip.status", params, "status")
        like_filter(
            where,
            values,
            ["ip.project_key", "ip.project_name", "ip.parcel_key", "ip.status", "ip.source_mode", "ip.manual_notes"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM input_projects ip {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT ip.*,
                       zi.parcel_area_m2,
                       zi.taks,
                       zi.kaks_or_emsal,
                       zi.max_floor_count,
                       (SELECT COUNT(*) FROM existing_area_inputs eai WHERE eai.project_key = ip.project_key) AS existing_area_input_count,
                       (SELECT COUNT(*) FROM engine_runs er WHERE er.project_key = ip.project_key) AS engine_run_count,
                       (SELECT er.status FROM engine_runs er WHERE er.project_key = ip.project_key ORDER BY er.started_at DESC, er.run_key DESC LIMIT 1) AS latest_run_status
                FROM input_projects ip
                LEFT JOIN zoning_inputs zi ON zi.project_key = ip.project_key
                {where_sql}
                ORDER BY ip.created_at DESC, ip.project_key
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_input_project_detail(self, project_key: str) -> None:
        with self.conn as conn:
            project = self.input_project_payload(conn, project_key)
            if not project:
                self.send_json({"error": "input_project_not_found", "project_key": project_key}, 404)
                return
            self.send_json(project)

    def handle_create_input_project(self) -> None:
        payload = self.read_json_body()
        try:
            with self.conn as conn:
                project_key = create_input_project(conn, payload)
                run_now = bool(payload.get("run_now"))
                run_key = None
                if run_now:
                    run_result = run_engine_for_project(
                        conn,
                        project_key,
                        triggered_by=payload.get("created_by") or "api",
                    )
                    run_key = run_result["run_key"]
                project = self.input_project_payload(conn, project_key)
                if run_key:
                    project["latest_run"] = self.engine_run_payload(conn, run_key)
                self.send_json(project, 201)
        except ValueError as exc:
            self.send_json({"error": "invalid_input_project", "detail": str(exc)}, 400)

    def handle_create_engine_run(self, project_key: str) -> None:
        payload = self.read_json_body()
        try:
            with self.conn as conn:
                result = run_engine_for_project(
                    conn,
                    project_key,
                    triggered_by=payload.get("triggered_by") or "api",
                )
                run = self.engine_run_payload(conn, result["run_key"])
                self.send_json(run, 201)
        except ValueError as exc:
            status = 404 if str(exc) == "input_project_not_found" else 400
            self.send_json({"error": "engine_run_failed", "detail": str(exc)}, status)

    def handle_engine_runs(self, params: dict[str, list[str]], project_key: str | None = None) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        if project_key:
            where.append("er.project_key = ?")
            values.append(project_key)
        else:
            add_filter(where, values, "er.project_key", params, "project_key")
        add_filter(where, values, "er.status", params, "status")
        like_filter(
            where,
            values,
            ["er.run_key", "er.project_key", "er.status", "er.engine_version", "ip.project_name"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM engine_runs er
                JOIN input_projects ip ON ip.project_key = er.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT er.*, ip.parcel_key, ip.project_name
                FROM engine_runs er
                JOIN input_projects ip ON ip.project_key = er.project_key
                {where_sql}
                ORDER BY er.started_at DESC, er.run_key DESC
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_engine_run_detail(self, run_key: str) -> None:
        with self.conn as conn:
            run = self.engine_run_payload(conn, run_key)
            if not run:
                self.send_json({"error": "engine_run_not_found", "run_key": run_key}, 404)
                return
            self.send_json(run)

    def handle_core_placement_results(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "cpr.project_key", params, "project_key")
        add_filter(where, values, "cpr.run_key", params, "run_key")
        add_filter(where, values, "cpr.core_type", params, "core_type")
        like_filter(
            where,
            values,
            ["cpr.run_key", "cpr.project_key", "cpr.core_type", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM core_placement_results cpr
                JOIN engine_runs er ON er.run_key = cpr.run_key
                JOIN input_projects ip ON ip.project_key = cpr.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT cpr.*, ip.parcel_key, ip.project_name
                FROM core_placement_results cpr
                JOIN engine_runs er ON er.run_key = cpr.run_key
                JOIN input_projects ip ON ip.project_key = cpr.project_key
                {where_sql}
                ORDER BY er.started_at DESC, cpr.id DESC
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_unit_layout_options(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "ulo.project_key", params, "project_key")
        add_filter(where, values, "ulo.run_key", params, "run_key")
        add_filter(where, values, "ulo.strategy_key", params, "strategy_key")
        like_filter(
            where,
            values,
            ["ulo.option_key", "ulo.option_name", "ulo.strategy_key", "ulo.project_key", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM unit_layout_options ulo
                JOIN engine_runs er ON er.run_key = ulo.run_key
                JOIN input_projects ip ON ip.project_key = ulo.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT ulo.*, ip.parcel_key, ip.project_name
                FROM unit_layout_options ulo
                JOIN engine_runs er ON er.run_key = ulo.run_key
                JOIN input_projects ip ON ip.project_key = ulo.project_key
                {where_sql}
                ORDER BY er.started_at DESC, ulo.option_rank
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_unit_layout_option_detail(self, option_key: str) -> None:
        with self.conn as conn:
            option = row_to_dict(conn.execute("SELECT * FROM unit_layout_options WHERE option_key = ?", (option_key,)).fetchone())
            if not option:
                self.send_json({"error": "unit_layout_option_not_found", "option_key": option_key}, 404)
                return
            option["mixes"] = rows_to_dicts(
                conn.execute("SELECT * FROM unit_mix_options WHERE option_key = ? ORDER BY id", (option_key,)).fetchall()
            )
            self.send_json(option)

    def handle_unit_mix_options(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "umo.project_key", params, "project_key")
        add_filter(where, values, "umo.run_key", params, "run_key")
        add_filter(where, values, "umo.option_key", params, "option_key")
        add_filter(where, values, "umo.room_mix", params, "room_mix")
        like_filter(
            where,
            values,
            ["umo.option_key", "umo.unit_type", "umo.room_mix", "umo.pattern_key", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM unit_mix_options umo
                JOIN engine_runs er ON er.run_key = umo.run_key
                JOIN input_projects ip ON ip.project_key = umo.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT umo.*, ip.parcel_key, ip.project_name
                FROM unit_mix_options umo
                JOIN engine_runs er ON er.run_key = umo.run_key
                JOIN input_projects ip ON ip.project_key = umo.project_key
                {where_sql}
                ORDER BY er.started_at DESC, umo.option_key, umo.id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_floor_plan_options(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "fpo.project_key", params, "project_key")
        add_filter(where, values, "fpo.run_key", params, "run_key")
        add_filter(where, values, "fpo.layout_option_key", params, "layout_option_key")
        add_filter(where, values, "fpo.plan_type", params, "plan_type")
        like_filter(
            where,
            values,
            ["fpo.plan_key", "fpo.plan_name", "fpo.plan_type", "fpo.layout_option_key", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM floor_plan_options fpo
                JOIN engine_runs er ON er.run_key = fpo.run_key
                JOIN input_projects ip ON ip.project_key = fpo.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT fpo.*, ip.parcel_key, ip.project_name
                FROM floor_plan_options fpo
                JOIN engine_runs er ON er.run_key = fpo.run_key
                JOIN input_projects ip ON ip.project_key = fpo.project_key
                {where_sql}
                ORDER BY er.started_at DESC, fpo.plan_rank
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_floor_plan_option_detail(self, plan_key: str) -> None:
        with self.conn as conn:
            option = row_to_dict(conn.execute("SELECT * FROM floor_plan_options WHERE plan_key = ?", (plan_key,)).fetchone())
            if not option:
                self.send_json({"error": "floor_plan_option_not_found", "plan_key": plan_key}, 404)
                return
            option["zones"] = rows_to_dicts(
                conn.execute("SELECT * FROM floor_plan_zones WHERE plan_key = ? ORDER BY id", (plan_key,)).fetchall()
            )
            option["findings"] = rows_to_dicts(
                conn.execute(
                    """
                    SELECT * FROM floor_plan_findings
                    WHERE plan_key = ?
                    ORDER BY CASE severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END, id
                    """,
                    (plan_key,),
                ).fetchall()
            )
            self.send_json(option)

    def handle_floor_plan_zones(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 120)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "fpz.project_key", params, "project_key")
        add_filter(where, values, "fpz.run_key", params, "run_key")
        add_filter(where, values, "fpz.plan_key", params, "plan_key")
        add_filter(where, values, "fpz.zone_type", params, "zone_type")
        like_filter(
            where,
            values,
            ["fpz.plan_key", "fpz.zone_key", "fpz.zone_type", "fpz.label", "fpz.room_mix", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM floor_plan_zones fpz
                JOIN floor_plan_options fpo ON fpo.plan_key = fpz.plan_key
                JOIN engine_runs er ON er.run_key = fpz.run_key
                JOIN input_projects ip ON ip.project_key = fpz.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT fpz.*, ip.parcel_key, ip.project_name
                FROM floor_plan_zones fpz
                JOIN floor_plan_options fpo ON fpo.plan_key = fpz.plan_key
                JOIN engine_runs er ON er.run_key = fpz.run_key
                JOIN input_projects ip ON ip.project_key = fpz.project_key
                {where_sql}
                ORDER BY er.started_at DESC, fpo.plan_rank, fpz.id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_floor_plan_findings(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "fpf.project_key", params, "project_key")
        add_filter(where, values, "fpf.run_key", params, "run_key")
        add_filter(where, values, "fpf.plan_key", params, "plan_key")
        add_filter(where, values, "fpf.severity", params, "severity")
        add_filter(where, values, "fpf.code", params, "code")
        like_filter(
            where,
            values,
            ["fpf.plan_key", "fpf.severity", "fpf.code", "fpf.message", "fpf.recommendation", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM floor_plan_findings fpf
                JOIN floor_plan_options fpo ON fpo.plan_key = fpf.plan_key
                JOIN engine_runs er ON er.run_key = fpf.run_key
                JOIN input_projects ip ON ip.project_key = fpf.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT fpf.*, ip.parcel_key, ip.project_name
                FROM floor_plan_findings fpf
                JOIN floor_plan_options fpo ON fpo.plan_key = fpf.plan_key
                JOIN engine_runs er ON er.run_key = fpf.run_key
                JOIN input_projects ip ON ip.project_key = fpf.project_key
                {where_sql}
                ORDER BY er.started_at DESC,
                    CASE fpf.severity WHEN 'risk' THEN 1 WHEN 'review' THEN 2 ELSE 3 END,
                    fpo.plan_rank,
                    fpf.id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_sharing_payment_options(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "spo.project_key", params, "project_key")
        add_filter(where, values, "spo.run_key", params, "run_key")
        add_filter(where, values, "spo.layout_option_key", params, "layout_option_key")
        add_filter(where, values, "spo.strategy_key", params, "strategy_key")
        like_filter(
            where,
            values,
            ["spo.sharing_key", "spo.option_name", "spo.strategy_key", "spo.project_key", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM sharing_payment_options spo
                JOIN engine_runs er ON er.run_key = spo.run_key
                JOIN input_projects ip ON ip.project_key = spo.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT spo.*, ip.parcel_key, ip.project_name
                FROM sharing_payment_options spo
                JOIN engine_runs er ON er.run_key = spo.run_key
                JOIN input_projects ip ON ip.project_key = spo.project_key
                {where_sql}
                ORDER BY er.started_at DESC, spo.sharing_rank
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_sharing_payment_option_detail(self, sharing_key: str) -> None:
        with self.conn as conn:
            option = row_to_dict(conn.execute("SELECT * FROM sharing_payment_options WHERE sharing_key = ?", (sharing_key,)).fetchone())
            if not option:
                self.send_json({"error": "sharing_payment_option_not_found", "sharing_key": sharing_key}, 404)
                return
            option["allocations"] = rows_to_dicts(
                conn.execute("SELECT * FROM sharing_unit_allocations WHERE sharing_key = ? ORDER BY role, id", (sharing_key,)).fetchall()
            )
            option["offer_data_package"] = row_to_dict(
                conn.execute("SELECT * FROM offer_data_packages WHERE sharing_key = ?", (sharing_key,)).fetchone()
            )
            self.send_json(option)

    def handle_sharing_unit_allocations(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "sua.project_key", params, "project_key")
        add_filter(where, values, "sua.run_key", params, "run_key")
        add_filter(where, values, "sua.sharing_key", params, "sharing_key")
        add_filter(where, values, "sua.role", params, "role")
        add_filter(where, values, "sua.room_mix", params, "room_mix")
        like_filter(
            where,
            values,
            ["sua.sharing_key", "sua.role", "sua.unit_type", "sua.room_mix", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM sharing_unit_allocations sua
                JOIN engine_runs er ON er.run_key = sua.run_key
                JOIN input_projects ip ON ip.project_key = sua.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT sua.*, ip.parcel_key, ip.project_name
                FROM sharing_unit_allocations sua
                JOIN engine_runs er ON er.run_key = sua.run_key
                JOIN input_projects ip ON ip.project_key = sua.project_key
                {where_sql}
                ORDER BY er.started_at DESC, sua.sharing_key, sua.role, sua.id
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_offer_data_packages(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 50)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "odp.project_key", params, "project_key")
        add_filter(where, values, "odp.run_key", params, "run_key")
        add_filter(where, values, "odp.package_status", params, "package_status")
        like_filter(
            where,
            values,
            ["odp.package_key", "odp.sharing_key", "odp.project_key", "odp.package_status", "ip.project_name", "ip.parcel_key"],
            (params.get("q") or [None])[0],
        )
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(
                f"""
                SELECT COUNT(*)
                FROM offer_data_packages odp
                JOIN engine_runs er ON er.run_key = odp.run_key
                JOIN input_projects ip ON ip.project_key = odp.project_key
                {where_sql}
                """,
                values,
            ).fetchone()[0]
            rows = conn.execute(
                f"""
                SELECT odp.*, ip.parcel_key, ip.project_name
                FROM offer_data_packages odp
                JOIN engine_runs er ON er.run_key = odp.run_key
                JOIN input_projects ip ON ip.project_key = odp.project_key
                {where_sql}
                ORDER BY er.started_at DESC, odp.package_key
                LIMIT ? OFFSET ?
                """,
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_offer_data_package_detail(self, package_key: str) -> None:
        with self.conn as conn:
            package = row_to_dict(conn.execute("SELECT * FROM offer_data_packages WHERE package_key = ?", (package_key,)).fetchone())
            if not package:
                self.send_json({"error": "offer_data_package_not_found", "package_key": package_key}, 404)
                return
            package["sharing_option"] = row_to_dict(
                conn.execute("SELECT * FROM sharing_payment_options WHERE sharing_key = ?", (package.get("sharing_key"),)).fetchone()
            )
            package["allocations"] = rows_to_dicts(
                conn.execute("SELECT * FROM sharing_unit_allocations WHERE sharing_key = ? ORDER BY role, id", (package.get("sharing_key"),)).fetchall()
            )
            self.send_json(package)

    def status_from_decision(self, decision_type: str) -> str:
        if decision_type in {"resolved", "approved_with_note"}:
            return "resolved"
        if decision_type == "ignored":
            return "ignored"
        if decision_type in {"open", "reopen"}:
            return "open"
        return "reviewing"

    def handle_create_review_decision(self, task_id: int) -> None:
        payload = self.read_json_body()
        decision_type = str(payload.get("decision_type") or "").strip()
        allowed = {
            "needs_review",
            "needs_legal_review",
            "needs_cad_review",
            "needs_offer_review",
            "approved_with_note",
            "resolved",
            "ignored",
            "hold",
            "open",
            "reopen",
        }
        if decision_type not in allowed:
            self.send_json({"error": "invalid_decision_type", "allowed": sorted(allowed)}, 400)
            return

        now = datetime.now().isoformat(timespec="seconds")
        with self.conn as conn:
            task_row = conn.execute("SELECT * FROM review_tasks WHERE id = ?", (task_id,)).fetchone()
            if not task_row:
                self.send_json({"error": "review_task_not_found", "id": task_id}, 404)
                return
            evidence_snapshot = rows_to_dicts(
                conn.execute(
                    """
                    SELECT rte.rank, rte.relevance_score, dqa.evidence_id, dqa.source_type,
                           dqa.source_path, dqa.title, dqa.summary, dqa.importance
                    FROM review_task_evidence rte
                    JOIN document_qa_evidence dqa ON dqa.evidence_id = rte.evidence_id
                    WHERE rte.task_id = ?
                    ORDER BY rte.rank, rte.id
                    """,
                    (task_id,),
                ).fetchall()
            )
            new_status = self.status_from_decision(decision_type)
            closed_at = now if new_status in {"resolved", "ignored"} else None
            conn.execute(
                """
                INSERT INTO review_decisions (
                    task_id, warning_id, parcel_key, decision_type, decision_label,
                    decision_note, created_by, created_at, evidence_snapshot_json, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    task_id,
                    task_row["warning_id"],
                    task_row["parcel_key"],
                    decision_type,
                    payload.get("decision_label"),
                    payload.get("decision_note"),
                    payload.get("created_by") or "human_review",
                    now,
                    json.dumps(evidence_snapshot, ensure_ascii=False),
                    json.dumps(payload, ensure_ascii=False),
                ),
            )
            conn.execute(
                "UPDATE review_tasks SET status = ?, updated_at = ?, closed_at = ? WHERE id = ?",
                (new_status, now, closed_at, task_id),
            )
            if task_row["warning_id"]:
                conn.execute(
                    "UPDATE warnings SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?",
                    (new_status, payload.get("decision_note"), now, task_row["warning_id"]),
                )
            task = self.review_task_payload(conn, task_id)
            self.send_json(task)

    def handle_warnings(self, params: dict[str, list[str]]) -> None:
        limit = int_param(params, "limit", 100)
        offset = int_param(params, "offset", 0, 100000)
        where: list[str] = []
        values: list[Any] = []
        add_filter(where, values, "status", params)
        add_filter(where, values, "level", params)
        add_filter(where, values, "code", params)
        add_filter(where, values, "parcel_key", params)
        like_filter(where, values, ["message", "source", "code", "parcel_key"], (params.get("q") or [None])[0])
        where_sql = f"WHERE {' AND '.join(where)}" if where else ""
        with self.conn as conn:
            total = conn.execute(f"SELECT COUNT(*) FROM warnings {where_sql}", values).fetchone()[0]
            rows = conn.execute(
                f"SELECT * FROM warnings {where_sql} ORDER BY status, level DESC, parcel_key, id LIMIT ? OFFSET ?",
                values + [limit, offset],
            ).fetchall()
            self.send_json({"total": total, "limit": limit, "offset": offset, "data": rows_to_dicts(rows)})

    def handle_update_warning(self, warning_id: int) -> None:
        payload = self.read_json_body()
        status = payload.get("status")
        if status not in {"open", "reviewing", "resolved", "ignored"}:
            self.send_json({"error": "invalid_status", "allowed": ["open", "reviewing", "resolved", "ignored"]}, 400)
            return
        note = payload.get("resolution_note")
        now = datetime.now().isoformat(timespec="seconds")
        with self.conn as conn:
            cur = conn.execute(
                "UPDATE warnings SET status = ?, resolution_note = ?, updated_at = ? WHERE id = ?",
                (status, note, now, warning_id),
            )
            if cur.rowcount == 0:
                self.send_json({"error": "warning_not_found", "id": warning_id}, 404)
                return
            row = conn.execute("SELECT * FROM warnings WHERE id = ?", (warning_id,)).fetchone()
            self.send_json(row_to_dict(row))

    def handle_search(self, params: dict[str, list[str]]) -> None:
        query = (params.get("q") or [""])[0].strip()
        if not query:
            self.send_json({"query": query, "parcels": [], "source_files": [], "warnings": []})
            return
        like = f"%{query}%"
        with self.conn as conn:
            parcels = conn.execute(
                "SELECT * FROM parcels WHERE parcel_key LIKE ? OR status LIKE ? OR reconciliation_quality LIKE ? ORDER BY ada, parsel LIMIT 20",
                (like, like, like),
            ).fetchall()
            source_files = conn.execute(
                "SELECT * FROM source_files WHERE relative_path LIKE ? OR kind LIKE ? OR stage LIKE ? ORDER BY stage, kind LIMIT 20",
                (like, like, like),
            ).fetchall()
            warnings = conn.execute(
                "SELECT * FROM warnings WHERE message LIKE ? OR code LIKE ? OR parcel_key LIKE ? ORDER BY id LIMIT 20",
                (like, like, like),
            ).fetchall()
            cad_findings = conn.execute(
                """
                SELECT * FROM cad_unit_findings
                WHERE message LIKE ? OR code LIKE ? OR parcel_key LIKE ?
                ORDER BY id LIMIT 20
                """,
                (like, like, like),
            ).fetchall()
            contract_findings = conn.execute(
                """
                SELECT * FROM contract_rule_findings
                WHERE message LIKE ? OR code LIKE ? OR parcel_key LIKE ? OR title LIKE ?
                ORDER BY weight DESC, id LIMIT 20
                """,
                (like, like, like, like),
            ).fetchall()
            document_qa = conn.execute(
                """
                SELECT * FROM document_qa_evidence
                WHERE search_text LIKE ?
                ORDER BY importance DESC, id LIMIT 20
                """,
                (f"%{normalize_search(query)}%",),
            ).fetchall()
            self.send_json(
                {
                    "query": query,
                    "parcels": rows_to_dicts(parcels),
                    "source_files": rows_to_dicts(source_files),
                    "warnings": rows_to_dicts(warnings),
                    "cad_findings": rows_to_dicts(cad_findings),
                    "contract_findings": rows_to_dicts(contract_findings),
                    "document_qa": rows_to_dicts(document_qa),
                }
            )


def run(host: str, port: int, db_file: Path) -> None:
    ApiHandler.db_file = db_file
    server = ThreadingHTTPServer((host, port), ApiHandler)
    print(f"Kentsel Automation API running at http://{host}:{port}")
    print(f"Database: {db_file}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Kentsel Automation JSON API.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    args = parser.parse_args()

    if not args.db.exists():
        import_seed(database_file=args.db, reset=True)
    else:
        init_db(args.db, reset=False)

    run(args.host, args.port, args.db)


if __name__ == "__main__":
    main()
