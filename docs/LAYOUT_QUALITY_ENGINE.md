# Layout Quality Engine

## Purpose

The layout quality engine evaluates a generated `FloorPlan` after deterministic layout and measures how well its geometry satisfies the resolved planning intent.

It is an evaluation layer only. It does not move rooms, alter coordinates, rewrite the plan, or claim architectural or legal compliance.

## Architecture

```text
User Prompt
  -> PlanningSpecification
  -> Planning Constraint Resolver
  -> ResolvedPlanningSpecification
  -> Semantic PlanDraft
  -> Deterministic Layout Candidate Generator
  -> Validated FloorPlan Candidates
  -> Layout Quality Analyzer per Valid Candidate
  -> Layout Optimizer
  -> Selected FloorPlan
  -> Selected LayoutQualityReport
  -> Renderer / Export
```

The analyzer receives:

- a validated `ResolvedPlanningSpecification`
- a generated `FloorPlan`

It compares the relationship graph and room-program expectations with actual room coordinates, doors, windows, dimensions, and bounds.

## LayoutQualityReport v1

Schema version:

```text
layout-quality-report-v1
```

The report includes:

- overall score and rating
- relationship satisfaction score
- circulation score
- privacy score
- daylight score
- accessibility score
- efficiency score
- adjacency score
- geometry score
- room balance score
- metric weights and rationale
- warnings and recommendations
- satisfied relationship constraints
- failed or partially satisfied relationship constraints
- deterministic analyzer metadata

The Zod source of truth is `lib/planning/quality-schema.ts`.

## Scoring Model

All scores are deterministic and range from 0 to 100.

Overall weights:

- relationship satisfaction: 18%
- circulation: 12%
- privacy: 10%
- daylight: 10%
- accessibility: 8%
- efficiency: 10%
- adjacency: 10%
- geometry: 14%
- room balance: 8%

Ratings:

- `excellent`: 85-100
- `good`: 70-84.99
- `fair`: 50-69.99
- `poor`: below 50

Metric rationale is included in the report so scores can be inspected without reverse-engineering the implementation.

## Relationship Satisfaction

Each resolved relationship graph edge is evaluated against geometry.

Evidence includes:

- whether rooms share an edge
- whether a door directly connects them
- center-to-center distance
- whether rooms are near or separated
- whether either room is missing

Rules:

- `connected`: fully satisfied by a direct connecting door; shared edge or proximity is partial.
- `adjacent`: fully satisfied by a shared edge.
- `near`: satisfied within the deterministic near-distance threshold.
- `separate` or `avoid`: satisfied when rooms are outside the near threshold and do not share a direct public connection.

Required relationships carry more scoring weight than preferred relationships. Avoid relationships also receive elevated weight because privacy failures materially affect the plan.

Examples evaluated:

- kitchen near or connected to living
- balcony connected to living
- office separated from living and kitchen activity
- ensuite connected to the primary bedroom
- storage near circulation or service space
- laundry near bathroom or kitchen service space

## Geometric Quality

The analyzer measures:

### Geometry

- overlapping room pairs
- rooms outside declared bounds
- extreme room aspect ratios

### Room Balance

- actual room area versus target area
- actual room area versus resolved conceptual minimum
- awkwardly narrow room dimensions

### Circulation

- entry and hallway area as a percentage of total room area
- room reachability through the door graph from the entry
- excessive circulation or disconnected rooms

### Efficiency

- total room area divided by the rectangular plan bounds area
- unused bounding area and conceptual compactness

### Daylight

- daylight-priority room position on the plan exterior
- presence of a window for living, bedroom, kitchen, dining, and office intent

### Privacy

- bedroom and office distance from living, kitchen, and dining
- shared edges or direct doors between quiet and noisy zones

### Accessibility

- conceptual circulation minimum dimensions
- conceptual door widths

Accessibility scoring is advisory only and is never a compliance assessment.

## Warnings

The report may identify:

- isolated balcony
- office too close to noisy public rooms
- excessive or disconnected circulation
- weak bathroom access
- low bedroom privacy
- missing daylight opportunity
- awkward or undersized rooms
- poor room-area balance
- inefficient plan compactness
- overlapping rooms or rooms outside bounds

Warnings do not mutate or reject an otherwise schema-valid plan.

## Recommendations

Recommendations are deterministic responses to identified evidence.

Examples:

- move the balcony closer to living
- separate the office from the public zone
- reduce hallway area
- improve bathroom access
- increase bedroom privacy
- add an exterior daylight opening
- enlarge a tiny room
- rebalance room areas
- enlarge the kitchen for high cooking priority
- combine compatible optional rooms
- increase target area

No recommendation is automatically applied in v1.

## API Integration

Successful `POST /api/plan/generate` responses include:

```text
meta.quality
```

The value is the complete `LayoutQualityReport` for the selected optimized candidate.

Successful responses also include:

```text
meta.optimization
```

The value is a deterministic candidate selection report with candidate counts, rejected candidates, selected strategy, best score, and score comparison table.

Quality warning messages are also appended to the existing response `warnings` array for backward-compatible visibility. Existing plan, AI, validation, and planning metadata fields remain unchanged.

Successful `POST /api/plan/edit` responses include before/after quality metadata:

```text
meta.qualityBefore
meta.qualityAfter
meta.qualityDelta
```

`meta.qualityDelta` reports:

- before and after overall score
- signed score delta
- before and after rating
- improved, worsened, and unchanged metrics
- relationship satisfaction delta
- circulation delta
- privacy delta
- daylight delta
- room balance delta
- warnings added and resolved
- recommendations added and resolved
- concise human-readable summary

The schema source of truth is `lib/planning/edit-quality-delta-schema.ts`.

## Determinism

The analyzer:

- uses no AI provider
- uses no randomness
- has no persistence side effects
- returns the same report for identical planning and floor plan inputs
- never changes layout engine behavior
- returns the same edit delta for identical before/after quality reports

## Current Limitations

- Near-distance thresholds are heuristic.
- Door-graph reachability does not model circulation paths through open-plan spaces.
- Daylight scoring checks exterior opportunity and windows, not orientation, climate, glazing, or solar exposure.
- Privacy scoring uses geometric proximity, shared edges, and doors rather than acoustic simulation.
- Accessibility scoring is conceptual and does not represent code compliance.
- Compactness uses rectangular bounds and may penalize intentionally articulated envelopes.
- The analyzer reports problems but does not directly repair layout. The optimizer compares several deterministic candidates and selects the best report.
