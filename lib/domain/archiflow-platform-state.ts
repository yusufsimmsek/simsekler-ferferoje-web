import {
  normalizeKentselProject,
  type KentselProject
} from "@/lib/domain/kentsel-project";

export const ARCHIFLOW_PLATFORM_STORAGE_KEY = "archiflow-snow-platform-v1";
export const ARCHIFLOW_PLATFORM_STATE_VERSION = 1 as const;

export type ArchiflowSession = {
  name: string;
  firm: string;
  email: string;
};

export type ArchiflowPlatformState = {
  schemaVersion: typeof ARCHIFLOW_PLATFORM_STATE_VERSION;
  session: ArchiflowSession | null;
  projects: KentselProject[];
  activeProjectId: string | null;
};

export const emptyArchiflowPlatformState: ArchiflowPlatformState = {
  schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
  session: null,
  projects: [],
  activeProjectId: null
};

export function restoreArchiflowPlatformState(
  savedState: string | null,
  requestedProjectId?: string | null
): ArchiflowPlatformState | null {
  if (!savedState) return null;

  try {
    return normalizeArchiflowPlatformState(JSON.parse(savedState), requestedProjectId);
  } catch {
    return null;
  }
}

export function normalizeArchiflowPlatformState(
  value: unknown,
  requestedProjectId?: string | null
): ArchiflowPlatformState {
  if (!isRecord(value)) {
    return withRequestedProject(emptyArchiflowPlatformState, requestedProjectId);
  }

  const projects = Array.isArray(value.projects)
    ? value.projects.map(normalizeKentselProject).filter(isDefined)
    : [];
  const requestedActiveProjectId = normalizeOptionalString(requestedProjectId);
  const savedActiveProjectId = normalizeOptionalString(value.activeProjectId);
  const activeProjectId =
    requestedActiveProjectId ??
    (savedActiveProjectId && projects.some((project) => project.id === savedActiveProjectId)
      ? savedActiveProjectId
      : null);

  return {
    schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
    session: normalizeSession(value.session),
    projects,
    activeProjectId
  };
}

export function serializeArchiflowPlatformState(state: ArchiflowPlatformState) {
  return JSON.stringify(normalizeArchiflowPlatformState(state));
}

function normalizeSession(value: unknown): ArchiflowSession | null {
  if (!isRecord(value)) return null;

  return {
    email: normalizeOptionalString(value.email) ?? "",
    firm: normalizeOptionalString(value.firm) ?? "",
    name: normalizeOptionalString(value.name) ?? ""
  };
}

function withRequestedProject(
  state: ArchiflowPlatformState,
  requestedProjectId?: string | null
): ArchiflowPlatformState {
  return {
    ...state,
    activeProjectId: requestedProjectId ?? state.activeProjectId
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDefined<Value>(value: Value | null | undefined): value is Value {
  return value != null;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
