import {
  kentselWorkflowSteps,
  offerPackageStepIndex,
  offerPrerequisiteStepIndex
} from "@/lib/domain/kentsel-workflow";
import {
  normalizeKentselProjectIntakeSummary,
  type KentselProjectIntakeSummary
} from "@/lib/domain/project-intake";

export type KentselProjectSource = "Demo" | "Taslak" | "Gerçek" | "Backend" | "Arşiv";
export type KentselProjectStatus = "Hazırlık" | "İnceleme" | "Teklif" | "Kilitli";

export type KentselProjectFile = {
  id: string;
  name: string;
  type: string;
  status: "Yüklendi" | "Okundu" | "Kontrol";
};

export type KentselProjectActivity = {
  id: string;
  title: string;
  time: string;
  tone: "info" | "success" | "warning";
};

export type KentselProject = {
  id: string;
  name: string;
  client: string;
  architect: string;
  district: string;
  neighborhood: string;
  ada: string;
  parsel: string;
  area: string;
  zoning: string;
  ratio: string;
  units: string;
  createdAt: string;
  updatedAt: string;
  status: KentselProjectStatus;
  source?: KentselProjectSource;
  progress: number;
  stepIndex: number;
  offerReady: boolean;
  locked: boolean;
  files: KentselProjectFile[];
  intakeSummary?: KentselProjectIntakeSummary;
  notes: string;
  activity: KentselProjectActivity[];
};

export type KentselProjectDraft = {
  name: string;
  client: string;
  architect: string;
  district: string;
  neighborhood: string;
  ada: string;
  parsel: string;
  area: string;
  zoning: string;
  ratio: string;
  units: string;
  notes: string;
  files: KentselProjectFile[];
};

const kentselFileStatuses: KentselProjectFile["status"][] = ["Yüklendi", "Okundu", "Kontrol"];
const kentselActivityTones: KentselProjectActivity["tone"][] = ["info", "success", "warning"];

export function createKentselProjectFromDraft(
  draft: KentselProjectDraft,
  options: {
    activityId: string;
    fallbackArchitect: string;
    intakeSummary?: KentselProjectIntakeSummary;
  }
): KentselProject {
  const ada = draft.ada.trim() || "0000";
  const parsel = draft.parsel.trim() || "0";

  return {
    id: `PRJ-${ada}-${parsel}`,
    name: draft.name.trim(),
    client: draft.client.trim() || "Müşteri eklenmedi",
    architect: draft.architect.trim() || options.fallbackArchitect,
    district: draft.district.trim() || "İlçe",
    neighborhood: draft.neighborhood.trim() || "Mahalle",
    ada,
    parsel,
    area: draft.area.trim() || "Alan girilmedi",
    zoning: draft.zoning.trim() || "İmar bilgisi bekliyor",
    ratio: draft.ratio.trim() || "%50",
    units: draft.units.trim() || "0",
    createdAt: "Bugün",
    updatedAt: "Az önce",
    status: "Hazırlık",
    source: "Taslak",
    progress: 6,
    stepIndex: 1,
    offerReady: false,
    locked: false,
    files: draft.files,
    intakeSummary: options.intakeSummary,
    notes: draft.notes.trim() || "Mimar notu eklenmedi.",
    activity: [{ id: options.activityId, title: "Proje oluşturuldu", time: "Az önce", tone: "success" }]
  };
}

export function detectKentselFileType(name: string) {
  const lower = name.toLocaleLowerCase("tr-TR");
  if (lower.endsWith(".dwg") || lower.endsWith(".dxf")) return "CAD";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) return "Metraj";
  if (lower.endsWith(".pdf")) return lower.includes("imar") ? "İmar" : "PDF";
  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "Görsel";
  return "Kaynak";
}

export function normalizeKentselProject(value: unknown): KentselProject | null {
  if (!isRecord(value)) return null;

  const id = safeString(value.id);
  const name = safeString(value.name);
  if (!id || !name) return null;

  const stepIndex = clampInteger(value.stepIndex, 0, kentselWorkflowSteps.length);
  const progress = clampInteger(value.progress, 0, 100);
  const offerReady = Boolean(value.offerReady) && stepIndex >= offerPackageStepIndex;
  const locked = Boolean(value.locked) && offerReady;
  const source = normalizeProjectSource(value.source, locked);

  return {
    id,
    name,
    client: safeString(value.client, "Müşteri eklenmedi"),
    architect: safeString(value.architect, "Mimar"),
    district: safeString(value.district, "İlçe"),
    neighborhood: safeString(value.neighborhood, "Mahalle"),
    ada: safeString(value.ada, "0000"),
    parsel: safeString(value.parsel, "0"),
    area: safeString(value.area, "Alan girilmedi"),
    zoning: safeString(value.zoning, "İmar bilgisi bekliyor"),
    ratio: safeString(value.ratio, "%50"),
    units: safeString(value.units, "0"),
    createdAt: safeString(value.createdAt, "Bugün"),
    updatedAt: safeString(value.updatedAt, "Az önce"),
    status: normalizeProjectStatus(locked, offerReady, stepIndex),
    source,
    progress: locked ? 100 : progress,
    stepIndex: locked ? kentselWorkflowSteps.length : stepIndex,
    offerReady,
    locked,
    files: Array.isArray(value.files) ? value.files.map(normalizeProjectFile).filter(isDefined) : [],
    intakeSummary: normalizeKentselProjectIntakeSummary(value.intakeSummary) ?? undefined,
    notes: safeString(value.notes, "Mimar notu eklenmedi."),
    activity: Array.isArray(value.activity) ? value.activity.map(normalizeProjectActivity).filter(isDefined) : []
  };
}

export function completeKentselWorkflowStep(
  project: KentselProject,
  activityId: string
): KentselProject {
  const nextStep = Math.min(project.stepIndex + 1, kentselWorkflowSteps.length);
  const done = nextStep >= kentselWorkflowSteps.length;
  const completedStep = kentselWorkflowSteps[Math.min(project.stepIndex, kentselWorkflowSteps.length - 1)];

  return {
    ...project,
    stepIndex: nextStep,
    progress: done ? 100 : Math.round((nextStep / kentselWorkflowSteps.length) * 100),
    status: done ? "Teklif" : nextStep >= 14 ? "Teklif" : "İnceleme",
    updatedAt: "Az önce",
    activity: [
      {
        id: activityId,
        title: `${completedStep.title} tamamlandı`,
        time: "Az önce",
        tone: "success"
      },
      ...project.activity
    ]
  };
}

export function markKentselOfferReady(
  project: KentselProject,
  activityId: string
): KentselProject {
  if (project.stepIndex < offerPrerequisiteStepIndex) {
    return project;
  }

  return {
    ...project,
    offerReady: true,
    status: "Teklif",
    stepIndex: Math.max(project.stepIndex, offerPackageStepIndex),
    progress: Math.max(project.progress, 94),
    updatedAt: "Az önce",
    activity: [
      { id: activityId, title: "Teklif PDF paketi üretildi", time: "Az önce", tone: "success" },
      ...project.activity
    ]
  };
}

export function lockKentselProjectVersion(
  project: KentselProject,
  activityId: string
): KentselProject {
  if (!project.offerReady || project.stepIndex < offerPackageStepIndex) {
    return project;
  }

  return {
    ...project,
    locked: true,
    status: "Kilitli",
    source: "Arşiv",
    progress: 100,
    stepIndex: kentselWorkflowSteps.length,
    updatedAt: "Az önce",
    activity: [
      {
        id: activityId,
        title: "Teklif versiyonu insan onayı ile kilitlendi",
        time: "Az önce",
        tone: "success"
      },
      ...project.activity
    ]
  };
}

export function updateKentselProjectNotes(
  project: KentselProject,
  notes: string
): KentselProject {
  const normalizedNotes = notes.trim() ? notes : "Mimar notu eklenmedi.";

  if (normalizedNotes === project.notes) {
    return project;
  }

  return {
    ...project,
    notes: normalizedNotes,
    updatedAt: "Az önce"
  };
}

function normalizeProjectStatus(locked: boolean, offerReady: boolean, stepIndex: number): KentselProjectStatus {
  if (locked) return "Kilitli";
  if (offerReady || stepIndex >= 14) return "Teklif";
  return stepIndex > 1 ? "İnceleme" : "Hazırlık";
}

function normalizeProjectSource(value: unknown, locked: boolean): KentselProjectSource {
  if (locked) return "Arşiv";
  if (
    value === "Demo" ||
    value === "Taslak" ||
    value === "Gerçek" ||
    value === "Backend" ||
    value === "Arşiv"
  ) {
    return value;
  }

  return "Gerçek";
}

function normalizeProjectFile(value: unknown): KentselProjectFile | null {
  if (!isRecord(value)) return null;

  const id = safeString(value.id);
  const name = safeString(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    type: safeString(value.type, detectKentselFileType(name)),
    status: kentselFileStatuses.includes(value.status as KentselProjectFile["status"])
      ? (value.status as KentselProjectFile["status"])
      : "Yüklendi"
  };
}

function normalizeProjectActivity(value: unknown): KentselProjectActivity | null {
  if (!isRecord(value)) return null;

  const id = safeString(value.id);
  const title = safeString(value.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    time: safeString(value.time, "Az önce"),
    tone: kentselActivityTones.includes(value.tone as KentselProjectActivity["tone"])
      ? (value.tone as KentselProjectActivity["tone"])
      : "info"
  };
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clampInteger(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function isDefined<Value>(value: Value | null | undefined): value is Value {
  return value != null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
