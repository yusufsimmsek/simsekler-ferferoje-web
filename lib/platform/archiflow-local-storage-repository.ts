import {
  ARCHIFLOW_PLATFORM_STORAGE_KEY,
  restoreArchiflowPlatformState,
  serializeArchiflowPlatformState,
  type ArchiflowPlatformState
} from "@/lib/domain/archiflow-platform-state";

export type ArchiflowPlatformStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type ArchiflowPlatformLoadResult = {
  state: ArchiflowPlatformState | null;
  corrupted: boolean;
};

export type ArchiflowPlatformRepository = {
  load: (requestedProjectId?: string | null) => ArchiflowPlatformLoadResult;
  save: (state: ArchiflowPlatformState) => void;
  clear: () => void;
};

export function createArchiflowPlatformRepository(
  storage: ArchiflowPlatformStorage
): ArchiflowPlatformRepository {
  return {
    load: (requestedProjectId) => loadArchiflowPlatformState(storage, requestedProjectId),
    save: (state) => saveArchiflowPlatformState(storage, state),
    clear: () => clearArchiflowPlatformState(storage)
  };
}

export function loadArchiflowPlatformState(
  storage: ArchiflowPlatformStorage,
  requestedProjectId?: string | null
): ArchiflowPlatformLoadResult {
  const savedState = storage.getItem(ARCHIFLOW_PLATFORM_STORAGE_KEY);
  const state = restoreArchiflowPlatformState(savedState, requestedProjectId);

  if (savedState && !state) {
    storage.removeItem(ARCHIFLOW_PLATFORM_STORAGE_KEY);
    return { state: null, corrupted: true };
  }

  return { state, corrupted: false };
}

export function saveArchiflowPlatformState(
  storage: ArchiflowPlatformStorage,
  state: ArchiflowPlatformState
) {
  storage.setItem(ARCHIFLOW_PLATFORM_STORAGE_KEY, serializeArchiflowPlatformState(state));
}

export function clearArchiflowPlatformState(storage: ArchiflowPlatformStorage) {
  storage.removeItem(ARCHIFLOW_PLATFORM_STORAGE_KEY);
}
