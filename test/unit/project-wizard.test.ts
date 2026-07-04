import { describe, expect, it } from "vitest";
import {
  validateProjectWizardBeforeCreate,
  validateProjectWizardNavigation,
  validateProjectWizardStep
} from "@/lib/domain/project-wizard";

const validDraft = {
  ada: "4300",
  district: "Kadıköy",
  name: "Kadıköy 4300/2 Dönüşüm",
  neighborhood: "Feneryolu",
  parsel: "2"
};

describe("project wizard domain", () => {
  it("requires a project name before leaving the identity step", () => {
    expect(validateProjectWizardStep({ ...validDraft, name: "" }, 0)).toBe("Proje adı zorunlu.");
  });

  it("requires district, neighborhood, ada and parsel before downstream steps", () => {
    expect(validateProjectWizardStep({ ...validDraft, district: "" }, 1)).toBe(
      "İlçe ve mahalle bilgisi zorunlu."
    );
    expect(validateProjectWizardStep({ ...validDraft, ada: "" }, 1)).toBe(
      "Ada ve parsel bilgisi zorunlu."
    );
  });

  it("blocks jumping ahead when earlier required data is missing", () => {
    expect(validateProjectWizardNavigation({ ...validDraft, name: "" }, 3)).toEqual({
      message: "Proje adı zorunlu.",
      stepIndex: 0
    });
  });

  it("blocks final creation until all required project keys exist", () => {
    expect(validateProjectWizardBeforeCreate({ ...validDraft, parsel: "" })).toEqual({
      message: "Ada ve parsel bilgisi zorunlu.",
      stepIndex: 1
    });
    expect(validateProjectWizardBeforeCreate(validDraft)).toBeNull();
  });
});
