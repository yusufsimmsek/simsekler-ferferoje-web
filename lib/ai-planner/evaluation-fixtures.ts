import type {
  EditPlanErrorCode,
  EditPlanSuccessBody
} from "./edit-plan-workflow";
import type {
  GeneratePlanErrorCode,
  GeneratePlanSuccessBody
} from "./generate-plan-workflow";

export type PromptEvaluationFixture = {
  id: string;
  title: string;
  prompt: string;
  expected: {
    ok: boolean;
    code: GeneratePlanSuccessBody["code"] | GeneratePlanErrorCode;
    promptClassification?: string;
    planId?: string;
  };
};

export type ChatEditEvaluationFixture = {
  id: string;
  title: string;
  basePlan: "two_plus_one" | "three_plus_one";
  message: string;
  expected: {
    ok: boolean;
    code: EditPlanSuccessBody["code"] | EditPlanErrorCode;
    actionType?: EditPlanSuccessBody["actions"][number]["type"];
  };
};

export type PlanningEvaluationFixture = {
  id: string;
  title: string;
  prompt: string;
  expected: {
    outcome: "ready" | "clarification" | "unsupported";
    buildingType?: string;
    bedrooms?: number;
    openKitchen?: boolean;
    office?: boolean;
    daylightPriority?: "low" | "medium" | "high";
    accessibilityNeed?: string;
    pets?: string;
  };
};

export const planningEvaluationFixtures: PlanningEvaluationFixture[] = [
  {
    id: "planning_modern_family_apartment",
    title: "Modern family apartment",
    prompt: "145 sqm modern apartment for a family of four with bright rooms.",
    expected: {
      outcome: "ready",
      buildingType: "apartment",
      bedrooms: 3,
      daylightPriority: "high"
    }
  },
  {
    id: "planning_open_kitchen",
    title: "Open kitchen preference",
    prompt: "Create a 3+1 apartment with an open kitchen and two balconies.",
    expected: {
      outcome: "ready",
      bedrooms: 3,
      openKitchen: true
    }
  },
  {
    id: "planning_daylight_priority",
    title: "Daylight priority",
    prompt: "Create a bright 2 bedroom apartment with strong daylight priority.",
    expected: {
      outcome: "ready",
      bedrooms: 2,
      daylightPriority: "high"
    }
  },
  {
    id: "planning_office_request",
    title: "Residential office request",
    prompt: "Create a 2+1 apartment with a dedicated home office.",
    expected: {
      outcome: "ready",
      bedrooms: 2,
      office: true
    }
  },
  {
    id: "planning_accessibility",
    title: "Accessibility needs",
    prompt: "Create a wheelchair accessible 2 bedroom apartment.",
    expected: {
      outcome: "ready",
      accessibilityNeed: "wheelchair accessible circulation"
    }
  },
  {
    id: "planning_pet_friendly",
    title: "Pet friendly request",
    prompt: "Create a pet friendly 2 bedroom apartment with a balcony.",
    expected: {
      outcome: "ready",
      pets: "other"
    }
  },
  {
    id: "planning_ambiguous",
    title: "Ambiguous prompt",
    prompt: "Make me a plan.",
    expected: {
      outcome: "clarification"
    }
  },
  {
    id: "planning_unsupported",
    title: "Unsupported BIM/CAD/legal request",
    prompt: "Create a permit-ready BIM and CAD construction drawing.",
    expected: {
      outcome: "unsupported"
    }
  }
];

export const promptToPlanEvaluationFixtures: PromptEvaluationFixture[] = [
  {
    id: "prompt_1plus1_apartment",
    title: "1+1 apartment",
    prompt: "Create a compact 1+1 apartment with an open living room and kitchen.",
    expected: {
      ok: true,
      code: "PLAN_GENERATED",
      promptClassification: "1plus1",
      planId: "plan_simple_1plus1"
    }
  },
  {
    id: "prompt_2plus1_apartment",
    title: "2+1 apartment",
    prompt: "Generate a 2+1 apartment with two bedrooms, one bathroom, and a WC.",
    expected: {
      ok: true,
      code: "PLAN_GENERATED",
      promptClassification: "2plus1",
      planId: "plan_2plus1"
    }
  },
  {
    id: "prompt_3plus1_apartment",
    title: "3+1 apartment",
    prompt: "Design a 3+1 apartment with balcony, open kitchen, bathroom, and WC.",
    expected: {
      ok: true,
      code: "PLAN_GENERATED",
      promptClassification: "3plus1",
      planId: "plan_3plus1"
    }
  },
  {
    id: "prompt_villa",
    title: "Villa prompt",
    prompt: "Create a simple single-floor villa concept with bright rooms and a family living area.",
    expected: {
      ok: true,
      code: "PLAN_GENERATED",
      promptClassification: "fallback_generic",
      planId: "plan_2plus1"
    }
  },
  {
    id: "prompt_office",
    title: "Office prompt",
    prompt: "Create a small office floor plan with workstations, meeting room, and reception.",
    expected: {
      ok: false,
      code: "AI_UNSUPPORTED_REQUEST"
    }
  },
  {
    id: "prompt_unsupported_cad_bim",
    title: "Unsupported CAD/BIM request",
    prompt: "Create a construction-ready BIM and AutoCAD permit plan with structural compliance.",
    expected: {
      ok: false,
      code: "AI_UNSUPPORTED_REQUEST"
    }
  },
  {
    id: "prompt_impossible_ambiguous",
    title: "Impossible or ambiguous request",
    prompt: "Make a perfect home for everyone with all rooms huge but the total area tiny.",
    expected: {
      ok: false,
      code: "AI_NEEDS_CLARIFICATION"
    }
  }
];

export const chatEditEvaluationFixtures: ChatEditEvaluationFixture[] = [
  {
    id: "edit_enlarge_living_room",
    title: "Enlarge living room",
    basePlan: "three_plus_one",
    message: "Make the living room larger.",
    expected: {
      ok: true,
      code: "PLAN_EDITED",
      actionType: "resize_room"
    }
  },
  {
    id: "edit_shrink_kitchen",
    title: "Shrink kitchen",
    basePlan: "three_plus_one",
    message: "Shrink the kitchen.",
    expected: {
      ok: false,
      code: "EDIT_UNSUPPORTED_COMMAND"
    }
  },
  {
    id: "edit_add_bathroom",
    title: "Add bathroom",
    basePlan: "three_plus_one",
    message: "Add a bathroom.",
    expected: {
      ok: true,
      code: "PLAN_EDITED",
      actionType: "add_room"
    }
  },
  {
    id: "edit_add_balcony",
    title: "Add balcony",
    basePlan: "two_plus_one",
    message: "Add a balcony next to the living room.",
    expected: {
      ok: true,
      code: "PLAN_EDITED",
      actionType: "add_room"
    }
  },
  {
    id: "edit_rename_bedroom_to_office",
    title: "Rename bedroom to office",
    basePlan: "three_plus_one",
    message: "Rename Bedroom 3 to Office.",
    expected: {
      ok: true,
      code: "PLAN_EDITED",
      actionType: "rename_room"
    }
  },
  {
    id: "edit_unsupported_3d_render",
    title: "Unsupported 3D/render request",
    basePlan: "three_plus_one",
    message: "Make a photorealistic 3D render of this apartment.",
    expected: {
      ok: false,
      code: "EDIT_UNSUPPORTED_COMMAND"
    }
  },
  {
    id: "edit_invalid_destructive_command",
    title: "Invalid destructive command",
    basePlan: "three_plus_one",
    message: "Delete every room and leave an empty plan.",
    expected: {
      ok: false,
      code: "EDIT_UNSUPPORTED_COMMAND"
    }
  }
];
