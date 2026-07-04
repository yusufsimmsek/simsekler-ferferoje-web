import {
  createPlanningFixture,
  luxuryVillaPlanningFixture,
  modernFamilyPlanningFixture,
  onePlusOnePlanningFixture,
  petFriendlyPlanningFixture,
  studentApartmentPlanningFixture,
  threePlusOnePlanningFixture,
  tinyHousePlanningFixture,
  twoPlusOnePlanningFixture,
  vacationHomePlanningFixture,
  wheelchairAccessiblePlanningFixture
} from "./planning-fixtures";
import { planningSpecificationSchema } from "./planning-schema";
import type {
  PlanningSpecification,
  PlanningUnsupportedRequest
} from "./planning-types";

type UnsupportedRule = {
  code: PlanningUnsupportedRequest["code"];
  patterns: RegExp[];
  message: string;
  classification?: PlanningSpecification["classification"];
  floorCount?: number;
};

const unsupportedRules: UnsupportedRule[] = [
  {
    code: "cad_bim",
    patterns: [/\bbim\b/, /\bautocad\b/, /\bcad\b/, /\brevit\b/, /\bdwg\b/, /\bifc\b/],
    message: "CAD, BIM, Revit, AutoCAD, DWG, and IFC outputs are outside this MVP."
  },
  {
    code: "structural_engineering",
    patterns: [
      /\bstructural\b/,
      /\bload[-\s]?bearing\b/,
      /\bseismic\b/,
      /\bbeam\b/,
      /\bcolumn\b/,
      /\bstatik\b/,
      /\btasiyici\b/
    ],
    message: "Structural calculations and load-bearing claims are outside the MVP."
  },
  {
    code: "construction_drawings",
    patterns: [/\bconstruction\s+drawings?\b/, /\bconstruction[-\s]?ready\b/, /\buygulama\s+projesi\b/],
    message: "Construction-ready drawings are outside the conceptual planning MVP."
  },
  {
    code: "permit_legal",
    patterns: [
      /\bpermit\b/,
      /\blegal\s+compliance\b/,
      /\bcode\s+compliance\b/,
      /\bzoning\b/,
      /\bruhsat\b/
    ],
    message: "Permit, legal, zoning, and code-compliance claims are outside the MVP."
  },
  {
    code: "three_dimensional_render",
    patterns: [/\b3d\b/, /\brender\b/, /\bphotorealistic\b/, /\bvisualization\b/, /\bvirtual\s+tour\b/],
    message: "3D rendering and visualization are outside the 2D planning MVP."
  },
  {
    code: "multi_floor",
    patterns: [
      /\b(two|three|four|five|\d+)\s*(floor|floors|storey|storeys|story|stories)\b/,
      /\bduplex\b/,
      /\btriplex\b/,
      /\bsecond\s+floor\b/,
      /\bmulti[-\s]?floor\b/
    ],
    message: "Multi-floor buildings are outside the one-floor MVP.",
    floorCount: 2
  },
  {
    code: "interior_only",
    patterns: [
      /\binterior\s+design\b/,
      /\bfurniture\b/,
      /\bdecor\b/,
      /\bcolor\s+palette\b/,
      /\bmaterial\s+board\b/
    ],
    message: "Interior-only furniture and decoration requests are outside this MVP."
  },
  {
    code: "non_residential",
    patterns: [
      /\bhospital\b/,
      /\bshopping\s+mall\b/,
      /\bwarehouse\b/,
      /\bfactory\b/,
      /\bschool\b/,
      /\bhotel\b/,
      /\boffice\s+(floor\s+)?plan\b/,
      /\boffice\b.*\bworkstations?\b/,
      /\bworkstations?\b.*\breception\b/
    ],
    message: "Commercial and institutional buildings are outside the residential MVP.",
    classification: "commercial"
  }
];

const vaguePromptPatterns = [
  /^i need a house[.!]?$/,
  /^make me a plan[.!]?$/,
  /^design something modern[.!]?$/,
  /^i want a good layout[.!]?$/,
  /^bir ev istiyorum[.!]?$/,
  /^bana bir plan yap[.!]?$/,
  /\bperfect\s+home\s+for\s+everyone\b/,
  /\ball\s+rooms\s+huge\b.*\btiny\b/,
  /\btiny\b.*\ball\s+rooms\s+huge\b/
];

export function normalizePlanningSpecification(
  specification: PlanningSpecification
): PlanningSpecification {
  return planningSpecificationSchema.parse({
    ...specification,
    title: specification.title.trim(),
    household: {
      ...specification.household,
      accessibilityNeeds: uniqueStrings(specification.household.accessibilityNeeds),
      lifestylePreferences: uniqueStrings(specification.household.lifestylePreferences)
    },
    requestedRooms: {
      ...specification.requestedRooms,
      otherRooms: uniqueStrings(specification.requestedRooms.otherRooms)
    },
    roomRelationships: uniqueRelationships(specification.roomRelationships),
    mustHaveConstraints: uniqueStrings(specification.mustHaveConstraints),
    shouldHaveConstraints: uniqueStrings(specification.shouldHaveConstraints),
    avoidConstraints: uniqueStrings(specification.avoidConstraints),
    neverConstraints: uniqueStrings(specification.neverConstraints),
    missingInformation: uniqueStrings(specification.missingInformation),
    clarificationQuestions: uniqueById(specification.clarificationQuestions),
    unsupportedRequests: uniqueUnsupported(specification.unsupportedRequests),
    warnings: uniqueStrings(specification.warnings),
    assumptions: uniqueStrings(specification.assumptions)
  });
}

export function planningSpecificationFromPrompt(prompt: string): PlanningSpecification {
  const normalizedPrompt = normalizePromptText(prompt);
  const language: PlanningSpecification["userLanguage"] = detectsTurkish(prompt) ? "tr" : "en";
  const unsupported = unsupportedRules.filter((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalizedPrompt))
  );

  if (unsupported.length > 0) {
    return createPlanningFixture({
      title: "Unsupported Planning Request",
      buildingType: unsupported.some((rule) => rule.classification === "commercial")
        ? "unsupported"
        : "other_residential",
      classification: unsupported.some((rule) => rule.classification === "commercial")
        ? "commercial"
        : "residential",
      floorCount: Math.max(...unsupported.map((rule) => rule.floorCount ?? 1)),
      userLanguage: language,
      targetArea: null,
      unsupportedRequests: unsupported.map((rule) => ({
        code: rule.code,
        message: rule.message
      })),
      warnings: [
        'Try: "Create a one-floor 3+1 apartment with open kitchen and balcony."'
      ],
      confidenceScore: 0.99
    });
  }

  if (isVaguePrompt(normalizedPrompt)) {
    return createPlanningFixture({
      title: "Residential Planning Request",
      buildingType: "house",
      userLanguage: language,
      targetArea: null,
      requestedRooms: {
        bedrooms: 0,
        bathrooms: 0
      },
      roomRelationships: [],
      missingInformation: ["bedroom count", "bathroom count", "approximate target area"],
      clarificationQuestions: [
        {
          id: "clarify_room_program",
          question: "How many bedrooms and bathrooms should the one-floor residential home include?",
          required: true
        },
        {
          id: "clarify_target_area",
          question: "What approximate total area should the conceptual plan target?",
          required: false
        }
      ],
      warnings: ["The prompt needs a clearer residential room program before layout generation."],
      confidenceScore: 0.35
    });
  }

  const base = chooseBaseFixture(normalizedPrompt);
  const specification = structuredClone(base);
  const bedroomCount = parseBedroomCount(normalizedPrompt);
  const bathroomCount = parseBathroomCount(normalizedPrompt);
  const balconyCount = parseRoomCount(normalizedPrompt, "balcon(?:y|ies)|balkon");
  const targetArea = parseTargetArea(normalizedPrompt);
  const preferredDimensions = parsePreferredDimensions(normalizedPrompt);

  specification.userLanguage = language;
  specification.targetArea = targetArea ?? specification.targetArea;
  specification.preferredDimensions = preferredDimensions;
  specification.architecturalStyle = detectStyle(normalizedPrompt);

  if (bedroomCount !== null) specification.requestedRooms.bedrooms = bedroomCount;
  if (bathroomCount !== null) specification.requestedRooms.bathrooms = bathroomCount;
  if (balconyCount !== null) specification.requestedRooms.balconies = balconyCount;

  specification.requestedRooms.openKitchen = matchesAny(normalizedPrompt, [
    /\bopen\s+kitchen\b/,
    /\bacik\s+mutfak\b/,
    /\bopen[-\s]?plan\s+kitchen\b/
  ]);

  if (
    matchesAny(normalizedPrompt, [
      /\bfully\s+separate\s+kitchen\b/,
      /\bseparate\s+kitchen\b/,
      /\bclosed\s+kitchen\b/,
      /\benclosed\s+kitchen\b/
    ])
  ) {
    specification.mustHaveConstraints.push("Kitchen must be fully separate.");
  }
  specification.requestedRooms.office = matchesAny(normalizedPrompt, [
    /\bhome\s+office\b/,
    /\bstudy\s+room\b/,
    /\bcalisma\s+odasi\b/
  ]);
  specification.requestedRooms.laundry = matchesAny(normalizedPrompt, [/\blaundry\b/, /\bcamasir\s+odasi\b/]);
  specification.requestedRooms.pantry = matchesAny(normalizedPrompt, [/\bpantry\b/, /\bkiler\b/]);
  specification.requestedRooms.dining = matchesAny(normalizedPrompt, [/\bdining\s+room\b/, /\byemek\s+odasi\b/]);
  specification.requestedRooms.storage = matchesAny(normalizedPrompt, [/\bstorage\b/, /\bdepolama\b/]);
  specification.requestedRooms.walkInCloset = matchesAny(normalizedPrompt, [/\bwalk[-\s]?in\s+closet\b/, /\bgiyinme\s+odasi\b/]);
  specification.requestedRooms.guestRoom = matchesAny(normalizedPrompt, [/\bguest\s+room\b/, /\bmisafir\s+odasi\b/]);
  specification.requestedRooms.ensuite = matchesAny(normalizedPrompt, [
    /\bparents?\s+bathroom\b/,
    /\bmaster\s+ensuite\b/,
    /\bebeveyn\s+banyosu\b/
  ]);

  if (specification.requestedRooms.ensuite) {
    specification.requestedRooms.bathrooms = Math.max(
      2,
      specification.requestedRooms.bathrooms
    );
  }

  applyHouseholdSignals(specification, normalizedPrompt);
  applyPrioritySignals(specification, normalizedPrompt);
  specification.roomRelationships = buildRelationships(specification);
  specification.title = planningTitle(specification);
  specification.confidenceScore = 0.92;

  if (targetArea === null && specification.targetArea === null) {
    specification.targetArea = defaultAreaForBedrooms(specification.requestedRooms.bedrooms);
    specification.assumptions.push("Target area was estimated from the requested bedroom count.");
  }

  if (specification.requestedRooms.office) {
    specification.household.workFromHome = "dedicated";
    specification.household.lifestylePreferences.push("dedicated work area");
  }

  return normalizePlanningSpecification(specification);
}

export function normalizePromptText(value: string) {
  return value
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u011f/g, "g")
    .replace(/\u00fc/g, "u")
    .replace(/\u015f/g, "s")
    .replace(/\u00f6/g, "o")
    .replace(/\u00e7/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseBaseFixture(prompt: string) {
  if (/\b145\s*(sqm|m2|m\s*2|square\s+meters?)\b/.test(prompt) && /\bmodern\b/.test(prompt)) {
    return modernFamilyPlanningFixture;
  }
  if (/\bstudent\b/.test(prompt)) return studentApartmentPlanningFixture;
  if (/\bpet[-\s]?friendly\b|\bpet\b|\bevcil\b/.test(prompt)) return petFriendlyPlanningFixture;
  if (/\bwheelchair\b|\baccessible\b|\btekerlekli\b/.test(prompt)) return wheelchairAccessiblePlanningFixture;
  if (/\bvacation\s+home\b|\bholiday\s+home\b|\byazlik\b/.test(prompt)) return vacationHomePlanningFixture;
  if (/\btiny\s+house\b/.test(prompt)) return tinyHousePlanningFixture;
  if (/\bluxury\s+villa\b|\bluks\s+villa\b/.test(prompt)) return luxuryVillaPlanningFixture;

  const bedrooms = parseBedroomCount(prompt);

  if (bedrooms === 1) return onePlusOnePlanningFixture;
  if (bedrooms !== null && bedrooms >= 3) return threePlusOnePlanningFixture;
  return twoPlusOnePlanningFixture;
}

function applyHouseholdSignals(specification: PlanningSpecification, prompt: string) {
  const familySize = prompt.match(/\bfamily\s+of\s+(\d+)\b/)?.[1];

  if (familySize) {
    const size = Number(familySize);
    specification.household.profile = "family";
    specification.household.adults = Math.min(2, size);
    specification.household.children = Math.max(0, size - 2);
    specification.assumptions.push(
      `Family of ${size} was interpreted as ${Math.min(2, size)} adults and ${Math.max(0, size - 2)} children.`
    );
  }

  if (/\bpet[-\s]?friendly\b|\bpet\b|\bevcil\b/.test(prompt)) {
    specification.household.pets = "other";
    specification.household.lifestylePreferences.push("pet friendly circulation");
  }

  if (/\bwheelchair\b|\btekerlekli\b/.test(prompt)) {
    specification.household.accessibilityNeeds.push("wheelchair accessible circulation");
    specification.warnings.push(
      "Accessibility intent is conceptual and is not a code-compliance guarantee."
    );
  }
}

function applyPrioritySignals(specification: PlanningSpecification, prompt: string) {
  if (/\bentertain|\bguests?|\bmisafir\b/.test(prompt)) specification.priorities.entertaining = "high";
  if (/\bcook|\bchef|\blarge\s+kitchen|\byemek\b/.test(prompt)) specification.priorities.cooking = "high";
  if (/\bprivacy|\bprivate|\bmahremiyet\b/.test(prompt)) specification.priorities.privacy = "high";
  if (/\bdaylight|\bbright|\bsunlight|\bgunes\b|\baydinlik\b/.test(prompt)) specification.priorities.daylight = "high";
  if (/\bstorage|\bdepolama\b|\bkiler\b/.test(prompt)) specification.priorities.storage = "high";
  if (/\bbudget|\baffordable|\beconomical|\bekonomik\b/.test(prompt)) specification.priorities.budget = "high";
}

function buildRelationships(specification: PlanningSpecification): PlanningSpecification["roomRelationships"] {
  const relationships: PlanningSpecification["roomRelationships"] = [
    {
      from: "hallway",
      to: "living",
      relationship: "connected",
      priority: "must",
      reason: "Primary circulation should connect to the living room."
    }
  ];

  relationships.push({
    from: "living",
    to: "kitchen",
    relationship: specification.requestedRooms.openKitchen ? "connected" : "near",
    priority: "should",
    reason: specification.requestedRooms.openKitchen
      ? "Open kitchen intent requires a direct living-kitchen relationship."
      : "Kitchen should remain near the living room."
  });

  if (specification.requestedRooms.balconies > 0) {
    relationships.push({
      from: "living",
      to: "balcony",
      relationship: "connected",
      priority: "must",
      reason: "The primary balcony should connect to the living room."
    });
  }

  if (specification.requestedRooms.office) {
    relationships.push({
      from: "office",
      to: "living",
      relationship: "separate",
      priority: "should",
      reason: "Work-from-home space should have acoustic privacy from the living room."
    });
  }

  return relationships;
}

function parseBedroomCount(prompt: string) {
  const numeric = prompt.match(/\b([1-8])\s*\+\s*1\b/)?.[1]
    ?? prompt.match(/\b([1-8])\s*bed(?:room)?s?\b/)?.[1]
    ?? prompt.match(/\b([1-8])\s*yatak\s+odali\b/)?.[1];

  if (numeric) return Number(numeric);

  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    bir: 1,
    iki: 2,
    uc: 3,
    dort: 4,
    bes: 5
  };
  const word = prompt.match(/\b(one|two|three|four|five)\s+bed(?:room)?s?\b/)?.[1]
    ?? prompt.match(/\b(bir|iki|uc|dort|bes)\s+yatak\s+odali\b/)?.[1];

  return word ? words[word] : null;
}

function parseBathroomCount(prompt: string) {
  const numeric = prompt.match(/\b([1-6])\s+bathrooms?\b/)?.[1]
    ?? prompt.match(/\b([1-6])\s+banyo\b/)?.[1];

  if (numeric) return Number(numeric);
  if (/\btwo\s+bathrooms?\b|\biki\s+banyo\b/.test(prompt)) return 2;
  if (/\bone\s+bathroom\b|\bbir\s+banyo\b/.test(prompt)) return 1;
  return null;
}

function parseRoomCount(prompt: string, roomPattern: string) {
  const numeric = prompt.match(new RegExp(`\\b([1-4])\\s+(?:${roomPattern})\\b`))?.[1];

  if (numeric) return Number(numeric);
  if (new RegExp(`\\btwo\\s+(?:${roomPattern})\\b`).test(prompt)) return 2;
  if (new RegExp(`\\biki\\s+(?:${roomPattern})\\b`).test(prompt)) return 2;
  if (new RegExp(`\\b(?:${roomPattern})\\b`).test(prompt)) return 1;
  return null;
}

function parseTargetArea(prompt: string) {
  const match = prompt.match(/\b(\d{2,3}(?:\.\d+)?)\s*(sqm|m2|m\s*2|square\s+meters?|metrekare)\b/);
  if (!match?.[1]) return null;

  const area = Number(match[1]);
  return area >= 18 && area <= 500 ? area : null;
}

function parsePreferredDimensions(prompt: string) {
  const match = prompt.match(/\b(\d{1,2}(?:\.\d+)?)\s*[xX]\s*(\d{1,2}(?:\.\d+)?)\s*m\b/);
  if (!match?.[1] || !match[2]) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < 3 || width > 50 || height < 3 || height > 50) return null;

  return { width, height };
}

function detectStyle(prompt: string): PlanningSpecification["architecturalStyle"] {
  if (/\bluxury\b|\bluks\b/.test(prompt)) return "luxury";
  if (/\bminimal(?:ist)?\b/.test(prompt)) return "minimalist";
  if (/\btraditional\b|\bgeleneksel\b/.test(prompt)) return "traditional";
  if (/\brustic\b|\brustik\b/.test(prompt)) return "rustic";
  if (/\bcontemporary\b/.test(prompt)) return "contemporary";
  if (/\bmodern\b/.test(prompt)) return "modern";
  return "unspecified";
}

function planningTitle(specification: PlanningSpecification) {
  const building = specification.buildingType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const roomLabel = specification.requestedRooms.bedrooms > 0
    ? `${specification.requestedRooms.bedrooms}+1 `
    : "";
  const style = specification.architecturalStyle === "unspecified"
    ? ""
    : `${specification.architecturalStyle.charAt(0).toUpperCase()}${specification.architecturalStyle.slice(1)} `;

  return `${style}${roomLabel}${building} Concept`;
}

function defaultAreaForBedrooms(bedrooms: number) {
  if (bedrooms <= 1) return 55;
  if (bedrooms === 2) return 85;
  if (bedrooms === 3) return 120;
  return Math.min(180, 120 + (bedrooms - 3) * 20);
}

function isVaguePrompt(prompt: string) {
  return vaguePromptPatterns.some((pattern) => pattern.test(prompt));
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function detectsTurkish(value: string) {
  return /[\u00e7\u011f\u0131\u00f6\u015f\u00fc]/i.test(value)
    || /\b(yatak|mutfak|balkon|banyo|ebeveyn|calisma)\b/i.test(normalizePromptText(value));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueById<T extends { id: string }>(values: T[]) {
  return Array.from(new Map(values.map((value) => [value.id, value])).values());
}

function uniqueUnsupported(values: PlanningSpecification["unsupportedRequests"]) {
  return Array.from(new Map(values.map((value) => [value.code, value])).values());
}

function uniqueRelationships(values: PlanningSpecification["roomRelationships"]) {
  return Array.from(
    new Map(values.map((value) => [`${value.from}:${value.to}:${value.relationship}`, value])).values()
  );
}
