import { describe, expect, it } from "vitest";
import {
  ARCHIFLOW_PLATFORM_STATE_VERSION,
  ARCHIFLOW_PLATFORM_STORAGE_KEY,
  type ArchiflowPlatformState
} from "@/lib/domain/archiflow-platform-state";
import {
  clearArchiflowPlatformState,
  createArchiflowPlatformRepository,
  loadArchiflowPlatformState,
  saveArchiflowPlatformState,
  type ArchiflowPlatformStorage
} from "@/lib/platform/archiflow-local-storage-repository";

const state: ArchiflowPlatformState = {
  schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
  session: { name: "Mimar", firm: "Ofis", email: "mimar@example.com" },
  projects: [
    {
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
      progress: 6,
      stepIndex: 1,
      offerReady: false,
      locked: false,
      files: [],
      notes: "Not",
      activity: []
    }
  ],
  activeProjectId: "PRJ-1"
};

describe("archiflow local storage repository", () => {
  it("loads and normalizes platform state from storage", () => {
    const storage = createMemoryStorage();
    storage.setItem(ARCHIFLOW_PLATFORM_STORAGE_KEY, JSON.stringify(state));

    const result = loadArchiflowPlatformState(storage, "PRJ-route");

    expect(result.corrupted).toBe(false);
    expect(result.state).toMatchObject({
      schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
      activeProjectId: "PRJ-route"
    });
    expect(result.state?.projects[0]?.name).toBe("Kadıköy 4300/2");
  });

  it("removes corrupted stored state during load", () => {
    const storage = createMemoryStorage();
    storage.setItem(ARCHIFLOW_PLATFORM_STORAGE_KEY, "{bad-json");

    const result = loadArchiflowPlatformState(storage);

    expect(result).toEqual({ state: null, corrupted: true });
    expect(storage.getItem(ARCHIFLOW_PLATFORM_STORAGE_KEY)).toBeNull();
  });

  it("saves normalized platform state", () => {
    const storage = createMemoryStorage();

    saveArchiflowPlatformState(storage, state);

    expect(JSON.parse(storage.getItem(ARCHIFLOW_PLATFORM_STORAGE_KEY) ?? "{}")).toMatchObject({
      schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
      activeProjectId: "PRJ-1"
    });
  });

  it("clears platform state from storage", () => {
    const storage = createMemoryStorage();
    storage.setItem(ARCHIFLOW_PLATFORM_STORAGE_KEY, JSON.stringify(state));

    clearArchiflowPlatformState(storage);

    expect(storage.getItem(ARCHIFLOW_PLATFORM_STORAGE_KEY)).toBeNull();
  });

  it("exposes a reusable repository facade", () => {
    const storage = createMemoryStorage();
    const repository = createArchiflowPlatformRepository(storage);

    repository.save(state);

    expect(repository.load().state?.activeProjectId).toBe("PRJ-1");
    repository.clear();
    expect(repository.load().state).toBeNull();
  });
});

function createMemoryStorage(): ArchiflowPlatformStorage {
  const data = new Map<string, string>();

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    }
  };
}
