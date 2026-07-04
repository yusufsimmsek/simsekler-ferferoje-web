from __future__ import annotations

import json
import re
import sqlite3
import sys
import tempfile
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "kentsel_automation" / "backend"
sys.path.insert(0, str(BACKEND))

from database import DEFAULT_SEED_PATH, import_seed  # noqa: E402


def assert_equal(actual, expected, label: str) -> None:
    if actual != expected:
        raise AssertionError(f"{label}: expected {expected!r}, got {actual!r}")


def test_import() -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="kentsel_db_"))
    db_path = temp_dir / "test.db"
    result = import_seed(DEFAULT_SEED_PATH, db_path, reset=True)
    assert_equal(result["source_files"], 71, "source file count")
    assert_equal(result["parcels"], 20, "parcel count")
    assert_equal(result["cad_plans"], 11, "cad plan count")
    assert_equal(result["cad_unit_plans"], 11, "cad unit plan count")
    assert_equal(result["cad_unit_candidates"], 346, "cad unit candidate count")
    assert_equal(result["cad_unit_rooms"], 1492, "cad unit room count")
    assert_equal(result["cad_unit_findings"], 13, "cad unit finding count")
    assert_equal(result["excel_old_metraj"], 7, "excel count")
    assert_equal(result["proposal_summaries"], 11, "proposal count")
    assert_equal(result["proposal_v2_records"], 11, "proposal v2 record count")
    assert_equal(result["proposal_v2_terms"], 84, "proposal v2 term count")
    assert_equal(result["contract_rule_evaluations"], 11, "contract rule evaluation count")
    assert_equal(result["contract_rule_findings"], 38, "contract rule finding count")
    assert_equal(result["document_qa_evidence"], 659, "document qa evidence count")
    assert_equal(result["review_tasks"], 49, "review task count")
    assert_equal(result["review_task_evidence"], 147, "review task evidence count")
    assert_equal(result["review_decisions"], 0, "review decision count")
    assert_equal(result["company_profiles"], 1, "company profile count")
    assert_equal(result["company_project_examples"], 20, "company project example count")
    assert_equal(result["company_layout_patterns"], 18, "company layout pattern count")
    assert_equal(result["company_sharing_patterns"], 11, "company sharing pattern count")
    assert_equal(result["automation_engine_modules"], 9, "automation engine module count")
    assert_equal(result["input_projects"], 3, "input project count")
    assert_equal(result["zoning_inputs"], 3, "zoning input count")
    assert_equal(result["existing_area_inputs"], 3, "existing area input count")
    assert_equal(result["engine_runs"], 3, "engine run count")
    assert_equal(result["engine_run_steps"], 27, "engine run step count")
    assert_equal(result["building_envelope_results"], 3, "building envelope result count")
    assert_equal(result["core_placement_results"], 3, "core placement result count")
    assert_equal(result["unit_layout_options"], 9, "unit layout option count")
    assert_equal(result["unit_mix_options"], 27, "unit mix option count")
    assert_equal(result["floor_plan_options"], 9, "floor plan option count")
    assert_equal(result["floor_plan_zones"], 36, "floor plan zone count")
    assert_equal(result["floor_plan_findings"], 6, "floor plan finding count")
    assert_equal(result["sharing_payment_options"], 9, "sharing payment option count")
    assert_equal(result["sharing_unit_allocations"], 54, "sharing unit allocation count")
    assert_equal(result["offer_data_packages"], 3, "offer data package count")
    assert_equal(result["warnings"], 49, "warning count")

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        parcel = conn.execute("SELECT * FROM parcels WHERE parcel_key = '2532-1'").fetchone()
        assert parcel is not None
        assert_equal(parcel["status"], "matched", "2532-1 status")
        files = conn.execute("SELECT COUNT(*) FROM parcel_source_files WHERE parcel_key = '2532-1'").fetchone()[0]
        assert_equal(files, 4, "2532-1 source file links")
    return db_path


def test_running_api(base_url: str) -> None:
    def get(path: str):
        with urllib.request.urlopen(base_url + path, timeout=5) as response:
            body = response.read().decode("utf-8")
            if response.headers.get("Content-Type", "").startswith("application/json"):
                return json.loads(body)
            return body

    def post(path: str, payload: dict | None = None):
        body = json.dumps(payload or {}).encode("utf-8")
        request = urllib.request.Request(
            base_url + path,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))

    health = get("/health")
    assert health["ok"] is True
    summary = get("/api/summary")
    assert_equal(summary["parcels"], 20, "api parcel count")
    assert_equal(summary["document_qa_evidence"], 659, "api document qa evidence count")
    assert_equal(summary["review_tasks"], 49, "api review task count")
    assert_equal(summary["company_project_examples"], 20, "api company project example count")
    assert_equal(summary["company_layout_patterns"], 18, "api company layout pattern count")
    assert_equal(summary["company_sharing_patterns"], 11, "api company sharing pattern count")
    assert_equal(summary["automation_engine_modules"], 9, "api automation engine module count")
    assert_equal(summary["input_projects"], 3, "api input project count")
    assert_equal(summary["engine_runs"], 3, "api engine run count")
    assert_equal(summary["engine_run_steps"], 27, "api engine run step count")
    assert_equal(summary["building_envelope_results"], 3, "api building envelope result count")
    assert_equal(summary["core_placement_results"], 3, "api core placement result count")
    assert_equal(summary["unit_layout_options"], 9, "api unit layout option count")
    assert_equal(summary["unit_mix_options"], 27, "api unit mix option count")
    assert_equal(summary["floor_plan_options"], 9, "api floor plan option count")
    assert_equal(summary["floor_plan_zones"], 36, "api floor plan zone count")
    assert_equal(summary["floor_plan_findings"], 6, "api floor plan finding count")
    assert_equal(summary["sharing_payment_options"], 9, "api sharing payment option count")
    assert_equal(summary["sharing_unit_allocations"], 54, "api sharing unit allocation count")
    assert_equal(summary["offer_data_packages"], 3, "api offer data package count")
    parcel = get("/api/parcels/2532-1")
    assert_equal(parcel["parcel_key"], "2532-1", "api parcel detail")
    assert_equal(len(parcel["cad_plans"]), 1, "api parcel cad plans")
    assert_equal(len(parcel["cad_unit_plans"]), 1, "api parcel cad unit plans")
    if not parcel["cad_unit_candidates"]:
        raise AssertionError("api parcel cad unit candidates missing")
    if not parcel["cad_unit_findings"]:
        raise AssertionError("api parcel cad unit findings missing")
    assert_equal(len(parcel["proposal_v2_records"]), 1, "api parcel proposal v2 records")
    if not parcel["proposal_v2_terms"]:
        raise AssertionError("api parcel proposal v2 terms missing")
    assert_equal(len(parcel["contract_rule_evaluations"]), 1, "api parcel contract rule evaluations")
    if not parcel["contract_rule_findings"]:
        raise AssertionError("api parcel contract rule findings missing")
    if not parcel["document_qa_evidence"]:
        raise AssertionError("api parcel document qa evidence missing")
    if not parcel["review_tasks"]:
        raise AssertionError("api parcel review tasks missing")
    if not parcel["company_project_example"]:
        raise AssertionError("api parcel company dataset example missing")
    if not parcel["company_layout_patterns"]:
        raise AssertionError("api parcel company layout patterns missing")
    if not parcel["company_sharing_patterns"]:
        raise AssertionError("api parcel company sharing patterns missing")
    if len(parcel["automation_engine_modules"]) != 9:
        raise AssertionError("api parcel automation engine modules missing")
    if not parcel["input_projects"]:
        raise AssertionError("api parcel input projects missing")
    if not parcel["engine_runs"]:
        raise AssertionError("api parcel engine runs missing")
    if not parcel["engine_run_steps"]:
        raise AssertionError("api parcel engine run steps missing")
    if not parcel["building_envelope_results"]:
        raise AssertionError("api parcel building envelope results missing")
    if not parcel["core_placement_results"]:
        raise AssertionError("api parcel core placement results missing")
    if not parcel["unit_layout_options"]:
        raise AssertionError("api parcel unit layout options missing")
    if not parcel["unit_mix_options"]:
        raise AssertionError("api parcel unit mix options missing")
    if not parcel["floor_plan_options"] or not parcel["floor_plan_zones"]:
        raise AssertionError("api parcel floor plan outputs missing")
    if not parcel["sharing_payment_options"]:
        raise AssertionError("api parcel sharing payment options missing")
    if not parcel["sharing_unit_allocations"]:
        raise AssertionError("api parcel sharing unit allocations missing")
    if not parcel["offer_data_packages"]:
        raise AssertionError("api parcel offer data packages missing")
    proposal_v2 = get("/api/proposal-v2?parcel_key=2532-1")
    assert_equal(proposal_v2["total"], 1, "api proposal v2 filtered records")
    proposal_v2_terms = get("/api/proposal-v2/terms?parcel_key=2532-1&group_name=distribution_terms")
    if proposal_v2_terms["total"] < 1:
        raise AssertionError("api proposal v2 distribution terms missing")
    cad_units = get("/api/cad-units?parcel_key=2532-1")
    assert_equal(cad_units["total"], 1, "api cad units filtered plans")
    cad_candidates = get("/api/cad-units/candidates?parcel_key=2532-1")
    if cad_candidates["total"] < 1:
        raise AssertionError("api cad unit candidates missing")
    cad_findings = get("/api/cad-units/findings?parcel_key=2532-1")
    if cad_findings["total"] < 1:
        raise AssertionError("api cad unit findings missing")
    contract_rules = get("/api/contract-rules?parcel_key=2532-1")
    assert_equal(contract_rules["total"], 1, "api contract rule filtered evaluations")
    contract_findings = get("/api/contract-rules/findings?parcel_key=2532-1")
    if contract_findings["total"] < 1:
        raise AssertionError("api contract rule findings missing")
    document_evidence = get("/api/document-qa/evidence?parcel_key=2532-1&q=CAD")
    if document_evidence["total"] < 1:
        raise AssertionError("api document qa evidence search missing")
    document_answer = get("/api/document-qa/ask?parcel_key=2532-1&q=CAD&limit=5")
    if not document_answer["evidence"]:
        raise AssertionError("api document qa answer evidence missing")
    if "2532-1" not in document_answer["answer"]:
        raise AssertionError("api document qa answer did not include parcel key")
    review_tasks = get("/api/review-tasks?parcel_key=2532-1")
    if review_tasks["total"] < 1:
        raise AssertionError("api review tasks missing")
    task_id = review_tasks["data"][0]["id"]
    review_task = get(f"/api/review-tasks/{task_id}")
    if not review_task["evidence"]:
        raise AssertionError("api review task evidence missing")
    company_dataset = get("/api/company-dataset")
    assert_equal(company_dataset["company_project_examples"], 20, "api company dataset project count")
    if not company_dataset["profile"] or company_dataset["profile"]["company_key"] != "ilkbahar_insaat":
        raise AssertionError("api company dataset profile missing")
    layout_patterns = get("/api/company-dataset/layout-patterns?pattern_role=residential")
    if layout_patterns["total"] < 1:
        raise AssertionError("api company residential layout patterns missing")
    project_examples = get("/api/company-dataset/project-examples?parcel_key=2532-1")
    assert_equal(project_examples["total"], 1, "api company project examples filtered records")
    sharing_patterns = get("/api/company-dataset/sharing-patterns?parcel_key=2532-1")
    assert_equal(sharing_patterns["total"], 1, "api company sharing patterns filtered records")
    modules = get("/api/automation-core/modules")
    assert_equal(modules["total"], 9, "api automation modules count")
    input_projects = get("/api/input-projects")
    assert_equal(input_projects["total"], 3, "api input projects count")
    input_project = get("/api/input-projects/INPUT-2532-1")
    assert_equal(input_project["project_key"], "INPUT-2532-1", "api input project detail")
    if not input_project["zoning_input"] or not input_project["building_envelope_results"]:
        raise AssertionError("api input project detail missing zoning or envelope")
    if not input_project["core_placement_results"] or not input_project["unit_layout_options"] or not input_project["unit_mix_options"]:
        raise AssertionError("api input project detail missing stage 11 outputs")
    if not input_project["floor_plan_options"] or not input_project["floor_plan_zones"]:
        raise AssertionError("api input project detail missing floor plan outputs")
    if not input_project["sharing_payment_options"] or not input_project["sharing_unit_allocations"] or not input_project["offer_data_packages"]:
        raise AssertionError("api input project detail missing stage 12 outputs")
    engine_runs = get("/api/engine-runs?project_key=INPUT-2532-1")
    assert_equal(engine_runs["total"], 1, "api engine runs filtered records")
    engine_run = get(f"/api/engine-runs/{engine_runs['data'][0]['run_key']}")
    if len(engine_run["steps"]) != 9:
        raise AssertionError("api engine run steps missing")
    if not engine_run["building_envelope"]:
        raise AssertionError("api engine run building envelope missing")
    if not engine_run["core_placement"] or not engine_run["unit_layout_options"] or not engine_run["unit_mix_options"]:
        raise AssertionError("api engine run stage 11 outputs missing")
    if not engine_run["floor_plan_options"] or not engine_run["floor_plan_zones"]:
        raise AssertionError("api engine run floor plan outputs missing")
    if not engine_run["sharing_payment_options"] or not engine_run["sharing_unit_allocations"] or not engine_run["offer_data_package"]:
        raise AssertionError("api engine run stage 12 outputs missing")
    core_results = get("/api/core-placement-results?project_key=INPUT-2532-1")
    assert_equal(core_results["total"], 1, "api core placement filtered records")
    layout_options = get("/api/unit-layout-options?project_key=INPUT-2532-1")
    assert_equal(layout_options["total"], 3, "api unit layout filtered records")
    layout_detail = get(f"/api/unit-layout-options/{layout_options['data'][0]['option_key']}")
    if not layout_detail["mixes"]:
        raise AssertionError("api unit layout detail mixes missing")
    unit_mixes = get("/api/unit-mix-options?project_key=INPUT-2532-1")
    assert_equal(unit_mixes["total"], 9, "api unit mix filtered records")
    floor_plans = get("/api/floor-plan-options?project_key=INPUT-2532-1")
    assert_equal(floor_plans["total"], 3, "api floor plan filtered records")
    floor_plan_detail = get(f"/api/floor-plan-options/{floor_plans['data'][0]['plan_key']}")
    if not floor_plan_detail["zones"]:
        raise AssertionError("api floor plan detail zones missing")
    floor_plan_zones = get(f"/api/floor-plan-zones?plan_key={floor_plans['data'][0]['plan_key']}")
    if floor_plan_zones["total"] < 1:
        raise AssertionError("api floor plan zones missing")
    floor_plan_findings = get("/api/floor-plan-findings?project_key=INPUT-2532-1")
    if "total" not in floor_plan_findings:
        raise AssertionError("api floor plan findings invalid")
    sharing_options = get("/api/sharing-payment-options?project_key=INPUT-2532-1")
    assert_equal(sharing_options["total"], 3, "api sharing payment filtered records")
    sharing_detail = get(f"/api/sharing-payment-options/{sharing_options['data'][0]['sharing_key']}")
    if not sharing_detail["allocations"]:
        raise AssertionError("api sharing payment detail allocations missing")
    sharing_allocations = get("/api/sharing-unit-allocations?project_key=INPUT-2532-1")
    assert_equal(sharing_allocations["total"], 18, "api sharing allocation filtered records")
    offer_packages = get("/api/offer-data-packages?project_key=INPUT-2532-1")
    assert_equal(offer_packages["total"], 1, "api offer package filtered records")
    offer_package = get(f"/api/offer-data-packages/{offer_packages['data'][0]['package_key']}")
    if not offer_package["package"] or not offer_package["allocations"]:
        raise AssertionError("api offer package detail missing")
    new_run = post("/api/input-projects/INPUT-2532-1/engine-runs", {"triggered_by": "smoke_test"})
    if len(new_run["steps"]) != 9:
        raise AssertionError("api create engine run did not return steps")
    if not new_run["core_placement"] or not new_run["unit_layout_options"] or not new_run["unit_mix_options"]:
        raise AssertionError("api create engine run stage 11 outputs missing")
    if not new_run["floor_plan_options"] or not new_run["floor_plan_zones"]:
        raise AssertionError("api create engine run floor plan outputs missing")
    if not new_run["sharing_payment_options"] or not new_run["sharing_unit_allocations"] or not new_run["offer_data_package"]:
        raise AssertionError("api create engine run stage 12 outputs missing")
    created_project = post(
        "/api/input-projects",
        {
            "project_key": "INPUT-SMOKE-9999-1",
            "project_name": "Smoke test input",
            "run_now": True,
            "created_by": "smoke_test",
            "zoning_input": {
                "ada": 9999,
                "parsel": 1,
                "parcel_area_m2": 1000,
                "road_frontage_m": 25,
                "zoning_function": "konut",
                "taks": 0.4,
                "kaks_or_emsal": 2.0,
                "max_floor_count": 6,
                "height_limit_m": 18.5,
                "front_setback_m": 5,
                "side_setback_m": 3,
                "rear_setback_m": 3,
                "parking_rule_version": "prototype",
                "shelter_rule_version": "prototype",
                "fire_rule_version": "prototype",
            },
            "existing_area_inputs": [
                {
                    "owner_id": "smoke",
                    "independent_unit_no": "1",
                    "existing_gross_m2": 120,
                    "existing_net_m2": 95,
                    "usage_type": "residential",
                    "floor": "1",
                }
            ],
        },
    )
    assert_equal(created_project["project_key"], "INPUT-SMOKE-9999-1", "api created input project")
    if not created_project["latest_run"] or not created_project["latest_run"]["building_envelope"]:
        raise AssertionError("api created input project run missing")
    if not created_project["latest_run"]["core_placement"] or not created_project["latest_run"]["unit_layout_options"]:
        raise AssertionError("api created input project stage 11 run missing")
    if not created_project["latest_run"]["floor_plan_options"] or not created_project["latest_run"]["floor_plan_zones"]:
        raise AssertionError("api created input project floor plan run missing")
    if not created_project["latest_run"]["sharing_payment_options"] or not created_project["latest_run"]["offer_data_package"]:
        raise AssertionError("api created input project stage 12 run missing")
    decided = post(
        f"/api/review-tasks/{task_id}/decisions",
        {"decision_type": "needs_review", "decision_note": "Smoke test decision"},
    )
    if not decided["decisions"]:
        raise AssertionError("api review decision creation missing")
    if decided["status"] != "reviewing":
        raise AssertionError("api review decision did not update task status")
    post("/api/import-seed")
    html = get("/app")
    if "src=\"/app/assets/" not in html:
        raise AssertionError("frontend html did not load")
    script_match = re.search(r'src="(/app/assets/[^"]+\.js)"', html)
    if not script_match:
        raise AssertionError("frontend React asset did not load")
    js = get(script_match.group(1))
    for expected in [
        "ArchiFlow",
        "project intelligence is loading",
        "archiflow-loader",
        "Dashboard",
        "/api/summary",
    ]:
        if expected not in js:
            raise AssertionError(f"frontend bundle missing {expected!r}")


def main() -> None:
    db_path = test_import()
    print(json.dumps({"ok": True, "import_test_db": str(db_path)}, ensure_ascii=False, indent=2))
    if len(sys.argv) > 1:
        test_running_api(sys.argv[1].rstrip("/"))
        print(json.dumps({"ok": True, "api": sys.argv[1].rstrip("/")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
