import { describe, expect, it } from "vitest";
import {
  analyzeKentselProjectIntake,
  normalizeKentselProjectIntakeSummary
} from "@/lib/domain/project-intake";
import type { KentselProjectDraft } from "@/lib/domain/kentsel-project";

const baseDraft: KentselProjectDraft = {
  ada: "4300",
  architect: "Mimar",
  area: "684 m²",
  client: "İlkbahar İnşaat",
  district: "Kadıköy",
  files: [],
  name: "Kadıköy 4300/2 Dönüşüm",
  neighborhood: "Feneryolu",
  notes: "",
  parsel: "2",
  ratio: "%50",
  units: "18",
  zoning: "Ayrık nizam / 5 kat"
};

describe("project intake domain", () => {
  it("creates a brief from architect-entered project facts", () => {
    const summary = analyzeKentselProjectIntake(baseDraft, {
      daireKarmasiPreference: "2+1 ağırlıklı"
    });

    expect(summary.brief[0]).toContain("Kadıköy 4300/2 Dönüşüm");
    expect(summary.brief[0]).toContain("Ada 4300 Parsel 2");
    expect(summary.brief[2]).toContain("2+1 ağırlıklı");
  });

  it("marks required parcel identity gaps as missing and keeps human approval required", () => {
    const summary = analyzeKentselProjectIntake({
      ...baseDraft,
      ada: "",
      district: "",
      name: "",
      parsel: ""
    });

    expect(summary.missingDataChecklist.filter((item) => item.severity === "required" && item.status === "missing")).toHaveLength(3);
    expect(summary.humanApproval.required).toBe(true);
    expect(summary.humanApproval.reason).toContain("Zorunlu");
    expect(summary.nextModule).toMatchObject({ label: "Parsel Analizi", route: "site-analysis" });
  });

  it("uses source files and daire preference to recommend the workflow module", () => {
    const summary = analyzeKentselProjectIntake(
      {
        ...baseDraft,
        files: [{ id: "file-1", name: "e-imar.pdf", status: "Yüklendi", type: "İmar" }],
        notes: "Daire karması tercihi: 3+1 cephe koruma"
      }
    );

    expect(summary.daireKarmasiPreference).toBe("3+1 cephe koruma");
    expect(summary.nextModule).toMatchObject({ label: "Çalışma Alanı", route: "project" });
    expect(summary.provenance).toContainEqual(
      expect.objectContaining({
        label: "Kaynak dosya",
        source: "Dosya adı ve tipi",
        status: "captured",
        value: "1 kaynak (İmar)"
      })
    );
  });

  it("recommends the correct next module for each missing intake stage", () => {
    expect(analyzeKentselProjectIntake({ ...baseDraft, zoning: "" }).nextModule.route).toBe("zoning-rules");
    expect(analyzeKentselProjectIntake({ ...baseDraft, area: "" }).nextModule.route).toBe("zoning-rules");
    expect(analyzeKentselProjectIntake({ ...baseDraft, files: [] }, { daireKarmasiPreference: "2+1 ağırlıklı" }).nextModule.route).toBe("files");
    expect(
      analyzeKentselProjectIntake({
        ...baseDraft,
        files: [{ id: "file-1", name: "metraj.xlsx", status: "Yüklendi", type: "Metraj" }]
      }).nextModule.route
    ).toBe("apartment-mix");
  });

  it("normalizes a persisted intake snapshot safely", () => {
    const summary = analyzeKentselProjectIntake(baseDraft, {
      daireKarmasiPreference: "2+1 ağırlıklı"
    });
    const normalized = normalizeKentselProjectIntakeSummary({
      ...summary,
      readinessScore: 999,
      humanApproval: { required: false, reason: "Kontrol" }
    });

    expect(normalized?.readinessScore).toBe(100);
    expect(normalized?.humanApproval.required).toBe(true);
    expect(normalized?.nextModule.label).toBe(summary.nextModule.label);
  });

  it("recommends evidence and mix steps without pretending AI has designed the project", () => {
    const summary = analyzeKentselProjectIntake({ ...baseDraft, files: [], notes: "" });

    expect(summary.suggestedNextSteps.join(" ")).toContain("kaynak kasasına bağlayın");
    expect(summary.suggestedNextSteps.join(" ")).toContain("Daire karması tercihini seçerek");
    expect(summary.suggestedNextSteps.join(" ")).not.toContain("tasarladı");
  });
});
