const state = {
  summary: null,
  warnings: [],
  selectedWarning: null,
  selectedParcel: null,
  qaAnswer: null,
  filters: {
    status: "open",
    level: "",
    q: "",
  },
};

const els = {
  metrics: document.querySelector("#metrics"),
  sourceRoot: document.querySelector("#sourceRoot"),
  warningList: document.querySelector("#warningList"),
  warningCount: document.querySelector("#warningCount"),
  parcelDetail: document.querySelector("#parcelDetail"),
  selectedWarning: document.querySelector("#selectedWarning"),
  resolutionNote: document.querySelector("#resolutionNote"),
  statusFilter: document.querySelector("#statusFilter"),
  levelFilter: document.querySelector("#levelFilter"),
  queueSearch: document.querySelector("#queueSearch"),
  refreshBtn: document.querySelector("#refreshBtn"),
  globalSearch: document.querySelector("#globalSearch"),
  globalSearchBtn: document.querySelector("#globalSearchBtn"),
  searchResults: document.querySelector("#searchResults"),
  toast: document.querySelector("#toast"),
};

function api(path, options = {}) {
  return fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || data.error || "API error");
    }
    return data;
  });
}

function fmt(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function fmtM2(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return fmt(value, "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function badge(text, level) {
  return `<span class="badge ${escapeHtml(level || "")}">${escapeHtml(text)}</span>`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove("visible"), 2400);
}

function warningPriority(level) {
  return level === "risk" ? 3 : level === "review" ? 2 : 1;
}

function renderMetrics() {
  const summary = state.summary || {};
  const metrics = [
    ["Ada-Parsel", summary.parcels],
    ["Acik Uyari", summary.open_warnings],
    ["Risk", (summary.warnings_by_level || []).find((x) => x.level === "risk")?.count || 0],
    ["CAD Plan", summary.cad_plans],
    ["CAD Birim", summary.cad_unit_plans],
    ["CAD Aday", summary.cad_unit_candidates],
    ["Excel Metraj", summary.excel_old_metraj],
    ["Teklif PDF", summary.proposal_summaries],
    ["Teklif V2", summary.proposal_v2_records],
    ["Kontrat", summary.contract_rule_evaluations],
    ["Kural Bulgu", summary.contract_rule_findings],
    ["QA Kanit", summary.document_qa_evidence],
    ["Review Gorev", summary.review_tasks],
    ["Dataset", summary.company_project_examples],
    ["Layout Oruntu", summary.company_layout_patterns],
    ["Paylasim Oruntu", summary.company_sharing_patterns],
    ["Motor", summary.automation_engine_modules],
    ["Input Proje", summary.input_projects],
    ["Engine Run", summary.engine_runs],
    ["Envelope", summary.building_envelope_results],
    ["Core", summary.core_placement_results],
    ["Layout Secenek", summary.unit_layout_options],
    ["Unit Mix", summary.unit_mix_options],
    ["Paylasim Secenek", summary.sharing_payment_options],
    ["Allocation", summary.sharing_unit_allocations],
    ["Offer Paket", summary.offer_data_packages],
    ["Kaynak Dosya", summary.source_files],
  ];
  els.metrics.innerHTML = metrics.map(([label, value]) => `
    <div class="metric">
      <strong>${escapeHtml(value ?? 0)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
  els.sourceRoot.textContent = summary.source_root || "Kaynak klasor";
}

function warningQuery() {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (state.filters.status) params.set("status", state.filters.status);
  if (state.filters.level) params.set("level", state.filters.level);
  if (state.filters.q) params.set("q", state.filters.q);
  return `/api/warnings?${params.toString()}`;
}

function renderWarnings(total) {
  els.warningCount.textContent = `${total} kayit`;
  if (!state.warnings.length) {
    els.warningList.innerHTML = `<div class="selected-warning muted">Bu filtrede kayit yok.</div>`;
    return;
  }

  const sorted = [...state.warnings].sort((a, b) => warningPriority(b.level) - warningPriority(a.level) || a.id - b.id);
  els.warningList.innerHTML = sorted.map((warning) => {
    const active = state.selectedWarning?.id === warning.id ? "active" : "";
    return `
      <button class="warning-item ${active}" type="button" data-warning-id="${warning.id}">
        <div class="warning-top">
          <strong>${escapeHtml(warning.parcel_key || "Genel")}</strong>
          ${badge(warning.level, warning.level)}
        </div>
        <div class="inline-row">
          ${badge(warning.status, "")}
          <span class="muted text-ellipsis">${escapeHtml(warning.code)}</span>
        </div>
        <p class="warning-message">${escapeHtml(warning.message)}</p>
      </button>
    `;
  }).join("");
}

function renderSelectedWarning() {
  const warning = state.selectedWarning;
  if (!warning) {
    els.selectedWarning.textContent = "Secili uyari yok";
    els.resolutionNote.value = "";
    document.querySelectorAll(".status-actions button").forEach((button) => { button.disabled = true; });
    return;
  }
  document.querySelectorAll(".status-actions button").forEach((button) => { button.disabled = false; });
  els.selectedWarning.innerHTML = `
    <div class="inline-row">${badge(warning.level, warning.level)} ${badge(warning.status, "")}</div>
    <strong>${escapeHtml(warning.parcel_key || "Genel")}</strong>
    <div class="muted">${escapeHtml(warning.code)}</div>
    <p>${escapeHtml(warning.message)}</p>
  `;
  els.resolutionNote.value = warning.resolution_note || "";
}

function section(title, body) {
  return `
    <section class="section">
      <h3 class="section-title">${escapeHtml(title)}</h3>
      <div class="section-body">${body}</div>
    </section>
  `;
}

function stat(label, value) {
  return `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function confidence(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function termGroupLabel(groupName) {
  return ({
    distribution_terms: "Dagitim",
    alternative_terms: "Alternatif",
    financial_terms: "Finansal",
    condition_terms: "Kosul",
    parser_warnings: "Parser",
  })[groupName] || groupName || "-";
}

function termValue(term) {
  const parts = [];
  if (term.unit_count !== null && term.unit_count !== undefined) {
    parts.push(`${term.unit_count} ${term.unit_type || "adet"}`);
  }
  if (term.amount !== null && term.amount !== undefined) {
    parts.push(`${fmtM2(term.amount)} ${term.currency || ""}`.trim());
  }
  if (term.percent !== null && term.percent !== undefined) {
    parts.push(`%${term.percent}`);
  }
  return parts.join(" / ") || "-";
}

function methodLabel(value) {
  return ({
    net_area_label: "NET etiketi",
    sequence_cluster: "Oda kumesi",
  })[value] || value || "-";
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `%${Number(value).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

function renderTags(tags) {
  if (!tags || !tags.length) return `<span class="muted">Etiket yok</span>`;
  return `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function riskClass(level) {
  return ({
    blocking: "blocking",
    high: "risk",
    medium: "review",
    low: "info",
    clear: "info",
  })[level] || "";
}

function decisionLabel(value) {
  return ({
    hold_identity_review: "Kimlik kontrolu bekliyor",
    complete_distribution_before_contract: "Dagitim tamamlanmali",
    legal_financial_review_required: "Hukuk/finans kontrolu",
    manual_review_required: "Manuel inceleme",
    review_then_draft: "Incele ve taslakla",
    draft_ready: "Taslak hazir",
  })[value] || value || "-";
}

function renderLegacyProposals(proposals) {
  if (!proposals.length) return `<span class="muted">Eski teklif PDF ozeti yok</span>`;
  return `
    <div class="subsection-title">Eski ozet</div>
    <table class="data-table">
      <thead><tr><th>PDF</th><th>Tarih</th><th>Otopark</th><th>Not</th></tr></thead>
      <tbody>${proposals.map((proposal) => `
        <tr>
          <td>${escapeHtml(proposal.relative_path)}</td>
          <td>${escapeHtml(proposal.proposal_date || "-")}</td>
          <td>${escapeHtml(proposal.otopark || "-")}</td>
          <td>${escapeHtml((proposal.special_notes || []).length)}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderProposalV2Records(records) {
  if (!records.length) return `<span class="muted">V2 teklif kaydi yok</span>`;
  return `
    <div class="subsection-title">V2 kayitlari</div>
    <table class="data-table compact-table">
      <thead>
        <tr>
          <th>PDF</th><th>Tarih</th><th>Mevcut</th><th>Mal sahibi</th><th>Muteahhit</th><th>Otopark</th><th>Uyari</th><th>Guven</th>
        </tr>
      </thead>
      <tbody>${records.map((record) => `
        <tr>
          <td>${escapeHtml(record.relative_path)}</td>
          <td>${escapeHtml(record.proposal_date || "-")}</td>
          <td>${escapeHtml(record.existing_independent_units ?? "-")}</td>
          <td>${escapeHtml(record.owner_units_total ?? "-")}</td>
          <td>${escapeHtml(record.contractor_units_total ?? "-")}</td>
          <td>${escapeHtml(record.otopark_label || "-")}</td>
          <td>${escapeHtml(record.parser_warning_count || 0)}</td>
          <td>${escapeHtml(confidence(record.confidence_score))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderProposalV2Terms(terms) {
  if (!terms.length) return `<span class="muted">V2 terim kaydi yok</span>`;
  const groupOrder = {
    parser_warnings: 0,
    financial_terms: 1,
    alternative_terms: 2,
    condition_terms: 3,
    distribution_terms: 4,
  };
  const sorted = [...terms].sort((a, b) => {
    return (groupOrder[a.group_name] ?? 9) - (groupOrder[b.group_name] ?? 9) || a.id - b.id;
  });
  const visible = sorted.slice(0, 24);
  const more = sorted.length > visible.length
    ? `<div class="muted">${sorted.length - visible.length} ek terim API'de tutuluyor.</div>`
    : "";
  return `
    <div class="subsection-title">V2 terimler</div>
    <table class="data-table compact-table">
      <thead><tr><th>Grup</th><th>Etiket</th><th>Rol</th><th>Kat</th><th>Deger</th><th>Alinti</th></tr></thead>
      <tbody>${visible.map((term) => `
        <tr>
          <td>${badge(termGroupLabel(term.group_name), term.level)}</td>
          <td>${escapeHtml(term.label || term.term_type || "-")}</td>
          <td>${escapeHtml(term.role || "-")}</td>
          <td>${escapeHtml(term.floor || "-")}</td>
          <td>${escapeHtml(termValue(term))}</td>
          <td class="excerpt-cell">${escapeHtml(term.excerpt || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
    ${more}
  `;
}

function renderCadUnitPlans(plans) {
  if (!plans.length) return `<span class="muted">CAD bagimsiz bolum plani yok</span>`;
  return `
    <div class="subsection-title">Plan eslestirme</div>
    <table class="data-table compact-table">
      <thead>
        <tr>
          <th>DWG</th><th>Yontem</th><th>Birincil</th><th>NET</th><th>Oda kumesi</th><th>Teklif</th><th>Durum</th><th>Guven</th>
        </tr>
      </thead>
      <tbody>${plans.map((plan) => `
        <tr>
          <td>${escapeHtml(plan.relative_path)}</td>
          <td>${escapeHtml(methodLabel(plan.primary_method))}</td>
          <td>${escapeHtml(plan.primary_candidate_count ?? "-")}</td>
          <td>${escapeHtml(plan.net_label_candidate_count ?? "-")}</td>
          <td>${escapeHtml(plan.sequence_candidate_count ?? "-")}</td>
          <td>${escapeHtml(plan.offer_total_units ?? "-")}</td>
          <td>${escapeHtml(plan.offer_match_status || "-")}</td>
          <td>${escapeHtml(confidence(plan.confidence_score))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderCadUnitCandidates(candidates) {
  if (!candidates.length) return `<span class="muted">CAD bagimsiz bolum adayi yok</span>`;
  const visible = candidates.slice(0, 24);
  const more = candidates.length > visible.length
    ? `<div class="muted">${candidates.length - visible.length} ek CAD adayi API'de tutuluyor.</div>`
    : "";
  return `
    <div class="subsection-title">Aday bolumler</div>
    <table class="data-table compact-table">
      <thead><tr><th>Aday</th><th>Yontem</th><th>Tip</th><th>Oda</th><th>Alan</th><th>Guven</th><th>Oda tipleri</th></tr></thead>
      <tbody>${visible.map((candidate) => `
        <tr>
          <td>${escapeHtml(candidate.candidate_key)}</td>
          <td>${escapeHtml(methodLabel(candidate.method))}</td>
          <td>${escapeHtml(candidate.unit_type || "-")}</td>
          <td>${escapeHtml(candidate.room_mix || "-")}</td>
          <td>${escapeHtml(fmtM2(candidate.area_m2))}</td>
          <td>${escapeHtml(confidence(candidate.confidence_score))}</td>
          <td>${escapeHtml(Object.entries(candidate.room_types || {}).map(([key, value]) => `${key}:${value}`).join(", ") || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
    ${more}
  `;
}

function renderCadUnitFindings(findings) {
  if (!findings.length) return `<span class="muted">CAD unit bulgusu yok</span>`;
  return `
    <div class="subsection-title">CAD bulgulari</div>
    <table class="data-table compact-table">
      <thead><tr><th>Seviye</th><th>Kod</th><th>Mesaj</th><th>Oneri</th></tr></thead>
      <tbody>${findings.map((finding) => `
        <tr>
          <td>${badge(finding.severity, finding.severity)}</td>
          <td>${escapeHtml(finding.code)}</td>
          <td>${escapeHtml(finding.message)}</td>
          <td>${escapeHtml(finding.recommendation || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderCadUnits(plans, candidates, findings) {
  return `
    ${renderCadUnitPlans(plans)}
    ${renderCadUnitCandidates(candidates)}
    ${renderCadUnitFindings(findings)}
  `;
}

function renderContractEvaluations(evaluations) {
  if (!evaluations.length) return `<span class="muted">Kontrat kural degerlendirmesi yok</span>`;
  return `
    <div class="subsection-title">Kural degerlendirmeleri</div>
    <table class="data-table compact-table">
      <thead>
        <tr>
          <th>PDF</th><th>Risk</th><th>Skor</th><th>Karar</th><th>Bulgu</th><th>Blokaj/Risk</th><th>Muteahhit payi</th>
        </tr>
      </thead>
      <tbody>${evaluations.map((item) => `
        <tr>
          <td>${escapeHtml(item.relative_path)}</td>
          <td>${badge(item.risk_level, riskClass(item.risk_level))}</td>
          <td>${escapeHtml(item.risk_score ?? "-")}</td>
          <td>${escapeHtml(decisionLabel(item.decision_recommendation))}</td>
          <td>${escapeHtml(item.finding_count ?? 0)}</td>
          <td>${escapeHtml(item.blocking_count || 0)} / ${escapeHtml(item.risk_count || 0)}</td>
          <td>${escapeHtml(pct(item.contractor_share_percent))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;
}

function renderContractFindings(findings) {
  if (!findings.length) return `<span class="muted">Kontrat kural bulgusu yok</span>`;
  const order = { blocking: 0, risk: 1, review: 2, info: 3 };
  const sorted = [...findings].sort((a, b) => {
    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || (b.weight || 0) - (a.weight || 0);
  });
  const visible = sorted.slice(0, 20);
  const more = sorted.length > visible.length
    ? `<div class="muted">${sorted.length - visible.length} ek kural bulgusu API'de tutuluyor.</div>`
    : "";
  return `
    <div class="subsection-title">Kural bulgulari</div>
    <table class="data-table compact-table">
      <thead><tr><th>Seviye</th><th>Kod</th><th>Mesaj</th><th>Oneri</th></tr></thead>
      <tbody>${visible.map((finding) => `
        <tr>
          <td>${badge(finding.severity, finding.severity)}</td>
          <td>${escapeHtml(finding.code)}</td>
          <td>${escapeHtml(finding.message)}</td>
          <td>${escapeHtml(finding.recommendation || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
    ${more}
  `;
}

function renderContractRules(evaluations, findings) {
  return `
    ${renderContractEvaluations(evaluations)}
    ${renderContractFindings(findings)}
  `;
}

function sourceTypeLabel(value) {
  return ({
    parcel_summary: "Parsel",
    source_file: "Kaynak",
    warning: "Uyari",
    cad_summary: "CAD",
    cad_unit_plan: "CAD plan",
    cad_unit_candidate: "CAD aday",
    cad_unit_finding: "CAD bulgu",
    excel_metraj: "Excel",
    proposal_legacy: "Teklif eski",
    proposal_v2: "Teklif V2",
    proposal_term: "Teklif terim",
    contract_rule: "Kontrat",
    contract_finding: "Kural bulgu",
  })[value] || value || "-";
}

function renderDocumentQa(evidence, qaAnswer) {
  const answerBlock = qaAnswer ? `
    <div class="qa-answer">
      <div class="subsection-title">Cevap</div>
      <p>${escapeHtml(qaAnswer.answer || "-")}</p>
      ${(qaAnswer.suggested_actions || []).length ? `
        <div class="qa-actions">
          ${(qaAnswer.suggested_actions || []).map((action) => `<span>${escapeHtml(action)}</span>`).join("")}
        </div>
      ` : ""}
    </div>
  ` : "";

  const rows = ((qaAnswer && qaAnswer.evidence && qaAnswer.evidence.length) ? qaAnswer.evidence : evidence).slice(0, 12);
  const evidenceBody = rows.length ? `
    <table class="data-table compact-table">
      <thead><tr><th>Tip</th><th>Onem</th><th>Baslik</th><th>Ozet</th></tr></thead>
      <tbody>${rows.map((item) => `
        <tr>
          <td>${escapeHtml(sourceTypeLabel(item.source_type))}</td>
          <td>${escapeHtml(item.importance ?? "-")}</td>
          <td>${escapeHtml(item.title || "-")}</td>
          <td>${escapeHtml(item.summary || item.excerpt || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Kanit kaydi yok</span>`;

  return `
    <div class="qa-row">
      <input id="parcelQaInput" type="search" placeholder="Soru" value="${escapeHtml(qaAnswer?.query || "")}">
      <button id="parcelQaAskBtn" type="button">Sor</button>
    </div>
    ${answerBlock}
    ${evidenceBody}
  `;
}

function taskCategoryLabel(value) {
  return ({
    cad: "CAD",
    contract: "Kontrat",
    proposal: "Teklif",
    source: "Kaynak",
    general: "Genel",
  })[value] || value || "-";
}

function dueBucketLabel(value) {
  return ({
    same_day: "Ayni gun",
    three_days: "3 gun",
    backlog: "Bekleme",
  })[value] || value || "-";
}

function renderReviewTasks(tasks) {
  if (!tasks.length) return `<span class="muted">Review gorevi yok</span>`;
  const visible = tasks.slice(0, 20);
  const more = tasks.length > visible.length
    ? `<div class="muted">${tasks.length - visible.length} ek gorev API'de tutuluyor.</div>`
    : "";
  return `
    <table class="data-table compact-table">
      <thead>
        <tr><th>Durum</th><th>Oncelik</th><th>Kategori</th><th>Gorev</th><th>Aksiyon</th><th>Karar</th></tr>
      </thead>
      <tbody>${visible.map((task) => {
        const active = task.status === "open" || task.status === "reviewing";
        return `
          <tr>
            <td>${badge(task.status, task.status === "open" ? "review" : task.status === "resolved" ? "info" : "")}</td>
            <td>${escapeHtml(task.priority ?? "-")}<div class="muted">${escapeHtml(dueBucketLabel(task.due_bucket))}</div></td>
            <td>${escapeHtml(taskCategoryLabel(task.category))}</td>
            <td>
              <strong>${escapeHtml(task.title || task.warning_code)}</strong>
              <div class="muted">${escapeHtml(task.summary || "-")}</div>
            </td>
            <td>${escapeHtml(task.required_action || "-")}</td>
            <td>
              <div class="task-actions">
                <button type="button" data-review-task-id="${task.id}" data-decision-type="needs_review" ${active ? "" : "disabled"}>Incele</button>
                <button type="button" data-review-task-id="${task.id}" data-decision-type="resolved" ${active ? "" : "disabled"}>Coz</button>
                <button type="button" data-review-task-id="${task.id}" data-decision-type="ignored" ${active ? "" : "disabled"}>Yoksay</button>
              </div>
              <div class="muted">${escapeHtml(task.linked_evidence_count || 0)} kanit / ${escapeHtml(task.decision_count || 0)} karar</div>
            </td>
          </tr>
        `;
      }).join("")}</tbody>
    </table>
    ${more}
  `;
}

function moduleStatusClass(status) {
  return ({
    planned: "review",
    dataset_ready: "info",
    ready_prototype: "info",
  })[status] || "";
}

function renderCompanyDataset(example, layoutPatterns, sharingPatterns, modules) {
  const exampleBody = example ? `
    <div class="stat-grid">
      ${stat("Kaynak dosya", example.source_file_count || 0)}
      ${stat("CAD aday", example.cad_unit_candidate_count || 0)}
      ${stat("CAD m2", fmtM2(example.cad_area_m2))}
      ${stat("Eski m2", fmtM2(example.old_area_m2))}
      ${stat("Risk gorevi", example.risk_task_count || 0)}
      ${stat("Kanit", example.evidence_count || 0)}
      ${stat("Mal sahibi", example.owner_units_total ?? "-")}
      ${stat("Muteahhit", example.contractor_units_total ?? "-")}
    </div>
    ${renderTags(example.lesson_tags || [])}
  ` : `<span class="muted">Bu parsel icin firma dataset ornegi yok</span>`;

  const layoutBody = layoutPatterns && layoutPatterns.length ? `
    <div class="subsection-title">Yerlesim oruntuleri</div>
    <table class="data-table compact-table">
      <thead><tr><th>Tip</th><th>Oda</th><th>Rol</th><th>Ornek</th><th>Ort. m2</th><th>Durum</th></tr></thead>
      <tbody>${layoutPatterns.map((pattern) => `
        <tr>
          <td>${escapeHtml(pattern.unit_type || "-")}</td>
          <td>${escapeHtml(pattern.room_mix || "-")}</td>
          <td>${escapeHtml(pattern.pattern_role || "-")}</td>
          <td>${escapeHtml(pattern.sample_count ?? "-")}</td>
          <td>${escapeHtml(fmtM2(pattern.avg_area_m2))}</td>
          <td>${badge(pattern.pattern_status || "-", pattern.pattern_status === "strong" ? "info" : "review")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Eslesen yerlesim oruntusu yok</span>`;

  const sharingBody = sharingPatterns && sharingPatterns.length ? `
    <div class="subsection-title">Paylasim oruntuleri</div>
    <table class="data-table compact-table">
      <thead><tr><th>PDF</th><th>Mal sahibi</th><th>Muteahhit</th><th>Muteahhit payi</th><th>Risk</th><th>Durum</th></tr></thead>
      <tbody>${sharingPatterns.map((pattern) => `
        <tr>
          <td>${escapeHtml(pattern.relative_path || "-")}</td>
          <td>${escapeHtml(pattern.owner_units_total ?? "-")}</td>
          <td>${escapeHtml(pattern.contractor_units_total ?? "-")}</td>
          <td>${escapeHtml(pct(pattern.contractor_share_percent))}</td>
          <td>${badge(pattern.risk_level || "-", riskClass(pattern.risk_level))}</td>
          <td>${escapeHtml(pattern.pattern_status || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Paylasim oruntusu yok</span>`;

  const moduleBody = modules && modules.length ? `
    <div class="subsection-title">Motor sirasi</div>
    <table class="data-table compact-table">
      <thead><tr><th>Sira</th><th>Modul</th><th>Durum</th><th>Cikti</th></tr></thead>
      <tbody>${modules.map((module) => `
        <tr>
          <td>${escapeHtml(module.sequence_no)}</td>
          <td>${escapeHtml(module.display_name)}</td>
          <td>${badge(module.status, moduleStatusClass(module.status))}</td>
          <td>${escapeHtml((module.output_contract || []).join(", ") || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Motor modulu yok</span>`;

  return `
    ${exampleBody}
    ${layoutBody}
    ${sharingBody}
    ${moduleBody}
  `;
}

function runStatusClass(status) {
  return ({
    sharing_ready_with_pending_renderer: "review",
    sharing_ready: "info",
    draft_ready: "info",
    layout_ready_with_pending_modules: "review",
    layout_ready: "info",
    completed_with_pending_modules: "review",
    prototype_ran: "info",
    completed: "info",
    running: "review",
    failed: "risk",
    pending: "review",
    waiting_for_input: "review",
    review_required: "review",
  })[status] || "";
}

function renderAutomationPrototype(
  inputProjects,
  engineRuns,
  envelopeResults,
  coreResults,
  layoutOptions,
  unitMixOptions,
  sharingOptions,
  sharingAllocations,
  offerPackages,
  engineSteps,
) {
  if (!inputProjects.length) {
    return `<span class="muted">Bu parsel icin otomasyon input projesi yok</span>`;
  }

  const projectBody = `
    <div class="subsection-title">Input projeler</div>
    <table class="data-table compact-table">
      <thead><tr><th>Proje</th><th>Durum</th><th>Parsel m2</th><th>TAKS</th><th>Emsal</th><th>Kat</th><th>Run</th></tr></thead>
      <tbody>${inputProjects.map((project) => `
        <tr>
          <td>
            <strong>${escapeHtml(project.project_name || project.project_key)}</strong>
            <div class="muted">${escapeHtml(project.project_key)}</div>
          </td>
          <td>${badge(project.latest_run_status || project.status, runStatusClass(project.latest_run_status || project.status))}</td>
          <td>${escapeHtml(fmtM2(project.parcel_area_m2))}</td>
          <td>${escapeHtml(project.taks ?? "-")}</td>
          <td>${escapeHtml(project.kaks_or_emsal ?? "-")}</td>
          <td>${escapeHtml(project.max_floor_count ?? "-")}</td>
          <td>
            <button type="button" data-engine-project-key="${escapeHtml(project.project_key)}">Calistir</button>
            <div class="muted">${escapeHtml(project.engine_run_count || 0)} run</div>
          </td>
        </tr>
      `).join("")}</tbody>
    </table>
  `;

  const latestEnvelope = envelopeResults[0];
  const envelopeBody = latestEnvelope ? `
    <div class="subsection-title">Building envelope sonucu</div>
    <div class="stat-grid">
      ${stat("Yapilabilir alan", fmtM2(latestEnvelope.total_construction_area_m2))}
      ${stat("Zemin oturumu", fmtM2(latestEnvelope.buildable_footprint_m2))}
      ${stat("Tipik kat", fmtM2(latestEnvelope.typical_floor_area_m2))}
      ${stat("Kat", latestEnvelope.estimated_floor_count ?? "-")}
      ${stat("Konut alani", fmtM2(latestEnvelope.estimated_residential_area_m2))}
      ${stat("Tahmini birim", latestEnvelope.estimated_unit_capacity ?? "-")}
      ${stat("Otopark", latestEnvelope.parking_need_estimate ?? "-")}
      ${stat("Review", latestEnvelope.review_required ? "gerekli" : "temiz")}
    </div>
  ` : `<span class="muted">Building envelope sonucu yok</span>`;

  const latestCore = coreResults[0];
  const coreBody = latestCore ? `
    <div class="subsection-title">Core placement sonucu</div>
    <div class="stat-grid">
      ${stat("Cekirdek tipi", latestCore.core_type || "-")}
      ${stat("Cekirdek m2", fmtM2(latestCore.core_area_m2))}
      ${stat("Sirkulasyon m2", fmtM2(latestCore.circulation_area_m2))}
      ${stat("Net tipik kat", fmtM2(latestCore.net_floor_area_m2))}
      ${stat("Kat", latestCore.floor_count ?? "-")}
      ${stat("Verim", pct(latestCore.core_efficiency_percent))}
      ${stat("Islak aks skoru", confidence(latestCore.wet_core_alignment_score))}
      ${stat("Review", latestCore.review_required ? "gerekli" : "temiz")}
    </div>
  ` : `<span class="muted">Core placement sonucu yok</span>`;

  const topOption = layoutOptions.find((option) => Number(option.option_rank) === 1) || layoutOptions[0];
  const topMixes = topOption ? unitMixOptions.filter((mix) => mix.option_key === topOption.option_key) : [];
  const layoutBody = layoutOptions.length ? `
    <div class="subsection-title">Unit layout secenekleri</div>
    <table class="data-table compact-table">
      <thead><tr><th>Sira</th><th>Secenek</th><th>Adet</th><th>Ort. m2</th><th>Net konut</th><th>Fit</th><th>Review</th></tr></thead>
      <tbody>${layoutOptions.slice(0, 9).map((option) => `
        <tr>
          <td>${escapeHtml(option.option_rank)}</td>
          <td>
            <strong>${escapeHtml(option.option_name)}</strong>
            <div class="muted">${escapeHtml(option.strategy_key)}</div>
          </td>
          <td>${escapeHtml(option.unit_count ?? "-")}<div class="muted">hedef ${escapeHtml(option.target_unit_count ?? "-")}</div></td>
          <td>${escapeHtml(fmtM2(option.avg_unit_area_m2))}</td>
          <td>${escapeHtml(fmtM2(option.net_residential_area_m2))}</td>
          <td>${escapeHtml(confidence(option.fit_score))}</td>
          <td>${badge(option.review_required ? "gerekli" : "temiz", option.review_required ? "review" : "info")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Unit layout secenegi yok</span>`;

  const mixBody = topMixes.length ? `
    <div class="subsection-title">Secilen layout birim karmasi</div>
    <table class="data-table compact-table">
      <thead><tr><th>Oda</th><th>Tip</th><th>Adet</th><th>Ort. m2</th><th>Toplam m2</th><th>Pattern</th></tr></thead>
      <tbody>${topMixes.map((mix) => `
        <tr>
          <td>${escapeHtml(mix.room_mix || "-")}</td>
          <td>${escapeHtml(mix.unit_type || "-")}</td>
          <td>${escapeHtml(mix.unit_count ?? "-")}</td>
          <td>${escapeHtml(fmtM2(mix.avg_area_m2))}</td>
          <td>${escapeHtml(fmtM2(mix.total_area_m2))}</td>
          <td>${escapeHtml(mix.pattern_key || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Secili layout icin birim karmasi yok</span>`;

  const topSharing = sharingOptions[0];
  const topSharingAllocations = topSharing ? sharingAllocations.filter((item) => item.sharing_key === topSharing.sharing_key) : [];
  const offerPackage = offerPackages[0];
  const sharingBody = sharingOptions.length ? `
    <div class="subsection-title">Paylasim ve katilim payi secenekleri</div>
    <table class="data-table compact-table">
      <thead><tr><th>Sira</th><th>Strateji</th><th>Mal sahibi</th><th>Muteahhit</th><th>Pay</th><th>Alan farki</th><th>Katilim payi</th><th>Skor</th><th>Review</th></tr></thead>
      <tbody>${sharingOptions.slice(0, 9).map((option) => `
        <tr>
          <td>${escapeHtml(option.sharing_rank)}</td>
          <td>
            <strong>${escapeHtml(option.option_name)}</strong>
            <div class="muted">${escapeHtml(option.strategy_key)}</div>
          </td>
          <td>${escapeHtml(option.owner_units ?? "-")}<div class="muted">${escapeHtml(fmtM2(option.owner_area_m2))} m2</div></td>
          <td>${escapeHtml(option.contractor_units ?? "-")}<div class="muted">${escapeHtml(fmtM2(option.contractor_area_m2))} m2</div></td>
          <td>${escapeHtml(pct(option.contractor_share_percent))}</td>
          <td>${escapeHtml(fmtM2(option.owner_area_delta_m2))}</td>
          <td>${escapeHtml(fmtM2(option.participation_payment_estimate))} ${escapeHtml(option.participation_currency || "")}</td>
          <td>${escapeHtml(confidence(option.offer_ready_score))}</td>
          <td>${badge(option.review_required ? "gerekli" : "temiz", option.review_required ? "review" : "info")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Paylasim secenegi yok</span>`;

  const allocationBody = topSharingAllocations.length ? `
    <div class="subsection-title">Secilen paylasim allocation</div>
    <table class="data-table compact-table">
      <thead><tr><th>Rol</th><th>Oda</th><th>Tip</th><th>Adet</th><th>Ort. m2</th><th>Toplam m2</th></tr></thead>
      <tbody>${topSharingAllocations.map((item) => `
        <tr>
          <td>${escapeHtml(item.role === "owner" ? "Mal sahibi" : "Muteahhit")}</td>
          <td>${escapeHtml(item.room_mix || "-")}</td>
          <td>${escapeHtml(item.unit_type || "-")}</td>
          <td>${escapeHtml(item.unit_count ?? "-")}</td>
          <td>${escapeHtml(fmtM2(item.avg_area_m2))}</td>
          <td>${escapeHtml(fmtM2(item.total_area_m2))}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Secili paylasim icin allocation yok</span>`;

  const offerBody = offerPackage ? `
    <div class="subsection-title">Offer data package</div>
    <div class="stat-grid">
      ${stat("Paket", offerPackage.package_status || "-")}
      ${stat("Offer skor", confidence(offerPackage.offer_ready_score))}
      ${stat("Sharing key", offerPackage.sharing_key || "-")}
      ${stat("Review", offerPackage.review_required ? "gerekli" : "temiz")}
    </div>
  ` : `<span class="muted">Offer data package yok</span>`;

  const runBody = engineRuns.length ? `
    <div class="subsection-title">Son runlar</div>
    <table class="data-table compact-table">
      <thead><tr><th>Run</th><th>Durum</th><th>Versiyon</th><th>Ozet</th></tr></thead>
      <tbody>${engineRuns.slice(0, 5).map((run) => `
        <tr>
          <td>${escapeHtml(run.run_key)}</td>
          <td>${badge(run.status, runStatusClass(run.status))}</td>
          <td>${escapeHtml(run.engine_version)}</td>
          <td>
            ${escapeHtml(run.result_summary?.best_unit_count ?? run.result_summary?.estimated_unit_capacity ?? "-")} birim /
            ${escapeHtml(run.result_summary?.best_layout_name || "-")}
            <div class="muted">${escapeHtml(run.result_summary?.best_owner_units ?? "-")} mal sahibi / ${escapeHtml(run.result_summary?.best_contractor_units ?? "-")} muteahhit</div>
            <div class="muted">${escapeHtml(run.result_summary?.core_type || "-")} / fit ${escapeHtml(confidence(run.result_summary?.best_fit_score))} / offer ${escapeHtml(confidence(run.result_summary?.best_offer_ready_score))}</div>
          </td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Motor run kaydi yok</span>`;

  const stepBody = engineSteps.length ? `
    <div class="subsection-title">Motor adimlari</div>
    <table class="data-table compact-table">
      <thead><tr><th>Modul</th><th>Durum</th><th>Bulgu</th></tr></thead>
      <tbody>${engineSteps.slice(0, 16).map((step) => `
        <tr>
          <td>${escapeHtml(step.sequence_no)}. ${escapeHtml(step.module_key)}</td>
          <td>${badge(step.status, runStatusClass(step.status))}</td>
          <td>${escapeHtml((step.findings || []).map((item) => item.code).join(", ") || "-")}</td>
        </tr>
      `).join("")}</tbody>
    </table>
  ` : `<span class="muted">Motor adimi yok</span>`;

  return `
    ${projectBody}
    ${envelopeBody}
    ${coreBody}
    ${layoutBody}
    ${mixBody}
    ${sharingBody}
    ${allocationBody}
    ${offerBody}
    ${runBody}
    ${stepBody}
  `;
}

function renderParcel(parcel) {
  if (!parcel) {
    els.parcelDetail.className = "parcel-detail empty-state";
    els.parcelDetail.innerHTML = `<h2>Bir uyari secin</h2><p>Secilen ada-parselin CAD, Excel, PDF ve kaynak dosya bilgileri burada gorunecek.</p>`;
    return;
  }

  els.parcelDetail.className = "parcel-detail";
  const cad = parcel.cad_plans?.[0] || null;
  const cadUnitPlans = parcel.cad_unit_plans || [];
  const cadUnitCandidates = parcel.cad_unit_candidates || [];
  const cadUnitFindings = parcel.cad_unit_findings || [];
  const excel = parcel.excel_old_metraj;
  const proposals = parcel.proposal_summaries || [];
  const proposalV2Records = parcel.proposal_v2_records || [];
  const proposalV2Terms = parcel.proposal_v2_terms || [];
  const contractEvaluations = parcel.contract_rule_evaluations || [];
  const contractFindings = parcel.contract_rule_findings || [];
  const documentEvidence = parcel.document_qa_evidence || [];
  const reviewTasks = parcel.review_tasks || [];
  const companyExample = parcel.company_project_example;
  const companyLayoutPatterns = parcel.company_layout_patterns || [];
  const companySharingPatterns = parcel.company_sharing_patterns || [];
  const automationModules = parcel.automation_engine_modules || [];
  const inputProjects = parcel.input_projects || [];
  const engineRuns = parcel.engine_runs || [];
  const engineSteps = parcel.engine_run_steps || [];
  const envelopeResults = parcel.building_envelope_results || [];
  const coreResults = parcel.core_placement_results || [];
  const layoutOptions = parcel.unit_layout_options || [];
  const unitMixOptions = parcel.unit_mix_options || [];
  const sharingOptions = parcel.sharing_payment_options || [];
  const sharingAllocations = parcel.sharing_unit_allocations || [];
  const offerPackages = parcel.offer_data_packages || [];
  const proposalCount = proposals.length;
  const proposalV2Count = proposalV2Records.length;
  const primaryCadUnits = cadUnitPlans.reduce((sum, item) => sum + Number(item.primary_candidate_count || 0), 0);
  const maxContractScore = contractEvaluations.reduce((max, item) => Math.max(max, Number(item.risk_score || 0)), 0);
  const openWarnings = (parcel.warnings || []).filter((item) => item.status === "open").length;
  const activeReviewTasks = reviewTasks.filter((item) => item.status === "open" || item.status === "reviewing").length;

  const notes = (parcel.review_notes || []).length
    ? `<ul class="note-list">${parcel.review_notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
    : `<span class="muted">Not yok</span>`;

  const cadBody = cad ? `
    <div class="stat-grid">
      ${stat("Oda-m2 eslesmesi", cad.room_area_pair_count || 0)}
      ${stat("CAD oda toplam m2", fmtM2(cad.detected_room_area_m2))}
      ${stat("NET etiket", cad.net_label_count || 0)}
      ${stat("NET toplam m2", fmtM2(cad.net_label_sum_m2))}
    </div>
    <table class="data-table">
      <thead><tr><th>Oda tipi</th><th>Adet</th></tr></thead>
      <tbody>${Object.entries(cad.dominant_rooms || {}).map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`).join("") || `<tr><td colspan="2" class="muted">Kayit yok</td></tr>`}</tbody>
    </table>
  ` : `<span class="muted">CAD semantik plan yok</span>`;

  const excelBody = excel ? `
    <div class="stat-grid">
      ${stat("Eski toplam m2", fmtM2(excel.old_total_m2))}
      ${stat("Yontem", excel.method || "-")}
      ${stat("Bilesen", excel.component_count || 0)}
      ${stat("Dosya", "1")}
    </div>
    <div class="muted text-ellipsis">${escapeHtml(excel.relative_path)}</div>
  ` : `<span class="muted">Eski metraj Excel'i yok</span>`;

  const proposalBody = `
    ${renderLegacyProposals(proposals)}
    ${renderProposalV2Records(proposalV2Records)}
    ${renderProposalV2Terms(proposalV2Terms)}
  `;

  const cadUnitBody = renderCadUnits(cadUnitPlans, cadUnitCandidates, cadUnitFindings);

  const contractBody = renderContractRules(contractEvaluations, contractFindings);
  const documentQaBody = renderDocumentQa(documentEvidence, state.qaAnswer);
  const reviewTaskBody = renderReviewTasks(reviewTasks);
  const companyDatasetBody = renderCompanyDataset(companyExample, companyLayoutPatterns, companySharingPatterns, automationModules);
  const automationPrototypeBody = renderAutomationPrototype(
    inputProjects,
    engineRuns,
    envelopeResults,
    coreResults,
    layoutOptions,
    unitMixOptions,
    sharingOptions,
    sharingAllocations,
    offerPackages,
    engineSteps,
  );

  const warningsBody = `
    <table class="data-table">
      <thead><tr><th>ID</th><th>Seviye</th><th>Durum</th><th>Kod</th><th>Mesaj</th></tr></thead>
      <tbody>${(parcel.warnings || []).map((warning) => `
        <tr>
          <td>${warning.id}</td>
          <td>${badge(warning.level, warning.level)}</td>
          <td>${escapeHtml(warning.status)}</td>
          <td>${escapeHtml(warning.code)}</td>
          <td>${escapeHtml(warning.message)}</td>
        </tr>
      `).join("") || `<tr><td colspan="5" class="muted">Uyari yok</td></tr>`}</tbody>
    </table>
  `;

  const sourceBody = `
    <div class="source-list">
      ${(parcel.source_files || []).map((file) => `
        <div class="file-row">
          <span class="badge file-kind">${escapeHtml(file.kind)}</span>
          <div class="text-ellipsis">
            <strong>${escapeHtml(file.stage || "-")}</strong>
            <div class="muted">${escapeHtml(file.relative_path)}</div>
          </div>
        </div>
      `).join("") || `<span class="muted">Kaynak dosya yok</span>`}
    </div>
  `;

  els.parcelDetail.innerHTML = `
    <div class="parcel-heading">
      <div>
        <h2>${escapeHtml(parcel.parcel_key)}</h2>
        <div class="parcel-meta">
          ${badge(parcel.status, "")}
          ${badge(parcel.reconciliation_quality, "")}
        </div>
      </div>
      <div class="parcel-meta">
        ${badge(`${openWarnings} acik`, openWarnings ? "review" : "info")}
      </div>
    </div>

    <div class="stat-grid">
      ${stat("Kaynak dosya", parcel.source_files?.length || 0)}
      ${stat("CAD plan", parcel.cad_plans?.length || 0)}
      ${stat("CAD aday", primaryCadUnits)}
      ${stat("Teklif PDF", proposalCount)}
      ${stat("Teklif V2", proposalV2Count)}
      ${stat("Kontrat risk", maxContractScore)}
      ${stat("QA kanit", documentEvidence.length)}
      ${stat("Aktif gorev", activeReviewTasks)}
      ${stat("Dataset ornek", companyExample ? 1 : 0)}
      ${stat("Input proje", inputProjects.length)}
      ${stat("Engine run", engineRuns.length)}
      ${stat("Layout secenek", layoutOptions.length)}
      ${stat("Paylasim", sharingOptions.length)}
      ${stat("Offer paket", offerPackages.length)}
      ${stat("Uyari", parcel.warnings?.length || 0)}
    </div>

    ${section("Inceleme Notlari", notes)}
    ${section("Otomasyon Girdisi ve Run", automationPrototypeBody)}
    ${section("Firma Dataset ve Motor", companyDatasetBody)}
    ${section("Review Gorevleri", reviewTaskBody)}
    ${section("Kanit ve Soru-Cevap", documentQaBody)}
    ${section("CAD Ozeti", cadBody)}
    ${section("CAD Bagimsiz Bolum", cadUnitBody)}
    ${section("Excel Eski Metraj", excelBody)}
    ${section("Teklif PDF", proposalBody)}
    ${section("Sozlesme Kurallari", contractBody)}
    ${section("Uyarilar", warningsBody)}
    ${section("Kaynak Dosyalar", sourceBody)}
  `;
}

async function loadSummary() {
  state.summary = await api("/api/summary");
  renderMetrics();
}

async function loadWarnings() {
  const data = await api(warningQuery());
  state.warnings = data.data || [];
  renderWarnings(data.total || 0);
  if (!state.selectedWarning && state.warnings.length) {
    await selectWarning(state.warnings[0].id);
  }
}

async function loadParcel(parcelKey) {
  if (!parcelKey) {
    state.selectedParcel = null;
    state.qaAnswer = null;
    renderParcel(null);
    return;
  }
  if (state.selectedParcel?.parcel_key !== parcelKey) {
    state.qaAnswer = null;
  }
  state.selectedParcel = await api(`/api/parcels/${encodeURIComponent(parcelKey)}`);
  renderParcel(state.selectedParcel);
}

async function selectWarning(id) {
  const warning = state.warnings.find((item) => item.id === Number(id));
  if (!warning) return;
  state.selectedWarning = warning;
  renderWarnings(state.warnings.length);
  renderSelectedWarning();
  await loadParcel(warning.parcel_key);
}

async function refreshAll({ keepSelection = true } = {}) {
  const selectedId = keepSelection ? state.selectedWarning?.id : null;
  await loadSummary();
  const data = await api(warningQuery());
  state.warnings = data.data || [];
  renderWarnings(data.total || 0);
  if (selectedId && state.warnings.some((item) => item.id === selectedId)) {
    state.selectedWarning = state.warnings.find((item) => item.id === selectedId);
    renderSelectedWarning();
    await loadParcel(state.selectedWarning.parcel_key);
  } else if (state.warnings.length) {
    state.selectedWarning = null;
    await selectWarning(state.warnings[0].id);
  } else {
    state.selectedWarning = null;
    renderSelectedWarning();
    renderParcel(null);
  }
}

async function updateWarning(status) {
  if (!state.selectedWarning) return;
  const note = els.resolutionNote.value.trim();
  const updated = await api(`/api/warnings/${state.selectedWarning.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolution_note: note || null }),
  });
  state.selectedWarning = updated;
  toast(`Uyari ${status} olarak kaydedildi`);
  await refreshAll({ keepSelection: status === state.filters.status || !state.filters.status });
}

async function askParcelQuestion() {
  if (!state.selectedParcel) return;
  const input = els.parcelDetail.querySelector("#parcelQaInput");
  const params = new URLSearchParams();
  params.set("parcel_key", state.selectedParcel.parcel_key);
  params.set("limit", "8");
  const query = input?.value.trim() || "";
  if (query) params.set("q", query);
  state.qaAnswer = await api(`/api/document-qa/ask?${params.toString()}`);
  renderParcel(state.selectedParcel);
}

async function createReviewDecision(taskId, decisionType) {
  const parcelKey = state.selectedParcel?.parcel_key;
  const note = els.resolutionNote.value.trim();
  await api(`/api/review-tasks/${encodeURIComponent(taskId)}/decisions`, {
    method: "POST",
    body: JSON.stringify({
      decision_type: decisionType,
      decision_note: note || null,
      created_by: "human_review",
    }),
  });
  toast("Gorev karari kaydedildi");
  await loadSummary();
  const data = await api(warningQuery());
  state.warnings = data.data || [];
  renderWarnings(data.total || 0);
  if (state.selectedWarning && !state.warnings.some((item) => item.id === state.selectedWarning.id)) {
    state.selectedWarning = null;
  }
  renderSelectedWarning();
  if (parcelKey) {
    await loadParcel(parcelKey);
  }
}

async function runEngineProject(projectKey) {
  const parcelKey = state.selectedParcel?.parcel_key;
  await api(`/api/input-projects/${encodeURIComponent(projectKey)}/engine-runs`, {
    method: "POST",
    body: JSON.stringify({ triggered_by: "ui" }),
  });
  toast("Motor run tamamlandi");
  await loadSummary();
  if (parcelKey) {
    await loadParcel(parcelKey);
  }
}

async function search() {
  const q = els.globalSearch.value.trim();
  if (!q) {
    els.searchResults.innerHTML = "";
    return;
  }
  const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
  const parcels = data.parcels || [];
  els.searchResults.innerHTML = parcels.length ? parcels.map((parcel) => `
    <div class="result-row" data-parcel-key="${escapeHtml(parcel.parcel_key)}">
      <strong>${escapeHtml(parcel.parcel_key)}</strong>
      <div class="muted">${escapeHtml(parcel.status)} / ${escapeHtml(parcel.reconciliation_quality)}</div>
    </div>
  `).join("") : `<div class="selected-warning muted">Sonuc yok</div>`;
}

function bindEvents() {
  els.warningList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-warning-id]");
    if (button) selectWarning(button.dataset.warningId).catch((error) => toast(error.message));
  });

  els.statusFilter.addEventListener("change", () => {
    state.filters.status = els.statusFilter.value;
    state.selectedWarning = null;
    refreshAll({ keepSelection: false }).catch((error) => toast(error.message));
  });

  els.levelFilter.addEventListener("change", () => {
    state.filters.level = els.levelFilter.value;
    state.selectedWarning = null;
    refreshAll({ keepSelection: false }).catch((error) => toast(error.message));
  });

  let searchTimer = null;
  els.queueSearch.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.filters.q = els.queueSearch.value.trim();
      state.selectedWarning = null;
      refreshAll({ keepSelection: false }).catch((error) => toast(error.message));
    }, 250);
  });

  els.refreshBtn.addEventListener("click", () => {
    refreshAll().then(() => toast("Yenilendi")).catch((error) => toast(error.message));
  });

  document.querySelectorAll(".status-actions button").forEach((button) => {
    button.addEventListener("click", () => updateWarning(button.dataset.status).catch((error) => toast(error.message)));
  });

  els.parcelDetail.addEventListener("click", (event) => {
    if (event.target.closest("#parcelQaAskBtn")) {
      askParcelQuestion().catch((error) => toast(error.message));
      return;
    }
    const taskButton = event.target.closest("[data-review-task-id][data-decision-type]");
    if (taskButton) {
      createReviewDecision(taskButton.dataset.reviewTaskId, taskButton.dataset.decisionType).catch((error) => toast(error.message));
      return;
    }
    const engineButton = event.target.closest("[data-engine-project-key]");
    if (engineButton) {
      runEngineProject(engineButton.dataset.engineProjectKey).catch((error) => toast(error.message));
    }
  });

  els.parcelDetail.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("#parcelQaInput")) {
      event.preventDefault();
      askParcelQuestion().catch((error) => toast(error.message));
    }
  });

  els.globalSearchBtn.addEventListener("click", () => search().catch((error) => toast(error.message)));
  els.globalSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") search().catch((error) => toast(error.message));
  });

  els.searchResults.addEventListener("click", async (event) => {
    const row = event.target.closest("[data-parcel-key]");
    if (!row) return;
    state.selectedWarning = null;
    renderSelectedWarning();
    await loadParcel(row.dataset.parcelKey);
  });
}

async function init() {
  bindEvents();
  renderSelectedWarning();
  await refreshAll({ keepSelection: false });
}

init().catch((error) => toast(error.message));
