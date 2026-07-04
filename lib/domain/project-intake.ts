import type { KentselProjectDraft, KentselProjectFile } from "@/lib/domain/kentsel-project";

export type IntakeChecklistSeverity = "required" | "recommended";
export type IntakeChecklistStatus = "complete" | "missing";
export type IntakeSourceStatus = "captured" | "waiting" | "derived";

export type KentselProjectIntakeChecklistItem = {
  label: string;
  reason: string;
  severity: IntakeChecklistSeverity;
  status: IntakeChecklistStatus;
};

export type KentselProjectIntakeSource = {
  label: string;
  source: string;
  status: IntakeSourceStatus;
  value: string;
};

export type KentselProjectIntakeNextModule = {
  label: string;
  reason: string;
  route: string;
};

export type KentselProjectIntakeSummary = {
  architectNotes: string;
  brief: string[];
  daireKarmasiPreference: string;
  humanApproval: {
    reason: string;
    required: true;
  };
  missingDataChecklist: KentselProjectIntakeChecklistItem[];
  nextModule: KentselProjectIntakeNextModule;
  provenance: KentselProjectIntakeSource[];
  readinessScore: number;
  suggestedNextSteps: string[];
};

const sourceLinePrefix = "Daire karması tercihi:";

export function analyzeKentselProjectIntake(
  draft: KentselProjectDraft,
  options: { daireKarmasiPreference?: string | null } = {}
): KentselProjectIntakeSummary {
  const daireKarmasiPreference =
    clean(options.daireKarmasiPreference) || parseDaireKarmasiPreference(draft.notes) || "Tercih bekleniyor";
  const requiredItems = createRequiredChecklist(draft);
  const recommendedItems = createRecommendedChecklist(draft, daireKarmasiPreference);
  const missingDataChecklist = [...requiredItems, ...recommendedItems];
  const missingRequiredCount = requiredItems.filter((item) => item.status === "missing").length;
  const completedCount = missingDataChecklist.filter((item) => item.status === "complete").length;
  const readinessScore = Math.round((completedCount / missingDataChecklist.length) * 100);

  return {
    architectNotes: clean(draft.notes) || "Mimar notu bekleniyor.",
    brief: createBrief(draft, daireKarmasiPreference),
    daireKarmasiPreference,
    humanApproval: {
      required: true,
      reason:
        missingRequiredCount > 0
          ? "Zorunlu kimlik ve parsel alanları tamamlanmadan çalışma alanı açılmamalı."
          : "Bu intake özeti yalnızca başlangıç önerisidir; teklif, paylaşım ve kilit kararları mimar onayı gerektirir."
    },
    missingDataChecklist,
    nextModule: createNextModuleRecommendation(draft, daireKarmasiPreference),
    provenance: createProvenance(draft, daireKarmasiPreference),
    readinessScore,
    suggestedNextSteps: createSuggestedNextSteps(draft, missingRequiredCount, daireKarmasiPreference)
  };
}

export function normalizeKentselProjectIntakeSummary(value: unknown): KentselProjectIntakeSummary | null {
  if (!isRecord(value)) return null;

  const brief = normalizeStringArray(value.brief);
  const missingDataChecklist = Array.isArray(value.missingDataChecklist)
    ? value.missingDataChecklist.map(normalizeChecklistItem).filter(isDefined)
    : [];
  const provenance = Array.isArray(value.provenance)
    ? value.provenance.map(normalizeSource).filter(isDefined)
    : [];
  const suggestedNextSteps = normalizeStringArray(value.suggestedNextSteps);
  const nextModule = normalizeNextModule(value.nextModule);

  if (!brief.length || !missingDataChecklist.length || !provenance.length || !suggestedNextSteps.length || !nextModule) {
    return null;
  }

  return {
    architectNotes: clean(safeUnknownString(value.architectNotes)) || "Mimar notu bekleniyor.",
    brief,
    daireKarmasiPreference: clean(safeUnknownString(value.daireKarmasiPreference)) || "Tercih bekleniyor",
    humanApproval: {
      required: true,
      reason: clean(isRecord(value.humanApproval) ? safeUnknownString(value.humanApproval.reason) : "") || "İnsan onayı gereklidir."
    },
    missingDataChecklist,
    nextModule,
    provenance,
    readinessScore: clampScore(value.readinessScore),
    suggestedNextSteps
  };
}

function createBrief(draft: KentselProjectDraft, daireKarmasiPreference: string) {
  const projectName = clean(draft.name) || "Proje adı bekleniyor";
  const location = [clean(draft.district), clean(draft.neighborhood)].filter(Boolean).join(" / ");
  const parcel = clean(draft.ada) && clean(draft.parsel) ? `Ada ${clean(draft.ada)} Parsel ${clean(draft.parsel)}` : "Ada/parsel bekleniyor";
  const zoning = clean(draft.zoning) || "İmar notu bekleniyor";
  const area = clean(draft.area) || "Parsel alanı bekleniyor";
  const ratio = clean(draft.ratio) || "Paylaşım oranı bekleniyor";
  const units = clean(draft.units) || "Daire hedefi bekleniyor";

  return [
    `${projectName} için ${location || "konum bekleniyor"} konumunda ${parcel} kaydı hazırlanıyor.`,
    `İmar girdisi: ${zoning}; parsel alanı: ${area}.`,
    `Kat karşılığı hedefi ${ratio}, daire hedefi ${units}; daire karması tercihi: ${daireKarmasiPreference}.`
  ];
}

function createRequiredChecklist(draft: KentselProjectDraft): KentselProjectIntakeChecklistItem[] {
  return [
    {
      label: "Proje adı",
      reason: "Portföy ve teklif paketi kimliği için zorunlu.",
      severity: "required",
      status: clean(draft.name) ? "complete" : "missing"
    },
    {
      label: "İlçe / mahalle",
      reason: "Parsel analizi ve imar araması için zorunlu.",
      severity: "required",
      status: clean(draft.district) && clean(draft.neighborhood) ? "complete" : "missing"
    },
    {
      label: "Ada / parsel",
      reason: "8.3 iş akışının parselden teklife izlenebilir başlaması için zorunlu.",
      severity: "required",
      status: clean(draft.ada) && clean(draft.parsel) ? "complete" : "missing"
    }
  ];
}

function createRecommendedChecklist(
  draft: KentselProjectDraft,
  daireKarmasiPreference: string
): KentselProjectIntakeChecklistItem[] {
  return [
    {
      label: "Parsel alanı",
      reason: "Derinlik, hmax, çekme ve emsal kontrolleri için önerilir.",
      severity: "recommended",
      status: clean(draft.area) ? "complete" : "missing"
    },
    {
      label: "İmar notu",
      reason: "Zoning/imar modülünün ilk kontrolünü hızlandırır.",
      severity: "recommended",
      status: clean(draft.zoning) ? "complete" : "missing"
    },
    {
      label: "Kaynak dosyalar",
      reason: "E-imar, eski plan, metraj ve pafta kanıtlarını izlenebilir yapar.",
      severity: "recommended",
      status: draft.files.length ? "complete" : "missing"
    },
    {
      label: "Daire karması tercihi",
      reason: "Çekirdek ve daire karması modülünün ilk öneri çerçevesini belirler.",
      severity: "recommended",
      status: daireKarmasiPreference === "Tercih bekleniyor" ? "missing" : "complete"
    },
    {
      label: "Mimar notu",
      reason: "Malik, cephe, paylaşım veya özel kararları teklif izine taşır.",
      severity: "recommended",
      status: clean(draft.notes) ? "complete" : "missing"
    }
  ];
}

function createProvenance(
  draft: KentselProjectDraft,
  daireKarmasiPreference: string
): KentselProjectIntakeSource[] {
  return [
    source("Proje kimliği", clean(draft.name), "Mimar girişi"),
    source("Parsel", clean(draft.ada) && clean(draft.parsel) ? `${clean(draft.ada)} / ${clean(draft.parsel)}` : "", "Mimar girişi"),
    source("İmar", clean(draft.zoning), "Mimar girişi"),
    source("Kaynak dosya", summarizeFiles(draft.files), draft.files.length ? "Dosya adı ve tipi" : "Bekliyor"),
    source("Daire karması", daireKarmasiPreference === "Tercih bekleniyor" ? "" : daireKarmasiPreference, "Mimar tercihi"),
    source("İnsan onayı", "Zorunlu", "8.3 teklif kilidi", "derived")
  ];
}

function createSuggestedNextSteps(
  draft: KentselProjectDraft,
  missingRequiredCount: number,
  daireKarmasiPreference: string
) {
  if (missingRequiredCount > 0) {
    return [
      "Önce proje adı, ilçe/mahalle ve ada/parsel alanlarını tamamlayın.",
      "Eksik zorunlu alanlar tamamlanmadan proje çalışma alanı açılmayacak."
    ];
  }

  const suggestions: string[] = [];

  if (!clean(draft.zoning) || !clean(draft.area)) {
    suggestions.push("İmar notu ve parsel alanını netleştirip derinlik/hmax kontrolüne hazırlanın.");
  }

  if (!draft.files.length) {
    suggestions.push("E-imar, eski plan, metraj veya pafta dosyalarını kaynak kasasına bağlayın.");
  }

  if (daireKarmasiPreference === "Tercih bekleniyor") {
    suggestions.push("Daire karması tercihini seçerek çekirdek/apartment-mix öneri çerçevesini belirleyin.");
  }

  if (!suggestions.length) {
    suggestions.push("Parsel analiziyle başlayıp imar/depth/hmax kontrolünü açın.");
    suggestions.push("İlk sonuçlardan sonra paylaşım ve teklif ön kontrolünü mimar onayıyla ilerletin.");
  }

  return suggestions;
}

function createNextModuleRecommendation(
  draft: KentselProjectDraft,
  daireKarmasiPreference: string
): KentselProjectIntakeNextModule {
  if (!clean(draft.district) || !clean(draft.neighborhood) || !clean(draft.ada) || !clean(draft.parsel)) {
    return {
      label: "Parsel Analizi",
      reason: "Önce konum ve ada/parsel kimliği tamamlanmalı.",
      route: "site-analysis"
    };
  }

  if (!clean(draft.zoning) || !clean(draft.area)) {
    return {
      label: "İmar Kuralları",
      reason: "İmar notu, alan, çekme, depth ve hmax kontrolleri sıradaki güven katmanı.",
      route: "zoning-rules"
    };
  }

  if (!draft.files.length) {
    return {
      label: "Dosyalar",
      reason: "Eski plan, metraj, pafta ve e-imar kanıtları bağlanmalı.",
      route: "files"
    };
  }

  if (daireKarmasiPreference === "Tercih bekleniyor") {
    return {
      label: "Daire Karması",
      reason: "Çekirdek ve apartment-mix çerçevesi mimar tercihiyle netleşmeli.",
      route: "apartment-mix"
    };
  }

  return {
    label: "Çalışma Alanı",
    reason: "Intake hazır; 17 adımlı workflow içinde parselden teklife ilerleyin.",
    route: "project"
  };
}

function parseDaireKarmasiPreference(notes: string) {
  const line = notes
    .split("\n")
    .map((item) => item.trim())
    .find((item) => item.startsWith(sourceLinePrefix));

  return line?.slice(sourceLinePrefix.length).trim() ?? "";
}

function source(
  label: string,
  value: string,
  sourceName: string,
  status: IntakeSourceStatus = value ? "captured" : "waiting"
): KentselProjectIntakeSource {
  return {
    label,
    source: sourceName,
    status,
    value: value || "Bekliyor"
  };
}

function summarizeFiles(files: KentselProjectFile[]) {
  if (!files.length) return "";
  const uniqueTypes = Array.from(new Set(files.map((file) => file.type))).join(", ");
  return `${files.length} kaynak (${uniqueTypes})`;
}

function clean(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeChecklistItem(value: unknown): KentselProjectIntakeChecklistItem | null {
  if (!isRecord(value)) return null;
  const label = clean(safeUnknownString(value.label));
  const reason = clean(safeUnknownString(value.reason));
  if (!label || !reason) return null;

  return {
    label,
    reason,
    severity: value.severity === "required" ? "required" : "recommended",
    status: value.status === "complete" ? "complete" : "missing"
  };
}

function normalizeSource(value: unknown): KentselProjectIntakeSource | null {
  if (!isRecord(value)) return null;
  const label = clean(safeUnknownString(value.label));
  const sourceName = clean(safeUnknownString(value.source));
  const sourceValue = clean(safeUnknownString(value.value));
  if (!label || !sourceName || !sourceValue) return null;

  return {
    label,
    source: sourceName,
    status: value.status === "captured" || value.status === "derived" ? value.status : "waiting",
    value: sourceValue
  };
}

function normalizeNextModule(value: unknown): KentselProjectIntakeNextModule | null {
  if (!isRecord(value)) return null;
  const label = clean(safeUnknownString(value.label));
  const reason = clean(safeUnknownString(value.reason));
  const route = clean(safeUnknownString(value.route));
  if (!label || !reason || !route) return null;

  return { label, reason, route };
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => clean(safeUnknownString(item))).filter(Boolean)
    : [];
}

function clampScore(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function safeUnknownString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isDefined<Value>(value: Value | null | undefined): value is Value {
  return value != null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
