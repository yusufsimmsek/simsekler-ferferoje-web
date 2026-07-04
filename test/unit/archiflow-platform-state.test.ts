import { describe, expect, it } from "vitest";
import {
  ARCHIFLOW_PLATFORM_STATE_VERSION,
  emptyArchiflowPlatformState,
  normalizeArchiflowPlatformState,
  restoreArchiflowPlatformState,
  serializeArchiflowPlatformState,
  type ArchiflowPlatformState
} from "@/lib/domain/archiflow-platform-state";
import type { KentselProject } from "@/lib/domain/kentsel-project";

const baseProject: KentselProject = {
  id: "PRJ-1",
  name: "Kadıköy 4300/2",
  client: "İlkbahar İnşaat",
  architect: "Mimar",
  district: "Kadıköy",
  neighborhood: "Feneryolu",
  ada: "4300",
  parsel: "2",
  area: "684 m²",
  zoning: "Ayrık nizam",
  ratio: "%50",
  units: "18",
  createdAt: "Bugün",
  updatedAt: "Bugün",
  status: "Hazırlık",
  source: "Taslak",
  progress: 6,
  stepIndex: 1,
  offerReady: false,
  locked: false,
  files: [],
  notes: "Not",
  activity: []
};

describe("archiflow platform state domain", () => {
  it("restores null when saved state is missing or corrupted", () => {
    expect(restoreArchiflowPlatformState(null)).toBeNull();
    expect(restoreArchiflowPlatformState("{bad json")).toBeNull();
  });

  it("normalizes saved session, projects and active project id", () => {
    const state = normalizeArchiflowPlatformState({
      session: { name: "Mimar", firm: "Ofis", email: "mimar@example.com" },
      projects: [baseProject],
      activeProjectId: "PRJ-1"
    });

    expect(state.schemaVersion).toBe(ARCHIFLOW_PLATFORM_STATE_VERSION);
    expect(state.session).toEqual({ name: "Mimar", firm: "Ofis", email: "mimar@example.com" });
    expect(state.projects).toEqual([baseProject]);
    expect(state.activeProjectId).toBe("PRJ-1");
  });

  it("lets route project id override saved active project id", () => {
    const state = normalizeArchiflowPlatformState(
      {
        session: null,
        projects: [baseProject],
        activeProjectId: "PRJ-1"
      },
      "PRJ-2"
    );

    expect(state.activeProjectId).toBe("PRJ-2");
  });

  it("filters invalid projects and clears stale saved active project id", () => {
    const state = normalizeArchiflowPlatformState({
      session: null,
      projects: [baseProject, { id: "PRJ-broken" }],
      activeProjectId: "PRJ-broken"
    });

    expect(state.projects).toEqual([baseProject]);
    expect(state.activeProjectId).toBeNull();
  });

  it("normalizes stale offer state in restored projects", () => {
    const state = normalizeArchiflowPlatformState({
      session: null,
      projects: [{ ...baseProject, offerReady: true, locked: true, status: "Kilitli", stepIndex: 1 }],
      activeProjectId: "PRJ-1"
    });

    expect(state.projects[0]).toMatchObject({
      offerReady: false,
      locked: false,
      status: "Hazırlık",
      stepIndex: 1
    });
  });

  it("serializes the current platform state", () => {
    const serialized = serializeArchiflowPlatformState(emptyArchiflowPlatformState);

    expect(JSON.parse(serialized) as ArchiflowPlatformState).toEqual({
      schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
      session: null,
      projects: [],
      activeProjectId: null
    });
  });
});
