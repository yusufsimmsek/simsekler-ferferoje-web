export type ProjectWizardDraft = {
  ada: string;
  district: string;
  name: string;
  neighborhood: string;
  parsel: string;
};

export type ProjectWizardValidation = {
  message: string;
  stepIndex: number;
};

const requiredStepIndexes = [0, 1];

export function validateProjectWizardStep(
  draft: ProjectWizardDraft,
  stepIndex: number
): string | null {
  if (stepIndex === 0 && !draft.name.trim()) {
    return "Proje adı zorunlu.";
  }

  if (stepIndex === 1) {
    if (!draft.district.trim() || !draft.neighborhood.trim()) {
      return "İlçe ve mahalle bilgisi zorunlu.";
    }

    if (!draft.ada.trim() || !draft.parsel.trim()) {
      return "Ada ve parsel bilgisi zorunlu.";
    }
  }

  return null;
}

export function validateProjectWizardNavigation(
  draft: ProjectWizardDraft,
  targetStepIndex: number
): ProjectWizardValidation | null {
  for (const stepIndex of requiredStepIndexes) {
    if (stepIndex >= targetStepIndex) break;

    const message = validateProjectWizardStep(draft, stepIndex);
    if (message) {
      return { message, stepIndex };
    }
  }

  return null;
}

export function validateProjectWizardBeforeCreate(
  draft: ProjectWizardDraft
): ProjectWizardValidation | null {
  for (const stepIndex of requiredStepIndexes) {
    const message = validateProjectWizardStep(draft, stepIndex);
    if (message) {
      return { message, stepIndex };
    }
  }

  return null;
}
