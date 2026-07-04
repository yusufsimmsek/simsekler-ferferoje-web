PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_files (
    file_id TEXT PRIMARY KEY,
    relative_path TEXT NOT NULL,
    absolute_path TEXT,
    stage TEXT,
    kind TEXT NOT NULL,
    extension TEXT,
    size_mb REAL,
    modified TEXT,
    sha256 TEXT
);

CREATE TABLE IF NOT EXISTS parcels (
    parcel_key TEXT PRIMARY KEY,
    ada INTEGER,
    parsel INTEGER,
    status TEXT NOT NULL,
    reconciliation_quality TEXT,
    review_notes_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS parcel_source_files (
    parcel_key TEXT NOT NULL,
    file_id TEXT NOT NULL,
    PRIMARY KEY (parcel_key, file_id),
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE CASCADE,
    FOREIGN KEY (file_id) REFERENCES source_files(file_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cad_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcel_key TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    entity_count INTEGER,
    layer_count INTEGER,
    room_area_pair_count INTEGER,
    detected_room_area_m2 REAL,
    net_label_count INTEGER,
    net_label_sum_m2 REAL,
    dominant_rooms_json TEXT NOT NULL DEFAULT '{}',
    top_area_types_json TEXT NOT NULL DEFAULT '{}',
    sample_pairs_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cad_unit_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    primary_method TEXT,
    primary_candidate_count INTEGER,
    net_label_candidate_count INTEGER,
    sequence_candidate_count INTEGER,
    candidate_count INTEGER,
    room_area_pair_count INTEGER,
    total_detected_room_area_m2 REAL,
    net_label_sum_m2 REAL,
    cluster_threshold REAL,
    offer_owner_units INTEGER,
    offer_contractor_units INTEGER,
    offer_total_units INTEGER,
    offer_match_status TEXT,
    unit_count_delta INTEGER,
    confidence_score REAL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cad_unit_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cad_unit_plan_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    candidate_key TEXT NOT NULL,
    method TEXT NOT NULL,
    unit_type TEXT,
    room_mix TEXT,
    area_m2 REAL,
    room_count INTEGER,
    living_count INTEGER,
    bedroom_count INTEGER,
    wet_count INTEGER,
    service_count INTEGER,
    center_x REAL,
    center_y REAL,
    confidence_score REAL,
    room_types_json TEXT NOT NULL DEFAULT '{}',
    bbox_json TEXT NOT NULL DEFAULT '{}',
    review_notes_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (cad_unit_plan_id) REFERENCES cad_unit_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cad_unit_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cad_unit_candidate_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    room_name TEXT,
    room_type TEXT,
    area_m2 REAL,
    point_x REAL,
    point_y REAL,
    pair_quality TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (cad_unit_candidate_id) REFERENCES cad_unit_candidates(id) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS cad_unit_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cad_unit_plan_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    recommendation TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (cad_unit_plan_id) REFERENCES cad_unit_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS excel_old_metraj (
    parcel_key TEXT PRIMARY KEY,
    relative_path TEXT NOT NULL,
    old_total_m2 REAL,
    method TEXT,
    component_count INTEGER,
    components_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcel_key TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    proposal_date TEXT,
    existing_independent_units REAL,
    otopark TEXT,
    owner_unit_mentions INTEGER,
    contractor_unit_mentions INTEGER,
    dukkan_mentions INTEGER,
    dubleks_mentions INTEGER,
    title_body_mismatch INTEGER,
    special_notes_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_v2_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    title_parcel_key TEXT,
    body_parcel_key TEXT,
    proposal_date TEXT,
    existing_independent_units REAL,
    otopark_label TEXT,
    otopark_floor_no INTEGER,
    owner_units_total INTEGER,
    contractor_units_total INTEGER,
    total_unit_mentions INTEGER,
    distribution_item_count INTEGER,
    alternative_item_count INTEGER,
    financial_term_count INTEGER,
    condition_term_count INTEGER,
    parser_warning_count INTEGER,
    confidence_score REAL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS proposal_v2_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_record_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    group_name TEXT NOT NULL,
    term_type TEXT,
    label TEXT,
    level TEXT,
    role TEXT,
    floor TEXT,
    unit_count INTEGER,
    unit_type TEXT,
    amount REAL,
    currency TEXT,
    percent INTEGER,
    excerpt TEXT,
    confidence REAL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (proposal_record_id) REFERENCES proposal_v2_records(id) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contract_rule_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_record_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    proposal_date TEXT,
    risk_score INTEGER,
    risk_level TEXT NOT NULL,
    decision_recommendation TEXT NOT NULL,
    finding_count INTEGER,
    blocking_count INTEGER,
    risk_count INTEGER,
    review_count INTEGER,
    info_count INTEGER,
    owner_units_total INTEGER,
    contractor_units_total INTEGER,
    total_units INTEGER,
    contractor_share_percent REAL,
    confidence_score REAL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (proposal_record_id) REFERENCES proposal_v2_records(id) ON DELETE SET NULL,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS contract_rule_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evaluation_id INTEGER,
    proposal_record_id INTEGER,
    parcel_key TEXT,
    relative_path TEXT NOT NULL,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT,
    message TEXT NOT NULL,
    evidence TEXT,
    recommendation TEXT,
    weight INTEGER,
    source TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (evaluation_id) REFERENCES contract_rule_evaluations(id) ON DELETE CASCADE,
    FOREIGN KEY (proposal_record_id) REFERENCES proposal_v2_records(id) ON DELETE SET NULL,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_qa_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidence_id TEXT NOT NULL UNIQUE,
    parcel_key TEXT,
    source_type TEXT NOT NULL,
    source_path TEXT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    excerpt TEXT,
    importance INTEGER NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    search_text TEXT NOT NULL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parcel_key TEXT,
    level TEXT NOT NULL,
    code TEXT NOT NULL,
    source TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    resolution_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS review_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_key TEXT NOT NULL UNIQUE,
    warning_id INTEGER,
    parcel_key TEXT,
    level TEXT NOT NULL,
    warning_code TEXT NOT NULL,
    category TEXT NOT NULL,
    priority INTEGER NOT NULL,
    due_bucket TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    required_action TEXT,
    decision_template_json TEXT NOT NULL DEFAULT '[]',
    evidence_count INTEGER NOT NULL DEFAULT 0,
    warning_signature TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    closed_at TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (warning_id) REFERENCES warnings(id) ON DELETE SET NULL,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS review_task_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    relevance_score INTEGER,
    note TEXT,
    FOREIGN KEY (task_id) REFERENCES review_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (evidence_id) REFERENCES document_qa_evidence(evidence_id) ON DELETE CASCADE,
    UNIQUE (task_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS review_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    warning_id INTEGER,
    parcel_key TEXT,
    decision_type TEXT NOT NULL,
    decision_label TEXT,
    decision_note TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    evidence_snapshot_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (task_id) REFERENCES review_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (warning_id) REFERENCES warnings(id) ON DELETE SET NULL,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS company_profiles (
    company_key TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    brand_config_json TEXT NOT NULL DEFAULT '{}',
    offer_template_json TEXT NOT NULL DEFAULT '{}',
    business_rules_json TEXT NOT NULL DEFAULT '{}',
    generated_at TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS company_project_examples (
    example_key TEXT PRIMARY KEY,
    company_key TEXT NOT NULL,
    parcel_key TEXT,
    ada INTEGER,
    parsel INTEGER,
    status TEXT,
    reconciliation_quality TEXT,
    source_file_count INTEGER,
    cad_plan_count INTEGER,
    excel_count INTEGER,
    proposal_count INTEGER,
    proposal_v2_count INTEGER,
    cad_area_m2 REAL,
    old_area_m2 REAL,
    area_delta_m2 REAL,
    cad_unit_candidate_count INTEGER,
    cad_unit_primary_count INTEGER,
    offer_total_units INTEGER,
    owner_units_total INTEGER,
    contractor_units_total INTEGER,
    total_unit_mentions INTEGER,
    contract_risk_score INTEGER,
    review_task_count INTEGER,
    risk_task_count INTEGER,
    evidence_count INTEGER,
    lesson_tags_json TEXT NOT NULL DEFAULT '[]',
    review_notes_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (company_key) REFERENCES company_profiles(company_key) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS company_layout_patterns (
    pattern_key TEXT PRIMARY KEY,
    company_key TEXT NOT NULL,
    unit_type TEXT,
    room_mix TEXT,
    pattern_role TEXT,
    sample_count INTEGER,
    parcel_count INTEGER,
    avg_area_m2 REAL,
    min_area_m2 REAL,
    max_area_m2 REAL,
    avg_confidence REAL,
    net_label_samples INTEGER,
    sequence_samples INTEGER,
    pattern_status TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (company_key) REFERENCES company_profiles(company_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS company_sharing_patterns (
    pattern_key TEXT PRIMARY KEY,
    company_key TEXT NOT NULL,
    parcel_key TEXT,
    relative_path TEXT,
    proposal_date TEXT,
    owner_units_total INTEGER,
    contractor_units_total INTEGER,
    total_units INTEGER,
    contractor_share_percent REAL,
    distribution_item_count INTEGER,
    alternative_item_count INTEGER,
    financial_term_count INTEGER,
    condition_term_count INTEGER,
    confidence_score REAL,
    risk_score INTEGER,
    risk_level TEXT,
    decision_recommendation TEXT,
    pattern_status TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (company_key) REFERENCES company_profiles(company_key) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS automation_engine_modules (
    module_key TEXT PRIMARY KEY,
    company_key TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL,
    input_contract_json TEXT NOT NULL DEFAULT '[]',
    output_contract_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (company_key) REFERENCES company_profiles(company_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS input_projects (
    project_key TEXT PRIMARY KEY,
    company_key TEXT NOT NULL,
    parcel_key TEXT,
    project_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    source_mode TEXT,
    target_offer_template TEXT,
    manual_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (company_key) REFERENCES company_profiles(company_key) ON DELETE CASCADE,
    FOREIGN KEY (parcel_key) REFERENCES parcels(parcel_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS zoning_inputs (
    project_key TEXT PRIMARY KEY,
    ada INTEGER,
    parsel INTEGER,
    parcel_area_m2 REAL,
    road_frontage_m REAL,
    zoning_function TEXT,
    taks REAL,
    kaks_or_emsal REAL,
    max_floor_count INTEGER,
    height_limit_m REAL,
    front_setback_m REAL,
    side_setback_m REAL,
    rear_setback_m REAL,
    parking_rule_version TEXT,
    shelter_rule_version TEXT,
    fire_rule_version TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS existing_area_inputs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_key TEXT NOT NULL,
    owner_id TEXT,
    independent_unit_no TEXT,
    existing_gross_m2 REAL,
    existing_net_m2 REAL,
    land_share TEXT,
    usage_type TEXT,
    floor_label TEXT,
    notes TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS engine_runs (
    run_key TEXT PRIMARY KEY,
    project_key TEXT NOT NULL,
    status TEXT NOT NULL,
    engine_version TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    triggered_by TEXT,
    result_summary_json TEXT NOT NULL DEFAULT '{}',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS engine_run_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL,
    module_key TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    input_json TEXT NOT NULL DEFAULT '{}',
    output_json TEXT NOT NULL DEFAULT '{}',
    findings_json TEXT NOT NULL DEFAULT '[]',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (module_key) REFERENCES automation_engine_modules(module_key) ON DELETE CASCADE,
    UNIQUE (run_key, module_key)
);

CREATE TABLE IF NOT EXISTS building_envelope_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL UNIQUE,
    project_key TEXT NOT NULL,
    parcel_area_m2 REAL,
    taks_footprint_m2 REAL,
    setback_footprint_m2 REAL,
    buildable_footprint_m2 REAL,
    total_construction_area_m2 REAL,
    typical_floor_area_m2 REAL,
    estimated_floor_count INTEGER,
    residential_efficiency_percent REAL,
    estimated_residential_area_m2 REAL,
    avg_residential_unit_m2 REAL,
    estimated_unit_capacity INTEGER,
    parking_need_estimate INTEGER,
    review_required INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS core_placement_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL UNIQUE,
    project_key TEXT NOT NULL,
    core_type TEXT NOT NULL,
    core_area_m2 REAL,
    circulation_area_m2 REAL,
    net_floor_area_m2 REAL,
    gross_floor_area_m2 REAL,
    floor_count INTEGER,
    core_efficiency_percent REAL,
    wet_core_alignment_score REAL,
    review_required INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS unit_layout_options (
    option_key TEXT PRIMARY KEY,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    option_rank INTEGER NOT NULL,
    option_name TEXT NOT NULL,
    strategy_key TEXT NOT NULL,
    target_unit_count INTEGER,
    unit_count INTEGER,
    avg_unit_area_m2 REAL,
    gross_residential_area_m2 REAL,
    net_residential_area_m2 REAL,
    efficiency_percent REAL,
    area_fit_delta_m2 REAL,
    fit_score REAL,
    review_required INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS unit_mix_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_key TEXT NOT NULL,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    unit_type TEXT,
    room_mix TEXT,
    unit_count INTEGER,
    avg_area_m2 REAL,
    total_area_m2 REAL,
    pattern_key TEXT,
    pattern_role TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (option_key) REFERENCES unit_layout_options(option_key) ON DELETE CASCADE,
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    FOREIGN KEY (pattern_key) REFERENCES company_layout_patterns(pattern_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS floor_plan_options (
    plan_key TEXT PRIMARY KEY,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    layout_option_key TEXT NOT NULL,
    plan_rank INTEGER NOT NULL,
    plan_name TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    floor_label TEXT,
    floor_count INTEGER,
    units_per_floor INTEGER,
    gross_floor_area_m2 REAL,
    net_floor_area_m2 REAL,
    core_area_m2 REAL,
    circulation_area_m2 REAL,
    residential_area_m2 REAL,
    efficiency_percent REAL,
    wet_core_alignment_score REAL,
    daylight_score REAL,
    constructability_score REAL,
    fit_score REAL,
    review_required INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    FOREIGN KEY (layout_option_key) REFERENCES unit_layout_options(option_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS floor_plan_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_key TEXT NOT NULL,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    zone_key TEXT NOT NULL,
    zone_type TEXT NOT NULL,
    label TEXT NOT NULL,
    unit_type TEXT,
    room_mix TEXT,
    unit_index INTEGER,
    area_m2 REAL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    orientation TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (plan_key) REFERENCES floor_plan_options(plan_key) ON DELETE CASCADE,
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    UNIQUE (plan_key, zone_key)
);

CREATE TABLE IF NOT EXISTS floor_plan_findings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_key TEXT NOT NULL,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    message TEXT NOT NULL,
    recommendation TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (plan_key) REFERENCES floor_plan_options(plan_key) ON DELETE CASCADE,
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sharing_payment_options (
    sharing_key TEXT PRIMARY KEY,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    layout_option_key TEXT NOT NULL,
    sharing_rank INTEGER NOT NULL,
    strategy_key TEXT NOT NULL,
    option_name TEXT NOT NULL,
    source_pattern_key TEXT,
    target_contractor_share_percent REAL,
    owner_units INTEGER,
    contractor_units INTEGER,
    total_units INTEGER,
    owner_share_percent REAL,
    contractor_share_percent REAL,
    owner_area_m2 REAL,
    contractor_area_m2 REAL,
    existing_area_m2 REAL,
    existing_unit_count INTEGER,
    owner_area_delta_m2 REAL,
    participation_payment_estimate REAL,
    participation_payment_rate_m2 REAL,
    participation_currency TEXT,
    fairness_score REAL,
    feasibility_score REAL,
    offer_ready_score REAL,
    review_required INTEGER NOT NULL DEFAULT 0,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    FOREIGN KEY (layout_option_key) REFERENCES unit_layout_options(option_key) ON DELETE CASCADE,
    FOREIGN KEY (source_pattern_key) REFERENCES company_sharing_patterns(pattern_key) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sharing_unit_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sharing_key TEXT NOT NULL,
    run_key TEXT NOT NULL,
    project_key TEXT NOT NULL,
    layout_option_key TEXT NOT NULL,
    role TEXT NOT NULL,
    room_mix TEXT,
    unit_type TEXT,
    unit_count INTEGER,
    avg_area_m2 REAL,
    total_area_m2 REAL,
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (sharing_key) REFERENCES sharing_payment_options(sharing_key) ON DELETE CASCADE,
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    FOREIGN KEY (layout_option_key) REFERENCES unit_layout_options(option_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS offer_data_packages (
    package_key TEXT PRIMARY KEY,
    run_key TEXT NOT NULL UNIQUE,
    project_key TEXT NOT NULL,
    sharing_key TEXT NOT NULL,
    layout_option_key TEXT NOT NULL,
    package_status TEXT NOT NULL,
    offer_ready_score REAL,
    review_required INTEGER NOT NULL DEFAULT 0,
    package_json TEXT NOT NULL DEFAULT '{}',
    raw_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (run_key) REFERENCES engine_runs(run_key) ON DELETE CASCADE,
    FOREIGN KEY (project_key) REFERENCES input_projects(project_key) ON DELETE CASCADE,
    FOREIGN KEY (sharing_key) REFERENCES sharing_payment_options(sharing_key) ON DELETE CASCADE,
    FOREIGN KEY (layout_option_key) REFERENCES unit_layout_options(option_key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_files_kind ON source_files(kind);
CREATE INDEX IF NOT EXISTS idx_source_files_stage ON source_files(stage);
CREATE INDEX IF NOT EXISTS idx_parcels_status ON parcels(status);
CREATE INDEX IF NOT EXISTS idx_parcels_quality ON parcels(reconciliation_quality);
CREATE INDEX IF NOT EXISTS idx_warnings_status ON warnings(status);
CREATE INDEX IF NOT EXISTS idx_warnings_level ON warnings(level);
CREATE INDEX IF NOT EXISTS idx_warnings_parcel ON warnings(parcel_key);
CREATE INDEX IF NOT EXISTS idx_cad_plans_parcel ON cad_plans(parcel_key);
CREATE INDEX IF NOT EXISTS idx_cad_unit_plans_parcel ON cad_unit_plans(parcel_key);
CREATE INDEX IF NOT EXISTS idx_cad_unit_plans_status ON cad_unit_plans(offer_match_status);
CREATE INDEX IF NOT EXISTS idx_cad_unit_candidates_parcel ON cad_unit_candidates(parcel_key);
CREATE INDEX IF NOT EXISTS idx_cad_unit_candidates_method ON cad_unit_candidates(method);
CREATE INDEX IF NOT EXISTS idx_cad_unit_findings_parcel ON cad_unit_findings(parcel_key);
CREATE INDEX IF NOT EXISTS idx_cad_unit_findings_severity ON cad_unit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_cad_unit_findings_code ON cad_unit_findings(code);
CREATE INDEX IF NOT EXISTS idx_proposals_parcel ON proposal_summaries(parcel_key);
CREATE INDEX IF NOT EXISTS idx_proposal_v2_records_parcel ON proposal_v2_records(parcel_key);
CREATE INDEX IF NOT EXISTS idx_proposal_v2_terms_parcel ON proposal_v2_terms(parcel_key);
CREATE INDEX IF NOT EXISTS idx_proposal_v2_terms_type ON proposal_v2_terms(term_type);
CREATE INDEX IF NOT EXISTS idx_proposal_v2_terms_group ON proposal_v2_terms(group_name);
CREATE INDEX IF NOT EXISTS idx_contract_rule_evaluations_parcel ON contract_rule_evaluations(parcel_key);
CREATE INDEX IF NOT EXISTS idx_contract_rule_evaluations_level ON contract_rule_evaluations(risk_level);
CREATE INDEX IF NOT EXISTS idx_contract_rule_findings_parcel ON contract_rule_findings(parcel_key);
CREATE INDEX IF NOT EXISTS idx_contract_rule_findings_severity ON contract_rule_findings(severity);
CREATE INDEX IF NOT EXISTS idx_contract_rule_findings_code ON contract_rule_findings(code);
CREATE INDEX IF NOT EXISTS idx_document_qa_evidence_parcel ON document_qa_evidence(parcel_key);
CREATE INDEX IF NOT EXISTS idx_document_qa_evidence_type ON document_qa_evidence(source_type);
CREATE INDEX IF NOT EXISTS idx_document_qa_evidence_importance ON document_qa_evidence(importance);
CREATE INDEX IF NOT EXISTS idx_document_qa_evidence_search ON document_qa_evidence(search_text);
CREATE INDEX IF NOT EXISTS idx_review_tasks_warning ON review_tasks(warning_id);
CREATE INDEX IF NOT EXISTS idx_review_tasks_parcel ON review_tasks(parcel_key);
CREATE INDEX IF NOT EXISTS idx_review_tasks_status ON review_tasks(status);
CREATE INDEX IF NOT EXISTS idx_review_tasks_category ON review_tasks(category);
CREATE INDEX IF NOT EXISTS idx_review_tasks_priority ON review_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_review_task_evidence_task ON review_task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_review_task_evidence_evidence ON review_task_evidence(evidence_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_task ON review_decisions(task_id);
CREATE INDEX IF NOT EXISTS idx_review_decisions_warning ON review_decisions(warning_id);
CREATE INDEX IF NOT EXISTS idx_company_project_examples_company ON company_project_examples(company_key);
CREATE INDEX IF NOT EXISTS idx_company_project_examples_parcel ON company_project_examples(parcel_key);
CREATE INDEX IF NOT EXISTS idx_company_project_examples_status ON company_project_examples(status);
CREATE INDEX IF NOT EXISTS idx_company_layout_patterns_company ON company_layout_patterns(company_key);
CREATE INDEX IF NOT EXISTS idx_company_layout_patterns_unit ON company_layout_patterns(unit_type, room_mix);
CREATE INDEX IF NOT EXISTS idx_company_layout_patterns_role ON company_layout_patterns(pattern_role);
CREATE INDEX IF NOT EXISTS idx_company_layout_patterns_status ON company_layout_patterns(pattern_status);
CREATE INDEX IF NOT EXISTS idx_company_sharing_patterns_company ON company_sharing_patterns(company_key);
CREATE INDEX IF NOT EXISTS idx_company_sharing_patterns_parcel ON company_sharing_patterns(parcel_key);
CREATE INDEX IF NOT EXISTS idx_company_sharing_patterns_risk ON company_sharing_patterns(risk_level);
CREATE INDEX IF NOT EXISTS idx_automation_engine_modules_company ON automation_engine_modules(company_key);
CREATE INDEX IF NOT EXISTS idx_automation_engine_modules_status ON automation_engine_modules(status);
CREATE INDEX IF NOT EXISTS idx_input_projects_company ON input_projects(company_key);
CREATE INDEX IF NOT EXISTS idx_input_projects_parcel ON input_projects(parcel_key);
CREATE INDEX IF NOT EXISTS idx_input_projects_status ON input_projects(status);
CREATE INDEX IF NOT EXISTS idx_existing_area_inputs_project ON existing_area_inputs(project_key);
CREATE INDEX IF NOT EXISTS idx_engine_runs_project ON engine_runs(project_key);
CREATE INDEX IF NOT EXISTS idx_engine_runs_status ON engine_runs(status);
CREATE INDEX IF NOT EXISTS idx_engine_run_steps_run ON engine_run_steps(run_key);
CREATE INDEX IF NOT EXISTS idx_engine_run_steps_module ON engine_run_steps(module_key);
CREATE INDEX IF NOT EXISTS idx_building_envelope_results_project ON building_envelope_results(project_key);
CREATE INDEX IF NOT EXISTS idx_core_placement_results_project ON core_placement_results(project_key);
CREATE INDEX IF NOT EXISTS idx_unit_layout_options_project ON unit_layout_options(project_key);
CREATE INDEX IF NOT EXISTS idx_unit_layout_options_run ON unit_layout_options(run_key);
CREATE INDEX IF NOT EXISTS idx_unit_mix_options_option ON unit_mix_options(option_key);
CREATE INDEX IF NOT EXISTS idx_unit_mix_options_project ON unit_mix_options(project_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_options_project ON floor_plan_options(project_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_options_run ON floor_plan_options(run_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_options_layout ON floor_plan_options(layout_option_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_zones_plan ON floor_plan_zones(plan_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_zones_type ON floor_plan_zones(zone_type);
CREATE INDEX IF NOT EXISTS idx_floor_plan_findings_plan ON floor_plan_findings(plan_key);
CREATE INDEX IF NOT EXISTS idx_floor_plan_findings_severity ON floor_plan_findings(severity);
CREATE INDEX IF NOT EXISTS idx_sharing_payment_options_project ON sharing_payment_options(project_key);
CREATE INDEX IF NOT EXISTS idx_sharing_payment_options_run ON sharing_payment_options(run_key);
CREATE INDEX IF NOT EXISTS idx_sharing_payment_options_layout ON sharing_payment_options(layout_option_key);
CREATE INDEX IF NOT EXISTS idx_sharing_unit_allocations_sharing ON sharing_unit_allocations(sharing_key);
CREATE INDEX IF NOT EXISTS idx_sharing_unit_allocations_project ON sharing_unit_allocations(project_key);
CREATE INDEX IF NOT EXISTS idx_offer_data_packages_project ON offer_data_packages(project_key);
CREATE INDEX IF NOT EXISTS idx_offer_data_packages_status ON offer_data_packages(package_status);
