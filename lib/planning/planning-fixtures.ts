import { planningSpecificationSchema } from "./planning-schema";
import type { PlanningSpecification } from "./planning-types";

type PlanningFixtureOverrides = Partial<
  Omit<PlanningSpecification, "household" | "priorities" | "requestedRooms">
> & {
  household?: Partial<PlanningSpecification["household"]>;
  priorities?: Partial<PlanningSpecification["priorities"]>;
  requestedRooms?: Partial<PlanningSpecification["requestedRooms"]>;
};

const basePlanningSpecification: PlanningSpecification = {
  schemaVersion: "planning-specification-v1",
  title: "2+1 Apartment Concept",
  projectType: "concept",
  buildingType: "apartment",
  classification: "residential",
  floorCount: 1,
  units: "m",
  targetArea: 85,
  preferredDimensions: null,
  architecturalStyle: "unspecified",
  userLanguage: "en",
  household: {
    profile: "family",
    adults: 2,
    children: 1,
    regularGuests: 0,
    accessibilityNeeds: [],
    lifestylePreferences: [],
    workFromHome: "none",
    pets: "none"
  },
  priorities: {
    entertaining: "medium",
    cooking: "medium",
    privacy: "medium",
    daylight: "medium",
    storage: "medium",
    budget: "medium"
  },
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    balconies: 0,
    office: false,
    laundry: false,
    pantry: false,
    dining: false,
    storage: false,
    walkInCloset: false,
    guestRoom: false,
    ensuite: false,
    openKitchen: false,
    otherRooms: ["WC"]
  },
  roomRelationships: [
    {
      from: "living",
      to: "kitchen",
      relationship: "near",
      priority: "should",
      reason: "Living room and kitchen should remain close for daily use."
    }
  ],
  mustHaveConstraints: ["One floor", "Rectangular rooms"],
  shouldHaveConstraints: [],
  avoidConstraints: [],
  neverConstraints: ["No construction or compliance claims"],
  missingInformation: [],
  clarificationQuestions: [],
  unsupportedRequests: [],
  warnings: [],
  confidenceScore: 0.9,
  assumptions: [
    "All dimensions are approximate.",
    "The plan is a conceptual residential draft."
  ]
};

export function createPlanningFixture(
  overrides: PlanningFixtureOverrides = {}
): PlanningSpecification {
  return planningSpecificationSchema.parse({
    ...basePlanningSpecification,
    ...overrides,
    household: {
      ...basePlanningSpecification.household,
      ...overrides.household
    },
    priorities: {
      ...basePlanningSpecification.priorities,
      ...overrides.priorities
    },
    requestedRooms: {
      ...basePlanningSpecification.requestedRooms,
      ...overrides.requestedRooms
    }
  });
}

export const onePlusOnePlanningFixture = createPlanningFixture({
  title: "1+1 Apartment Concept",
  targetArea: 55,
  household: {
    profile: "single",
    adults: 1,
    children: 0
  },
  requestedRooms: {
    bedrooms: 1,
    bathrooms: 1,
    openKitchen: true,
    otherRooms: []
  }
});

export const twoPlusOnePlanningFixture = createPlanningFixture();

export const threePlusOnePlanningFixture = createPlanningFixture({
  title: "3+1 Apartment Concept",
  targetArea: 120,
  household: {
    profile: "family",
    adults: 2,
    children: 2
  },
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 1,
    balconies: 1,
    openKitchen: true
  },
  roomRelationships: [
    {
      from: "living",
      to: "kitchen",
      relationship: "connected",
      priority: "must",
      reason: "The requested open kitchen should connect to the living room."
    },
    {
      from: "living",
      to: "balcony",
      relationship: "connected",
      priority: "must",
      reason: "The balcony should connect to the living room."
    }
  ]
});

export const modernFamilyPlanningFixture = createPlanningFixture({
  title: "145 m2 Modern Family Apartment",
  targetArea: 145,
  architecturalStyle: "modern",
  household: {
    profile: "family",
    adults: 2,
    children: 2
  },
  priorities: {
    daylight: "high",
    storage: "high",
    privacy: "high"
  },
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 2,
    balconies: 1,
    office: true,
    storage: true,
    ensuite: true,
    openKitchen: true
  },
  assumptions: [
    "A family of four is interpreted as two adults and two children.",
    "All dimensions are approximate.",
    "The plan is a conceptual residential draft."
  ]
});

export const studentApartmentPlanningFixture = createPlanningFixture({
  title: "Small Student Apartment",
  targetArea: 42,
  household: {
    profile: "students",
    adults: 1,
    children: 0,
    lifestylePreferences: ["compact study area"],
    workFromHome: "occasional"
  },
  priorities: {
    budget: "high",
    storage: "medium"
  },
  requestedRooms: {
    bedrooms: 1,
    bathrooms: 1,
    openKitchen: true,
    otherRooms: []
  }
});

export const petFriendlyPlanningFixture = createPlanningFixture({
  title: "Pet Friendly Apartment",
  targetArea: 90,
  household: {
    pets: "other",
    lifestylePreferences: ["pet friendly circulation", "easy-clean entry"]
  },
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1
  },
  shouldHaveConstraints: ["Provide clear circulation for a household with pets"]
});

export const wheelchairAccessiblePlanningFixture = createPlanningFixture({
  title: "Wheelchair Accessible Apartment Concept",
  targetArea: 100,
  household: {
    accessibilityNeeds: ["wheelchair accessible circulation"]
  },
  priorities: {
    privacy: "medium",
    storage: "medium"
  },
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    openKitchen: true
  },
  mustHaveConstraints: [
    "One floor",
    "Rectangular rooms",
    "Prefer generous conceptual circulation widths"
  ],
  warnings: [
    "Accessibility intent is conceptual and is not a code-compliance guarantee."
  ]
});

export const vacationHomePlanningFixture = createPlanningFixture({
  title: "Vacation Home Concept",
  buildingType: "vacation_home",
  targetArea: 95,
  household: {
    profile: "vacation",
    regularGuests: 2,
    lifestylePreferences: ["outdoor connection"]
  },
  priorities: {
    entertaining: "high",
    daylight: "high"
  },
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    balconies: 1,
    guestRoom: true,
    openKitchen: true
  }
});

export const tinyHousePlanningFixture = createPlanningFixture({
  title: "Tiny House Concept",
  buildingType: "tiny_house",
  targetArea: 32,
  household: {
    profile: "couple",
    adults: 2,
    children: 0
  },
  priorities: {
    budget: "high",
    storage: "high"
  },
  requestedRooms: {
    bedrooms: 1,
    bathrooms: 1,
    storage: true,
    openKitchen: true,
    otherRooms: []
  },
  assumptions: [
    "The tiny house uses compact room targets within the rectangular-room MVP.",
    "All dimensions are approximate."
  ]
});

export const luxuryVillaPlanningFixture = createPlanningFixture({
  title: "Luxury Villa Concept",
  buildingType: "villa",
  targetArea: 240,
  architecturalStyle: "luxury",
  household: {
    profile: "family",
    adults: 2,
    children: 2,
    regularGuests: 2
  },
  priorities: {
    entertaining: "high",
    cooking: "high",
    privacy: "high",
    daylight: "high",
    storage: "high",
    budget: "low"
  },
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 2,
    balconies: 2,
    office: true,
    pantry: true,
    dining: true,
    walkInCloset: true,
    guestRoom: true,
    ensuite: true,
    openKitchen: true
  },
  warnings: [
    "The MVP keeps the villa to one floor and at most 12 rectangular rooms."
  ]
});

export const planningFixtures = {
  onePlusOne: onePlusOnePlanningFixture,
  twoPlusOne: twoPlusOnePlanningFixture,
  threePlusOne: threePlusOnePlanningFixture,
  modernFamily: modernFamilyPlanningFixture,
  studentApartment: studentApartmentPlanningFixture,
  petFriendly: petFriendlyPlanningFixture,
  wheelchairAccessible: wheelchairAccessiblePlanningFixture,
  vacationHome: vacationHomePlanningFixture,
  tinyHouse: tinyHousePlanningFixture,
  luxuryVilla: luxuryVillaPlanningFixture
} as const;
