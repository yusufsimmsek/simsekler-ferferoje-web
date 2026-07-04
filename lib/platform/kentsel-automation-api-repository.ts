import {
  kentselWorkflowSteps,
  offerPackageStepIndex,
  offerPrerequisiteStepIndex
} from "@/lib/domain/kentsel-workflow";
import {
  normalizeKentselProject,
  type KentselProject
} from "@/lib/domain/kentsel-project";

export const KENTSEL_AUTOMATION_DEFAULT_PROJECT_LIMIT = 50;

export type KentselAutomationFetch = (
  input: string | URL,
  init?: RequestInit
) => Promise<Pick<Response, "ok" | "json" | "status">>;

export type KentselAutomationProjectListResult = {
  projects: KentselProject[];
  total: number;
};

export type KentselAutomationProjectInsight = {
  source: "kentsel_automation";
  projectKey: string;
  parcelKey: string | null;
  syncedAt: string;
  reviewTaskCount: number;
  openWarningCount: number;
  sharingOptionCount: number;
  allocationCount: number;
  offerPackageCount: number;
  offerPackageStatus: string | null;
  offerReadyScore: number | null;
  reviewRequired: boolean;
  latestRunStatus: string | null;
  highestPriorityReviewTask: string | null;
  warningCodes: string[];
  bestSharingOption: string | null;
};

export type KentselAutomationProjectFetchOptions = {
  baseUrl: string;
  fetcher?: KentselAutomationFetch;
  limit?: number;
  query?: string;
};

export type KentselAutomationProjectInsightFetchOptions = {
  baseUrl: string;
  fetcher?: KentselAutomationFetch;
  parcelKey?: string | null;
  projectKey: string;
};

export async function fetchKentselAutomationProjects({
  baseUrl,
  fetcher = fetch,
  limit = KENTSEL_AUTOMATION_DEFAULT_PROJECT_LIMIT,
  query
}: KentselAutomationProjectFetchOptions): Promise<KentselAutomationProjectListResult> {
  if (!baseUrl.trim()) {
    return { projects: [], total: 0 };
  }

  const url = buildKentselAutomationUrl(baseUrl, "/api/input-projects");
  url.searchParams.set("limit", String(limit));
  if (query?.trim()) {
    url.searchParams.set("q", query.trim());
  }

  const body = await fetchRequiredJson(fetcher, url);
  const records = isRecord(body) && Array.isArray(body.data) ? body.data : [];
  const projects = records.map(mapKentselAutomationProject).filter(isDefined);
  const total = isRecord(body) && typeof body.total === "number" ? body.total : projects.length;

  return { projects, total };
}

export function mapKentselAutomationProject(
  record: unknown
): KentselProject | null {
  if (!isRecord(record)) return null;

  const id = readString(record.project_key);
  const name = readString(record.project_name);
  if (!id || !name) return null;

  const ada = readAda(record);
  const parsel = readParsel(record);
  const latestRunStatus = readString(record.latest_run_status);
  const stepIndex = inferWorkflowStepIndex(record);
  const offerReady = inferOfferReady(record, stepIndex);
  const backendStatus = readString(record.status);

  return normalizeKentselProject({
    id,
    name,
    client: readString(record.company_key, "Kentsel veri çekirdeği"),
    architect: "Otomasyon çekirdeği",
    district: "Backend",
    neighborhood: readString(record.parcel_key, "Veri çekirdeği"),
    ada,
    parsel,
    area: formatArea(record.parcel_area_m2),
    zoning: formatZoning(record),
    ratio: "%50",
    units: formatUnits(record),
    createdAt: readString(record.created_at, "Backend kaydı"),
    updatedAt: readString(record.updated_at, readString(record.created_at, "Backend kaydı")),
    status: offerReady || stepIndex >= offerPrerequisiteStepIndex ? "Teklif" : "İnceleme",
    source: "Backend",
    progress: Math.max(6, Math.round((stepIndex / kentselWorkflowSteps.length) * 100)),
    stepIndex,
    offerReady,
    locked: false,
    files: [],
    notes: readString(record.manual_notes, "Kentsel otomasyon veri çekirdeğinden senkronlandı."),
    activity: [
      {
        id: `${id}-backend-sync`,
        title: latestRunStatus
          ? `Backend run durumu: ${latestRunStatus}`
          : `Backend proje durumu: ${backendStatus || "draft"}`,
        time: "Backend",
        tone: latestRunStatus === "failed" ? "warning" : "info"
      }
    ]
  });
}

export async function fetchKentselAutomationProjectInsight({
  baseUrl,
  fetcher = fetch,
  parcelKey,
  projectKey
}: KentselAutomationProjectInsightFetchOptions): Promise<KentselAutomationProjectInsight | null> {
  if (!baseUrl.trim() || !projectKey.trim()) return null;
  const scopedParcelKey = parcelKey?.trim() || null;

  if (!scopedParcelKey) {
    return createUnavailableKentselAutomationInsight(projectKey, null);
  }

  const detailUrl = buildKentselAutomationUrl(
    baseUrl,
    `/api/input-projects/${encodeURIComponent(projectKey)}`
  );
  const reviewUrl = buildKentselAutomationUrl(baseUrl, "/api/review-tasks");
  const warningsUrl = buildKentselAutomationUrl(baseUrl, "/api/warnings");
  reviewUrl.searchParams.set("status", "open");
  reviewUrl.searchParams.set("limit", "25");
  warningsUrl.searchParams.set("status", "open");
  warningsUrl.searchParams.set("limit", "25");
  reviewUrl.searchParams.set("parcel_key", scopedParcelKey);
  warningsUrl.searchParams.set("parcel_key", scopedParcelKey);

  try {
    const [detail, reviewTasksBody, warningsBody] = await Promise.all([
      fetchRequiredJson(fetcher, detailUrl),
      fetchRequiredJson(fetcher, reviewUrl),
      fetchRequiredJson(fetcher, warningsUrl)
    ]);

    if (!isRecord(detail)) {
      return createUnavailableKentselAutomationInsight(projectKey, scopedParcelKey);
    }

    return mapKentselAutomationProjectInsight({
      detail,
      parcelKey: scopedParcelKey,
      projectKey,
      reviewTasks: readListData(reviewTasksBody),
      warnings: readListData(warningsBody)
    });
  } catch {
    return createUnavailableKentselAutomationInsight(projectKey, scopedParcelKey);
  }
}

export function createUnavailableKentselAutomationInsight(
  projectKey: string,
  parcelKey: string | null
): KentselAutomationProjectInsight {
  return {
    source: "kentsel_automation",
    projectKey,
    parcelKey,
    syncedAt: "Doğrulanamadı",
    reviewTaskCount: 0,
    openWarningCount: 0,
    sharingOptionCount: 0,
    allocationCount: 0,
    offerPackageCount: 0,
    offerPackageStatus: "doğrulanamadı",
    offerReadyScore: null,
    reviewRequired: true,
    latestRunStatus: null,
    highestPriorityReviewTask: "Backend inceleme özeti doğrulanamadı.",
    warningCodes: [],
    bestSharingOption: null
  };
}

export function mapKentselAutomationProjectInsight({
  detail,
  parcelKey,
  projectKey,
  reviewTasks,
  warnings
}: {
  detail: unknown;
  parcelKey?: string | null;
  projectKey: string;
  reviewTasks: unknown[];
  warnings: unknown[];
}): KentselAutomationProjectInsight | null {
  if (!projectKey.trim()) return null;

  const sharingOptions = filterProjectRows(detail, "sharing_payment_options", projectKey);
  const allocations = filterProjectRows(detail, "sharing_unit_allocations", projectKey);
  const offerPackages = filterProjectRows(detail, "offer_data_packages", projectKey);
  const engineRuns = filterProjectRows(detail, "engine_runs", projectKey);
  const bestOfferPackage = findBestScoredRecord(offerPackages, "offer_ready_score");
  const bestSharingOption = findBestScoredRecord(sharingOptions, "offer_ready_score");
  const latestRun = engineRuns[0];
  const activeReviewTasks = reviewTasks.filter(isActiveReviewTask);
  const openWarnings = warnings.filter(isOpenWarning);

  return {
    source: "kentsel_automation",
    projectKey,
    parcelKey: parcelKey || (isRecord(detail) ? readString(detail.parcel_key) || null : null),
    syncedAt: "Az önce",
    reviewTaskCount: activeReviewTasks.length,
    openWarningCount: openWarnings.length,
    sharingOptionCount: sharingOptions.length,
    allocationCount: allocations.length,
    offerPackageCount: offerPackages.length,
    offerPackageStatus: readString(bestOfferPackage?.package_status) || null,
    offerReadyScore:
      readScore(bestOfferPackage?.offer_ready_score) ?? readScore(bestSharingOption?.offer_ready_score),
    reviewRequired:
      readBoolean(bestOfferPackage?.review_required) ||
      readBoolean(bestSharingOption?.review_required) ||
      activeReviewTasks.length > 0 ||
      openWarnings.length > 0,
    latestRunStatus: readString(latestRun?.status) || null,
    highestPriorityReviewTask: findHighestPriorityReviewTask(activeReviewTasks),
    warningCodes: openWarnings
      .map((warning) => (isRecord(warning) ? readString(warning.code) : ""))
      .filter(Boolean),
    bestSharingOption: readString(bestSharingOption?.option_name) || readString(bestSharingOption?.strategy_key) || null
  };
}

async function fetchRequiredJson(fetcher: KentselAutomationFetch, url: URL) {
  const response = await fetcher(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(readErrorMessage(body, response.status));
  }
  return body;
}

function buildKentselAutomationUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ""), normalizedBase);
}

function inferWorkflowStepIndex(record: Record<string, unknown>) {
  const status = readString(record.status);
  const latestRunStatus = readString(record.latest_run_status);
  const engineRunCount = readNumber(record.engine_run_count);
  const offerPackages = Array.isArray(record.offer_data_packages) ? record.offer_data_packages : [];

  if (offerPackages.some((item) => isOfferReadyPackage(item))) {
    return offerPackageStepIndex;
  }

  if (status === "floor_plan_ready") return 14;
  if (latestRunStatus === "completed") return 12;
  if ((engineRunCount ?? 0) > 0) return 8;
  return 2;
}

function inferOfferReady(record: Record<string, unknown>, stepIndex: number) {
  const offerPackages = Array.isArray(record.offer_data_packages) ? record.offer_data_packages : [];
  return stepIndex >= offerPrerequisiteStepIndex && offerPackages.some((item) => isOfferReadyPackage(item));
}

function isOfferReadyPackage(value: unknown) {
  if (!isRecord(value)) return false;

  const status = readString(value.package_status);
  const score = readScore(value.offer_ready_score) ?? 0;
  const reviewRequired = readBoolean(value.review_required);
  return status === "draft_ready" && score >= 70 && !reviewRequired;
}

function readAda(record: Record<string, unknown>) {
  const zoning = isRecord(record.zoning_input) ? record.zoning_input : record;
  const explicitAda = readString(zoning.ada);
  if (explicitAda) return explicitAda;

  const fromParcel = readString(record.parcel_key)?.split("-")[0];
  const fromProject = readString(record.project_key)?.match(/INPUT-(\d+)-(\d+)/)?.[1];
  return fromParcel || fromProject || "0000";
}

function readParsel(record: Record<string, unknown>) {
  const zoning = isRecord(record.zoning_input) ? record.zoning_input : record;
  const explicitParsel = readString(zoning.parsel);
  if (explicitParsel) return explicitParsel;

  const fromParcel = readString(record.parcel_key)?.split("-")[1];
  const fromProject = readString(record.project_key)?.match(/INPUT-(\d+)-(\d+)/)?.[2];
  return fromParcel || fromProject || "0";
}

function formatArea(value: unknown) {
  const area = readNumber(value);
  return area ? `${area} m²` : "Alan girilmedi";
}

function formatUnits(record: Record<string, unknown>) {
  const count = readNumber(record.estimated_unit_capacity) ?? readNumber(record.existing_area_input_count);
  return count ? String(count) : "0";
}

function formatZoning(record: Record<string, unknown>) {
  const taks = readNumber(record.taks);
  const kaks = readNumber(record.kaks_or_emsal);
  const maxFloor = readNumber(record.max_floor_count);
  const parts = [
    taks ? `TAKS ${taks}` : null,
    kaks ? `Emsal ${kaks}` : null,
    maxFloor ? `${maxFloor} kat` : null
  ].filter(isDefined);

  return parts.length ? parts.join(" / ") : "İmar bilgisi bekliyor";
}

function filterProjectRows(detail: unknown, key: string, projectKey: string) {
  if (!isRecord(detail) || !Array.isArray(detail[key])) return [];
  return detail[key].filter((item) => isRecord(item) && readString(item.project_key) === projectKey) as Array<
    Record<string, unknown>
  >;
}

function findBestScoredRecord(records: Array<Record<string, unknown>>, scoreKey: string) {
  return records.reduce<Record<string, unknown> | null>((best, record) => {
    const score = readNumber(record[scoreKey]) ?? -1;
    const bestScore = best ? readNumber(best[scoreKey]) ?? -1 : -1;
    return !best || score > bestScore ? record : best;
  }, null);
}

function findHighestPriorityReviewTask(records: unknown[]) {
  const sorted = records.filter(isRecord).sort((first, second) => {
    const secondPriority = readNumber(second.priority) ?? 0;
    const firstPriority = readNumber(first.priority) ?? 0;
    return secondPriority - firstPriority;
  });
  const task = sorted[0];
  return task ? readString(task.title) || readString(task.summary) || readString(task.required_action) || null : null;
}

function readListData(body: unknown) {
  if (!isRecord(body)) return [];
  return Array.isArray(body.data) ? body.data : [];
}

function isActiveReviewTask(value: unknown) {
  if (!isRecord(value)) return false;
  return ["open", "reviewing"].includes(readString(value.status));
}

function isOpenWarning(value: unknown) {
  if (!isRecord(value)) return false;
  return readString(value.status) === "open";
}

function readErrorMessage(body: unknown, status: number) {
  if (isRecord(body)) {
    return readString(body.detail) || readString(body.error) || `Kentsel automation API error ${status}`;
  }
  return `Kentsel automation API error ${status}`;
}

function readString(value: unknown, fallback = "") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function readScore(value: unknown) {
  const score = readNumber(value);
  if (score == null) return null;
  return Math.max(0, Math.min(100, score));
}

function readBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return ["1", "true", "yes"].includes(value.toLowerCase());
  return false;
}

function isDefined<Value>(value: Value | null | undefined): value is Value {
  return value != null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
