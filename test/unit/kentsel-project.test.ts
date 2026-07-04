import { describe, expect, it } from "vitest";
import {
  completeKentselWorkflowStep,
  createKentselProjectFromDraft,
  detectKentselFileType,
  lockKentselProjectVersion,
  markKentselOfferReady,
  normalizeKentselProject,
  updateKentselProjectNotes,
  type KentselProject
} from "@/lib/domain/kentsel-project";
import {
  kentselWorkflowSteps,
  offerPackageStepIndex,
  offerPrerequisiteStepIndex
} from "@/lib/domain/kentsel-workflow";
import { analyzeKentselProjectIntake } from "@/lib/domain/project-intake";

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

describe("kentsel project domain", () => {
  it("creates a project from the wizard draft with normalized defaults", () => {
    const intakeSummary = analyzeKentselProjectIntake(
      {
        name: "Kadıköy 4300/2",
        client: "",
        architect: "",
        district: "Kadıköy",
        neighborhood: "Feneryolu",
        ada: "4300",
        parsel: "2",
        area: "",
        zoning: "",
        ratio: "",
        units: "",
        notes: "",
        files: []
      },
      { daireKarmasiPreference: "2+1 ağırlıklı" }
    );
    const project = createKentselProjectFromDraft(
      {
        name: "  Kadıköy 4300/2  ",
        client: "",
        architect: "",
        district: "Kadıköy",
        neighborhood: "Feneryolu",
        ada: "4300",
        parsel: "2",
        area: "",
        zoning: "",
        ratio: "",
        units: "",
        notes: "",
        files: []
      },
      { activityId: "act-create", fallbackArchitect: "Ayşe Mimar", intakeSummary }
    );

    expect(project.id).toBe("PRJ-4300-2");
    expect(project.name).toBe("Kadıköy 4300/2");
    expect(project.client).toBe("Müşteri eklenmedi");
    expect(project.architect).toBe("Ayşe Mimar");
    expect(project.source).toBe("Taslak");
    expect(project.intakeSummary?.daireKarmasiPreference).toBe("2+1 ağırlıklı");
    expect(project.activity[0]).toMatchObject({ id: "act-create", tone: "success" });
  });

  it("detects uploaded file types from Turkish project file names", () => {
    expect(detectKentselFileType("imar-durumu.PDF")).toBe("İmar");
    expect(detectKentselFileType("mevcut-plan.dwg")).toBe("CAD");
    expect(detectKentselFileType("metraj.xlsx")).toBe("Metraj");
    expect(detectKentselFileType("cephe.jpeg")).toBe("Görsel");
    expect(detectKentselFileType("notlar.txt")).toBe("Kaynak");
  });

  it("advances the workflow one step and records activity", () => {
    const updated = completeKentselWorkflowStep(baseProject, "act-1");

    expect(updated.stepIndex).toBe(2);
    expect(updated.progress).toBe(Math.round((2 / kentselWorkflowSteps.length) * 100));
    expect(updated.status).toBe("İnceleme");
    expect(updated.activity[0]).toMatchObject({
      id: "act-1",
      tone: "success"
    });
  });

  it("does not mark an offer ready before required workflow evidence exists", () => {
    const updated = markKentselOfferReady(baseProject, "act-offer");

    expect(updated).toBe(baseProject);
  });

  it("moves a ready project into offer package state", () => {
    const updated = markKentselOfferReady(
      { ...baseProject, stepIndex: offerPrerequisiteStepIndex, progress: 88, status: "Teklif" },
      "act-offer"
    );

    expect(updated.offerReady).toBe(true);
    expect(updated.stepIndex).toBe(offerPackageStepIndex);
    expect(updated.progress).toBe(94);
    expect(updated.activity[0]?.title).toBe("Teklif PDF paketi üretildi");
  });

  it("does not move an already later workflow backwards when marking the offer ready", () => {
    const updated = markKentselOfferReady(
      { ...baseProject, stepIndex: kentselWorkflowSteps.length, progress: 100 },
      "act-offer"
    );

    expect(updated.stepIndex).toBe(kentselWorkflowSteps.length);
    expect(updated.progress).toBe(100);
  });

  it("does not lock a project before the final offer package is ready", () => {
    const updated = lockKentselProjectVersion(
      { ...baseProject, offerReady: true, stepIndex: offerPrerequisiteStepIndex - 1 },
      "act-lock"
    );

    expect(updated.locked).toBe(false);
    expect(updated.status).toBe("Hazırlık");
  });

  it("does not lock at the prerequisite step before the package step exists", () => {
    const updated = lockKentselProjectVersion(
      { ...baseProject, offerReady: true, stepIndex: offerPrerequisiteStepIndex, status: "Teklif" },
      "act-lock"
    );

    expect(updated.locked).toBe(false);
    expect(updated.stepIndex).toBe(offerPrerequisiteStepIndex);
  });

  it("locks the version with final progress and approval activity", () => {
    const updated = lockKentselProjectVersion(
      { ...baseProject, offerReady: true, stepIndex: offerPackageStepIndex, status: "Teklif" },
      "act-lock"
    );

    expect(updated.locked).toBe(true);
    expect(updated.status).toBe("Kilitli");
    expect(updated.source).toBe("Arşiv");
    expect(updated.progress).toBe(100);
    expect(updated.stepIndex).toBe(kentselWorkflowSteps.length);
    expect(updated.activity[0]?.title).toContain("insan onayı");
  });

  it("normalizes stale persisted project state before it reaches the UI", () => {
    const normalized = normalizeKentselProject({
      ...baseProject,
      progress: 999,
      stepIndex: 1,
      offerReady: true,
      locked: true,
      status: "Kilitli",
      source: undefined,
      files: [
        { id: "file-1", name: "imar.pdf", type: "", status: "Yanlış" },
        { id: "", name: "bozuk.pdf", type: "PDF", status: "Yüklendi" }
      ],
      activity: [
        { id: "act-1", title: "Okundu", time: "", tone: "unknown" },
        { id: "", title: "Bozuk", time: "Bugün", tone: "success" }
      ]
    });

    expect(normalized).toMatchObject({
      progress: 100,
      stepIndex: 1,
      offerReady: false,
      locked: false,
      status: "Hazırlık",
      source: "Gerçek"
    });
    expect(normalized?.files).toEqual([{ id: "file-1", name: "imar.pdf", type: "İmar", status: "Yüklendi" }]);
    expect(normalized?.activity).toEqual([{ id: "act-1", title: "Okundu", time: "Az önce", tone: "info" }]);
  });

  it("normalizes explicit demo and backend project sources", () => {
    expect(normalizeKentselProject({ ...baseProject, source: "Demo" })?.source).toBe("Demo");
    expect(normalizeKentselProject({ ...baseProject, source: "Backend" })?.source).toBe("Backend");
  });

  it("normalizes persisted intake summary snapshots", () => {
    const intakeSummary = analyzeKentselProjectIntake(
      {
        name: baseProject.name,
        client: baseProject.client,
        architect: baseProject.architect,
        district: baseProject.district,
        neighborhood: baseProject.neighborhood,
        ada: baseProject.ada,
        parsel: baseProject.parsel,
        area: baseProject.area,
        zoning: baseProject.zoning,
        ratio: baseProject.ratio,
        units: baseProject.units,
        notes: baseProject.notes,
        files: baseProject.files
      },
      { daireKarmasiPreference: "3+1 cephe koruma" }
    );

    const normalized = normalizeKentselProject({
      ...baseProject,
      intakeSummary: { ...intakeSummary, readinessScore: 999 }
    });

    expect(normalized?.intakeSummary?.readinessScore).toBe(100);
    expect(normalized?.intakeSummary?.daireKarmasiPreference).toBe("3+1 cephe koruma");
  });

  it("updates architect notes as durable project state", () => {
    const updated = updateKentselProjectNotes(baseProject, "  Yeni malik notu  ");

    expect(updated.notes).toBe("  Yeni malik notu  ");
    expect(updated.updatedAt).toBe("Az önce");
  });
});
