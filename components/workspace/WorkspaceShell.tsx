"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Info } from "lucide-react";
import { StatusChip } from "@/components/ui/StatusChip";
import { Topbar } from "@/components/layout/Topbar";
import { Panel, PanelBody, PanelHeader } from "@/components/layout/Panel";
import { ChatEditor } from "./ChatEditor";
import { ExportControls } from "./ExportControls";
import { FloorPlanCanvas } from "@/components/floor-plan/FloorPlanCanvas";
import { PlanSummary } from "./PlanSummary";
import { RoomInspector } from "./RoomInspector";
import { RoomList } from "@/components/floor-plan/RoomList";
import { ValidationPanel } from "./ValidationPanel";
import { VersionHistoryPanel } from "./VersionHistoryPanel";
import {
  createEditorStateFromGeneratedProject,
  createPlaceholderEditorState
} from "@/lib/editor/state";
import type { EditorState } from "@/lib/editor/types";
import {
  generatedPlanStorageKey,
  generatedPlanStorageUpdatedEvent,
  loadGeneratedProject
} from "@/lib/projects/generated-plan-storage";

type WorkspaceShellProps = {
  projectId: string;
};

export function WorkspaceShell({ projectId }: WorkspaceShellProps) {
  const storageSnapshot = useSyncExternalStore(
    subscribeToGeneratedProjectStorage,
    getGeneratedProjectStorageSnapshot,
    getGeneratedProjectServerSnapshot
  );
  const storedProject = useMemo(
    () =>
      loadGeneratedProject(
        createSnapshotStorage(storageSnapshot),
        projectId
      ),
    [projectId, storageSnapshot]
  );
  const state = useMemo<EditorState>(() => {
    if (storedProject.ok) {
      return createEditorStateFromGeneratedProject(storedProject.project);
    }

    return {
      ...createPlaceholderEditorState(projectId),
      fallbackReason: storedProject.message,
      validationIssues: storedProject.issues
    };
  }, [projectId, storedProject]);

  const plan = state.plan;

  if (!plan) {
    return null;
  }

  const isFallback = Boolean(state.fallbackReason);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100">
      <Topbar
        actions={
          <ExportControls compact plan={plan} />
        }
        backHref="/dashboard"
        subtitle={isFallback ? "Demo fallback / local edits disabled" : "Validated local concept plan"}
        title={state.projectName ?? plan.title}
      />
      <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-950">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Conceptual draft with approximate dimensions. Not for construction, permits, structural, legal, or code-compliance use.
        </p>
      </div>
      <main className="grid flex-1 gap-3 p-3 lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <Panel className="min-h-[560px] lg:sticky lg:top-3 lg:h-[calc(100vh-104px)]">
          <PanelHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-950">AI prompt and chat</h2>
              <StatusChip tone={isFallback ? "warning" : "info"}>
                {isFallback ? "Demo fallback" : "Mock generated"}
              </StatusChip>
            </div>
          </PanelHeader>
          <PanelBody className="h-[500px] lg:h-[calc(100vh-160px)]">
            <ChatEditor
              aiSummary={state.aiSummary}
              fallbackReason={state.fallbackReason}
              key={createChatEditorKey(state)}
              project={storedProject.ok ? storedProject.project : null}
              projectPrompt={state.projectPrompt}
            />
          </PanelBody>
        </Panel>

        <div className="grid min-w-0 content-start gap-3">
          <Panel>
            <PanelBody>
              <PlanSummary plan={plan} projectName={state.projectName} />
            </PanelBody>
          </Panel>
          <FloorPlanCanvas plan={plan} selectedRoomId={state.selectedRoomId} />
          <Panel>
            <PanelBody>
              <ValidationPanel issues={state.validationIssues} warnings={state.warnings} />
            </PanelBody>
          </Panel>
        </div>

        <Panel className="min-h-[420px] lg:col-span-2 2xl:col-span-1 2xl:sticky 2xl:top-3 2xl:h-[calc(100vh-104px)] 2xl:overflow-auto">
          <PanelHeader>
            <h2 className="text-sm font-semibold text-neutral-950">Room inspector</h2>
          </PanelHeader>
          <PanelBody className="grid gap-5">
            <RoomInspector plan={plan} selectedRoomId={state.selectedRoomId} />
            <div className="grid gap-3">
              <h3 className="text-sm font-semibold text-neutral-950">Rooms</h3>
              <RoomList plan={plan} selectedRoomId={state.selectedRoomId} />
            </div>
            <VersionHistoryPanel project={storedProject.ok ? storedProject.project : null} />
            <ExportControls plan={plan} />
          </PanelBody>
        </Panel>
      </main>
    </div>
  );
}

function subscribeToGeneratedProjectStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(generatedPlanStorageUpdatedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(generatedPlanStorageUpdatedEvent, onStoreChange);
  };
}

function getGeneratedProjectStorageSnapshot() {
  return window.localStorage.getItem(generatedPlanStorageKey) ?? "";
}

function getGeneratedProjectServerSnapshot() {
  return "";
}

function createSnapshotStorage(snapshot: string) {
  return {
    getItem: (key: string) => (key === generatedPlanStorageKey ? snapshot || null : null),
    setItem: () => undefined,
    removeItem: () => undefined
  };
}

function createChatEditorKey(state: EditorState) {
  return [
    state.projectId,
    state.projectPrompt ?? "",
    state.aiSummary ?? "",
    state.fallbackReason ?? ""
  ].join("|");
}
