import {
  createPlanningFixture,
  petFriendlyPlanningFixture,
  studentApartmentPlanningFixture,
  threePlusOnePlanningFixture
} from "./planning-fixtures";
import type { PlanningSpecification } from "./planning-types";
import type {
  PlanningCompromise,
  PlanningConflict
} from "./resolved-planning-types";

export type PlanningConstraintFixture = {
  id: string;
  title: string;
  specification: PlanningSpecification;
  expected: {
    maximumRating?: "highly_feasible" | "feasible" | "constrained" | "low";
    minimumScore?: number;
    conflictCode?: PlanningConflict["code"];
    compromiseCode?: PlanningCompromise["code"];
  };
};

export const feasibleFamilyConstraintFixture = structuredClone(
  threePlusOnePlanningFixture
);

export const tinyHouseTooManyRoomsConstraintFixture = createPlanningFixture({
  title: "Tiny House With Too Many Rooms",
  buildingType: "tiny_house",
  targetArea: 35,
  requestedRooms: {
    bedrooms: 4,
    bathrooms: 2,
    balconies: 2,
    office: true,
    laundry: true,
    storage: true,
    guestRoom: true,
    openKitchen: true,
    otherRooms: []
  },
  priorities: {
    budget: "high",
    storage: "high"
  }
});

export const insufficientLuxuryVillaConstraintFixture = createPlanningFixture({
  title: "Insufficient Area Luxury Villa",
  buildingType: "villa",
  architecturalStyle: "luxury",
  targetArea: 115,
  requestedRooms: {
    bedrooms: 4,
    bathrooms: 3,
    balconies: 2,
    office: true,
    laundry: true,
    pantry: true,
    dining: true,
    storage: true,
    walkInCloset: true,
    guestRoom: true,
    ensuite: true,
    openKitchen: true,
    otherRooms: []
  },
  priorities: {
    entertaining: "high",
    cooking: "high",
    privacy: "high",
    daylight: "high",
    storage: "high",
    budget: "low"
  }
});

export const insufficientAccessibilityConstraintFixture = createPlanningFixture({
  title: "Small Accessible Apartment",
  targetArea: 55,
  household: {
    accessibilityNeeds: ["wheelchair accessible circulation"]
  },
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    office: true,
    openKitchen: true,
    otherRooms: []
  }
});

export const openKitchenFamilyConstraintFixture = createPlanningFixture({
  title: "Open Kitchen Family Apartment",
  targetArea: 120,
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 2,
    balconies: 1,
    dining: true,
    openKitchen: true,
    otherRooms: []
  },
  priorities: {
    entertaining: "high",
    cooking: "high"
  }
});

export const privacyPriorityConstraintFixture = createPlanningFixture({
  title: "Privacy Priority Apartment",
  targetArea: 110,
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 2,
    openKitchen: false,
    otherRooms: []
  },
  priorities: {
    privacy: "high"
  }
});

export const daylightPriorityConstraintFixture = createPlanningFixture({
  title: "Daylight Priority Apartment",
  targetArea: 105,
  requestedRooms: {
    bedrooms: 2,
    bathrooms: 1,
    office: true,
    balconies: 1,
    openKitchen: true,
    otherRooms: []
  },
  priorities: {
    daylight: "high"
  }
});

export const officeHeavyConstraintFixture = createPlanningFixture({
  title: "Office Heavy Apartment",
  targetArea: 85,
  requestedRooms: {
    bedrooms: 3,
    bathrooms: 1,
    office: true,
    storage: true,
    guestRoom: true,
    openKitchen: true,
    otherRooms: []
  },
  priorities: {
    privacy: "high",
    daylight: "high"
  }
});

export const planningConstraintFixtures: PlanningConstraintFixture[] = [
  {
    id: "constraint_feasible_3plus1_family",
    title: "Feasible 3+1 family apartment",
    specification: feasibleFamilyConstraintFixture,
    expected: { minimumScore: 60 }
  },
  {
    id: "constraint_small_student_apartment",
    title: "Small student apartment",
    specification: studentApartmentPlanningFixture,
    expected: { minimumScore: 55 }
  },
  {
    id: "constraint_tiny_house_too_many_rooms",
    title: "Tiny house with too many rooms",
    specification: tinyHouseTooManyRoomsConstraintFixture,
    expected: {
      maximumRating: "low",
      conflictCode: "room_program_exceeds_area",
      compromiseCode: "reduce_balcony_count"
    }
  },
  {
    id: "constraint_luxury_villa_insufficient_area",
    title: "Luxury villa with insufficient area",
    specification: insufficientLuxuryVillaConstraintFixture,
    expected: { conflictCode: "luxury_program_insufficient_area" }
  },
  {
    id: "constraint_accessibility_insufficient_area",
    title: "Accessibility request with insufficient area",
    specification: insufficientAccessibilityConstraintFixture,
    expected: { conflictCode: "accessibility_small_area" }
  },
  {
    id: "constraint_open_kitchen_family",
    title: "Open kitchen family apartment",
    specification: openKitchenFamilyConstraintFixture,
    expected: { minimumScore: 55 }
  },
  {
    id: "constraint_privacy_priority",
    title: "Privacy-priority apartment",
    specification: privacyPriorityConstraintFixture,
    expected: { minimumScore: 55 }
  },
  {
    id: "constraint_daylight_priority",
    title: "Daylight-priority apartment",
    specification: daylightPriorityConstraintFixture,
    expected: { minimumScore: 55 }
  },
  {
    id: "constraint_pet_friendly",
    title: "Pet-friendly apartment",
    specification: petFriendlyPlanningFixture,
    expected: { minimumScore: 55 }
  },
  {
    id: "constraint_office_heavy",
    title: "Office-heavy apartment",
    specification: officeHeavyConstraintFixture,
    expected: { conflictCode: "office_heavy_program_insufficient_area" }
  }
];
