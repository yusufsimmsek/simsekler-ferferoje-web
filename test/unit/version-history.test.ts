import { describe, expect, it } from "vitest";
import { runEditPlanWorkflow } from "@/lib/ai-planner/edit-plan-workflow";
import { mockFloorPlan } from "@/lib/floor-plan/mock-plan";
import { editGeneratedProjectWithMessage } from "@/lib/projects/edit-project-client";
import {
  addStoredPlanVersion,
  createStoredPlanVersion,
  generatedPlanStorageKey,
  loadGeneratedProject,
  saveGeneratedProject,
  type StorageLike,
  type StoredGeneratedProject
} from "@/lib/projects/generated-plan-storage";
import { restoreGeneratedProjectVersion } from "@/lib/projects/restore-project-version-client";

describe("local plan version history", () => {
  it("creates a normalized version snapshot", () => {
    const project = createStoredProject();
    const version = createStoredPlanVersion({
      project,
      sourceType: "initial-generation",
      label: "Initial generation",
      message: project.prompt,
      createdAt: "2026-06-20T10:00:00.000Z"
    });

    expect(version.schemaVersion).toBe("project-plan-version-v1");
    expect(version.sourceType).toBe("initial-generation");
    expect(version.plan.id).toBe(project.plan.id);
    expect(version.warnings).toEqual(project.warnings);
  });

  it("keeps only the latest 10 versions per project", () => {
    let project = createStoredProject();

    for (let index = 0; index < 12; index += 1) {
      project = addStoredPlanVersion(
        project,
        createStoredPlanVersion({
          project,
          sourceType: "chat-edit",
          label: `Version ${index}`,
          versionId: `version_${index}`,
          createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`
        })
      );
    }

    expect(project.versions).toHaveLength(10);
    expect(project.versions?.[0]?.label).toBe("Version 11");
    expect(project.versions?.some((version) => version.label === "Version 0")).toBe(false);
  });

  it("recovers from corrupted and schema-mismatched history entries", () => {
    const storage = createMemoryStorage();
    const project = createStoredProject();
    const validVersion = createStoredPlanVersion({
      project,
      sourceType: "initial-generation",
      label: "Initial generation",
      createdAt: "2026-06-20T10:00:00.000Z"
    });

    storage.setItem(
      generatedPlanStorageKey,
      JSON.stringify({
        version: 1,
        projects: {
          [project.projectId]: {
            ...project,
            versions: [
              validVersion,
              {
                ...validVersion,
                versionId: "version_corrupted",
                plan: {
                  ...mockFloorPlan,
                  schemaVersion: "unsupported"
                }
              },
              {
                ...validVersion,
                versionId: "version_old_schema",
                schemaVersion: "project-plan-version-v0"
              }
            ]
          }
        },
        lastProjectId: project.projectId
      })
    );

    const loaded = loadGeneratedProject(storage, project.projectId);

    expect(loaded.ok).toBe(true);

    if (loaded.ok) {
      expect(loaded.project.versions).toHaveLength(1);
      expect(loaded.project.versions?.[0]?.versionId).toBe(validVersion.versionId);
    }
  });

  it("restores a selected valid version and snapshots the pre-restore current plan", () => {
    const storage = createMemoryStorage();
    const project = createStoredProject({
      plan: {
        ...mockFloorPlan,
        title: "Current concept"
      }
    });
    const earlierVersion = createStoredPlanVersion({
      project,
      sourceType: "chat-edit",
      label: "Earlier concept",
      versionId: "version_earlier",
      createdAt: "2026-06-20T09:00:00.000Z",
      plan: {
        ...mockFloorPlan,
        title: "Earlier concept"
      }
    });
    const projectWithHistory = addStoredPlanVersion(project, earlierVersion);

    saveGeneratedProject(storage, projectWithHistory);

    const result = restoreGeneratedProjectVersion({
      project: projectWithHistory,
      versionId: earlierVersion.versionId,
      storage,
      now: () => "2026-06-20T11:00:00.000Z"
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.project.plan.title).toBe("Earlier concept");
      expect(result.project.versions?.[0]?.sourceType).toBe("restore");
    }

    const loaded = loadGeneratedProject(storage, project.projectId);

    expect(loaded.ok).toBe(true);

    if (loaded.ok) {
      expect(loaded.project.plan.title).toBe("Earlier concept");
      expect(loaded.project.versions?.[0]?.label).toContain("Before restore");
    }
  });

  it("rejects invalid restore requests without overwriting the current plan", () => {
    const storage = createMemoryStorage();
    const project = createStoredProject();

    saveGeneratedProject(storage, project);

    const result = restoreGeneratedProjectVersion({
      project,
      versionId: "missing_version",
      storage,
      now: () => "2026-06-20T11:00:00.000Z"
    });

    expect(result.ok).toBe(false);

    const loaded = loadGeneratedProject(storage, project.projectId);

    expect(loaded.ok).toBe(true);

    if (loaded.ok) {
      expect(loaded.project.plan.title).toBe(project.plan.title);
      expect(loaded.project.versions).toEqual([]);
    }
  });

  it("creates a history entry when chat edit succeeds", async () => {
    const storage = createMemoryStorage();
    const project = createStoredProject();
    const editResult = await runEditPlanWorkflow({
      schemaVersion: "plan-edit-request-v1",
      message: "Make the living room larger.",
      currentPlan: mockFloorPlan
    });

    expect(editResult.body.ok).toBe(true);

    if (!editResult.body.ok) {
      throw new Error(editResult.body.developerMessage);
    }

    const result = await editGeneratedProjectWithMessage({
      request: {
        message: "Make the living room larger.",
        project
      },
      storage,
      fetcher: async () => ({
        ok: true,
        status: 200,
        json: async () => editResult.body
      })
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.project.versions).toHaveLength(1);
      expect(result.project.versions?.[0]?.sourceType).toBe("chat-edit");
      expect(result.project.versions?.[0]?.editQualityDelta?.schemaVersion).toBe(
        "edit-quality-delta-v1"
      );
    }
  });

  it("keeps old stored projects compatible when version history is missing", () => {
    const storage = createMemoryStorage();
    const legacyProject = createStoredProject();

    storage.setItem(
      generatedPlanStorageKey,
      JSON.stringify({
        version: 1,
        projects: {
          [legacyProject.projectId]: legacyProject
        },
        lastProjectId: legacyProject.projectId
      })
    );

    const loaded = loadGeneratedProject(storage, legacyProject.projectId);

    expect(loaded.ok).toBe(true);

    if (loaded.ok) {
      expect(loaded.project.versions).toEqual([]);
      expect(loaded.project.plan.id).toBe(mockFloorPlan.id);
    }
  });
});

function createStoredProject(
  overrides: Partial<StoredGeneratedProject> = {}
): StoredGeneratedProject {
  return {
    projectId: mockFloorPlan.projectId,
    projectName: "Demo concept",
    plan: mockFloorPlan,
    prompt: "Create a 3+1 apartment with balcony.",
    aiSummary: "Prompt matched 3+1 apartment language.",
    warnings: [],
    createdAt: "2026-06-20T08:00:00.000Z",
    ...overrides
  };
}

function createMemoryStorage(): StorageLike {
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
