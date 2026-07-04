# AI Natural Language Planning Engine

## Purpose

The planning engine converts an untrusted natural-language residential brief into a strict `PlanningSpecification` before any room draft or geometry is created.

This prevents raw prompt interpretation from leaking directly into layout code.

## Generation Architecture

```text
User Prompt
  -> Planning Provider
  -> PlanningSpecification Validation
  -> Planning Normalization
  -> Planning Constraint Resolver
  -> Feasibility Scoring
  -> ResolvedPlanningSpecification Validation
  -> Planning-to-Draft Mapper
  -> PlanDraft Validation
  -> Deterministic Layout Candidate Generator
  -> FloorPlan Validation per Candidate
  -> Layout Quality Analyzer per Valid Candidate
  -> Best Candidate Selection
  -> Final FloorPlan
  -> Selected LayoutQualityReport
  -> Shared Renderer / Export Model
```

AI owns intent extraction only. Deterministic application code owns normalization, constraint resolution, feasibility scoring, room-program mapping, geometry, validation, rendering, persistence, and export.

## PlanningSpecification v1

Schema version:

```text
planning-specification-v1
```

The contract captures:

- project and building type
- residential/commercial classification
- floor count and metric units
- target area and preferred dimensions
- architectural style and user language
- household profile, adults, children, guests, accessibility, work-from-home, pets, and lifestyle
- entertaining, cooking, privacy, daylight, storage, and budget priorities
- bedroom, bathroom, balcony, office, laundry, pantry, dining, storage, closet, guest room, ensuite, and open-kitchen intent
- room relationship preferences
- must-have, should-have, avoid, and never constraints
- missing information and clarification questions
- unsupported requests and warnings
- confidence score and assumptions

The Zod source of truth is `lib/planning/planning-schema.ts`.

## Validation Strategy

Planning output is validated before normalization or draft mapping.

Validation covers:

- exact schema version
- strict object fields
- supported enums
- target area range of 18-500 m2
- floor count range and one-floor MVP policy
- household and room-count ranges
- priority values
- room relationships and constraints
- confidence range of 0-1
- required clarification questions when information is missing
- required unsupported records for non-residential or multi-floor requests

Invalid provider output becomes a structured `AI_SCHEMA_MISMATCH` error and never reaches the layout engine.

## Normalization

The deterministic normalizer handles common equivalent expressions, including:

- `3+1`, `3 bedroom`, `three bedroom`, `3 yatak odali`
- `open kitchen`, `acik mutfak`
- `home office`, `calisma odasi`
- `balcony`, `balkon`
- `parents bathroom`, `ebeveyn banyosu`

It also extracts:

- target area such as `145 sqm`
- family size
- modern/luxury/minimal/traditional style
- pet-friendly intent
- wheelchair accessibility intent
- daylight, privacy, cooking, storage, entertaining, and budget priorities
- vacation home, tiny house, and one-floor villa profiles

Normalization does not create coordinates.

## Clarification Behavior

Prompts without a usable room program produce `missingInformation` and `clarificationQuestions`.

Examples:

- `I need a house.`
- `Make me a plan.`
- `Design something modern.`
- `I want a good layout.`

The generation workflow returns `AI_NEEDS_CLARIFICATION` and does not create a fallback plan.

## Unsupported Behavior

The planning specification records unsupported requests for:

- CAD/BIM/Revit/AutoCAD/DWG/IFC
- structural calculations or load-bearing claims
- construction-ready drawings
- permit, zoning, legal, or code-compliance claims
- 3D rendering or visualization
- multi-floor buildings
- hospitals, shopping malls, and other non-residential programs

The workflow returns `AI_UNSUPPORTED_REQUEST`. No semantic draft or geometry is created.

## ResolvedPlanningSpecification v1

Schema version:

```text
resolved-planning-specification-v1
```

The deterministic constraint resolver converts a validated `PlanningSpecification` into:

- an original planning summary and the complete normalized specification
- an exact semantic room program with stable room IDs
- resolved system, user, and inferred constraints
- a room relationship graph with public, private, service, circulation, and outdoor zones
- an explainable feasibility score and component breakdown
- detected conflicts and applied or recommended compromises
- warnings, assumptions, recommendations, and unresolved clarification items
- deterministic resolver and rule-set metadata

The strict Zod source of truth is `lib/planning/resolved-planning-schema.ts`.

## Constraint Resolution

The v1 resolver applies explicit residential rules before semantic draft generation:

- kitchen near living
- open kitchen connected to living or dining
- balcony connected to living
- bedrooms assigned to a quieter private zone
- bathrooms near hall or bedrooms
- ensuite connected to the primary bedroom
- office quiet and daylight-preferred
- laundry near a wet/service anchor
- storage near hall, kitchen, or service space
- accessibility intent reserves a larger circulation allowance
- daylight priority favors living, bedrooms, and office
- privacy priority separates bedrooms from public rooms
- entertaining priority connects living, dining, and kitchen
- cooking priority increases kitchen importance
- budget priority favors fewer optional rooms and compact circulation

The room relationship graph uses exact semantic room IDs. It expresses planning intent only; it does not contain coordinates.

## Conflicts and Compromises

The resolver detects:

- room programs that exceed usable target area
- more than 12 resolved rooms
- multiple balconies in a tiny apartment
- luxury amenities with insufficient area
- accessibility intent with very small area
- office-heavy programs with insufficient area
- contradictory open and fully separate kitchen constraints
- unsupported or unresolved requests leaking past provider handling

Deterministic compromises may:

- reduce balcony count
- combine dining with living
- combine office with guest use
- omit separate storage or laundry under strong budget/area pressure
- omit lower-priority rooms beyond the MVP room limit
- recommend a larger target area
- request clarification when feasibility remains too low

Applied compromises are preserved in draft assumptions and response metadata. The resolver never silently claims that all original requirements were satisfied.

## Feasibility Scoring

The score is deterministic, explainable, and bounded from 0 to 100.

Weighted components:

- room program feasibility: 18%
- area feasibility: 22%
- adjacency feasibility: 15%
- daylight feasibility: 10%
- privacy feasibility: 10%
- accessibility feasibility: 10%
- complexity feasibility: 8%
- planning confidence: 7%

Critical and warning conflicts apply explicit penalties. Ratings are:

- `highly_feasible`: 80-100
- `feasible`: 65-79.99
- `constrained`: 45-64.99
- `low`: below 45

`complexityScore` is also reported separately, where a higher value means a harder room program. A low feasibility rating stops generation before geometry and returns `AI_NEEDS_CLARIFICATION`.

## Planning-to-Draft Mapping

The mapper consumes a valid `ResolvedPlanningSpecification` and converts its resolved room program and relationship graph into the existing `PlanDraft` contract.

It:

- uses only rooms retained by the deterministic resolver
- estimates target areas from resolved minimums, priorities, usable area, and merged uses
- converts actionable relationship graph edges into required, preferred, or avoid adjacencies
- creates simple entry-door and exterior-window intent
- preserves conflicts, compromises, assumptions, and warnings
- validates the final semantic draft before layout

The mapper never creates `x`, `y`, `width`, or `height` layout coordinates.

## Provider Behavior

### Mock

Mock mode uses deterministic prompt normalization and canonical planning fixtures. It requires no API key and is used by local development, CI, and demos.

### OpenAI

OpenAI mode requests one strict `PlanningSpecification` JSON object through Structured Outputs.

The model is explicitly prohibited from returning:

- floor plan coordinates
- room geometry
- walls, doors, or windows as final layout data
- render instructions
- CAD/BIM/3D output
- legal, permit, compliance, or structural claims

OpenAI planning output is Zod-validated before workflow use.

## Relationship to Existing Contracts

- `PlanningSpecification`: normalized user intent.
- `ResolvedPlanningSpecification`: deterministic room program, constraints, relationship graph, feasibility, conflicts, and compromises.
- `PlanDraft`: semantic rooms and relationships generated by application code.
- `FloorPlan`: validated geometry generated by the deterministic layout engine and selected by the optimizer.
- `LayoutQualityReport`: post-layout relationship satisfaction and geometric quality evidence for the selected candidate.
- `LayoutOptimizationReport`: deterministic candidate count, rejected candidates, selected strategy, and score comparison metadata.
- Render model: drawing primitives derived only from validated `FloorPlan` geometry.

The public `POST /api/plan/generate` response remains backward compatible. Its `ai.planDraft` field contains the application-mapped semantic draft for compatibility; it is not raw model geometry.

Successful responses add `meta.planning` with confidence, feasibility, complexity, warnings, conflicts, compromises, assumptions, recommendations, and clarification recommendations. They also add `meta.quality` with the selected post-layout relationship and geometry report, plus `meta.optimization` with candidate selection metadata. Low-feasibility errors may include planning metadata but do not run candidate generation or layout quality analysis because no geometry is produced.

## Current Limitations

- Constraint resolution and area allocation use deterministic heuristics, not mathematical optimization.
- Feasibility is a product-planning estimate, not proof that geometry can satisfy every relationship.
- Relationship satisfaction is measured per valid candidate, and the optimizer selects the highest-ranked candidate.
- The optimizer compares a bounded heuristic candidate set; it does not perform mathematical layout repair or constraint solving.
- Compromises are rule-based and do not negotiate interactively with the user.
- Accessibility intent is conceptual and not a compliance guarantee.
- Multi-turn clarification collection is not implemented yet.
