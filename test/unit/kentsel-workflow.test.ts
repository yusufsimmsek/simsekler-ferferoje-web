import { describe, expect, it } from "vitest";
import {
  getKentselOfferReadiness,
  kentselWorkflowSteps,
  offerPackageStepIndex,
  offerPrerequisiteStepIndex
} from "@/lib/domain/kentsel-workflow";

describe("kentsel workflow domain", () => {
  it("keeps the canonical 8.3 workflow as a 17-step sequence", () => {
    expect(kentselWorkflowSteps).toHaveLength(17);
    expect(kentselWorkflowSteps[0]?.title).toBe("Yeni proje açılır");
    expect(kentselWorkflowSteps[15]?.title).toBe("Teklif PDF/PNG paketi oluşur");
    expect(kentselWorkflowSteps[16]?.title).toBe("İnsan onayı ile versiyon kilitlenir");
  });

  it("blocks final offer generation before quality control is complete", () => {
    const readiness = getKentselOfferReadiness({
      stepIndex: 11,
      offerReady: false
    });

    expect(readiness.canGenerateFinalOffer).toBe(false);
    expect(readiness.finalOfferReady).toBe(false);
    expect(readiness.missingSteps.map((step) => step.title)).toContain(
      "Alanlar hesaplanır"
    );
    expect(readiness.missingSteps.map((step) => step.title)).toContain(
      "Mevzuat ve kalite kontrol raporu üretilir"
    );
  });

  it("allows package generation only after the prerequisite stage", () => {
    const readiness = getKentselOfferReadiness({
      stepIndex: offerPrerequisiteStepIndex,
      offerReady: false
    });

    expect(readiness.canGenerateFinalOffer).toBe(true);
    expect(readiness.finalOfferReady).toBe(false);
    expect(readiness.missingSteps).toEqual([]);
  });

  it("treats final readiness as both package flag and completed prerequisite", () => {
    expect(
      getKentselOfferReadiness({
        stepIndex: offerPrerequisiteStepIndex - 1,
        offerReady: true
      }).finalOfferReady
    ).toBe(false);

    expect(
      getKentselOfferReadiness({
        stepIndex: offerPrerequisiteStepIndex,
        offerReady: true
      }).finalOfferReady
    ).toBe(false);

    expect(
      getKentselOfferReadiness({
        stepIndex: offerPackageStepIndex,
        offerReady: true
      }).finalOfferReady
    ).toBe(true);
  });
});
