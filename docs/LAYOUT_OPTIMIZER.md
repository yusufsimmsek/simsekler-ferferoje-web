# Layout Optimizer

## Purpose

The layout optimizer generates a small deterministic set of valid floor plan candidates, evaluates each candidate with the layout quality engine, and selects the best-scoring layout for the final `FloorPlan`.

It is not an AI optimizer. It does not use randomness, genetic algorithms, reinforcement learning, external solvers, or renderer feedback.

## Architecture

```text
User Prompt
  -> PlanningSpecification
  -> Constraint Resolver
  -> ResolvedPlanningSpecification
  -> Semantic PlanDraft
  -> Layout Candidate Generator
  -> Candidate A
  -> Candidate B
  -> Candidate C
  -> Candidate D
  -> Candidate E
  -> Candidate F
  -> FloorPlan validation per candidate
  -> LayoutQualityReport per valid candidate
  -> Deterministic Optimizer
  -> Best FloorPlan
  -> Renderer / Export
```

The optimizer sits between semantic draft generation and the final API response. Rendering and export continue to consume one validated `FloorPlan`.

## Candidate Generation

Source module:

```text
lib/planning/layout-candidate-generator.ts
```

The generator currently produces six deterministic candidates:

- `candidate_a`: baseline public band with private rooms below.
- `candidate_b`: service-first private band for bathroom and wet-room access.
- `candidate_c`: wider living/kitchen public core.
- `candidate_d`: service core with kitchen closer to entry circulation.
- `candidate_e`: balcony placed directly after the living room edge.
- `candidate_f`: office-like rooms pushed toward the quieter private end.

Each candidate records its variation across:

- room ordering
- public/private zoning
- kitchen placement
- balcony placement
- office placement
- hallway strategy
- circulation strategy

The same `PlanDraft` always produces the same candidate set.

## Validation

Every generated candidate must pass:

- `LayoutCandidate` schema validation
- `FloorPlan` schema validation
- room bounds validation
- overlap validation
- door/window validation
- adjacency reference validation

Invalid candidates are rejected and preserved as metadata with developer-readable validation issues. Invalid candidates never replace valid plans.

## Quality Evaluation

Source modules:

```text
lib/planning/layout-quality.ts
lib/planning/relationship-scoring.ts
```

Each valid candidate receives a `LayoutQualityReport` covering:

- overall score
- relationship satisfaction
- circulation
- privacy
- daylight
- accessibility
- efficiency
- adjacency
- geometry
- room balance
- warnings
- recommendations

The optimizer does not change quality scores. It only compares them.

## Selection Strategy

Source module:

```text
lib/planning/layout-optimizer.ts
```

Candidates are ranked with deterministic tie-breakers:

1. overall quality score
2. relationship satisfaction score
3. circulation score
4. room balance score
5. original deterministic candidate order

The selected candidate becomes the final `FloorPlan`. Its selected `LayoutQualityReport` remains available as `meta.quality`.

## Optimization Metadata

Successful generation responses include:

```text
meta.optimization
```

The report includes:

- candidate count
- valid candidate count
- rejected candidate count
- best score
- selected candidate summary
- rejected candidate summaries
- ranked score comparison table
- optimizer, generator, analyzer, and tie-breaker metadata

The schema source of truth is:

```text
lib/planning/candidate-schema.ts
```

## Optimization-Aware Chat Edits

Chat edits now use the same candidate optimizer when a valid semantic edit action is applied.

```text
User edit message
  -> Structured EditAction
  -> Transactional semantic PlanDraft update
  -> Reconstructed planning intent from edited draft
  -> Layout candidate generation
  -> Candidate validation
  -> Quality scoring
  -> Best candidate selection
  -> Final FloorPlan
  -> Quality delta report
```

Successful `POST /api/plan/edit` responses add:

```text
meta.qualityBefore
meta.qualityAfter
meta.qualityDelta
meta.optimization
meta.selectedCandidate
```

If the optimizer cannot produce a valid candidate, the edit workflow falls back to direct deterministic relayout. The fallback is used only when it validates successfully. In that case, `meta.optimization` is `null` and `meta.selectedCandidate.id` is `direct_fallback`.

The previous valid plan is never replaced by an invalid edited plan.

## Deterministic Behavior

The optimizer is deterministic by design:

- no randomness
- no AI provider calls
- no persistence side effects
- no time-dependent candidate data
- stable candidate IDs and order
- stable scoring for identical input
- stable edit quality deltas for identical before/after reports

This makes candidate selection suitable for tests, demos, and future regression evaluation.

## Current Limitations

- Candidate strategies are simple heuristics, not mathematical optimization.
- The layout engine still uses rectangular MVP geometry.
- The optimizer compares candidates but does not perform local repair operations.
- Candidate variety is intentionally bounded to keep MVP behavior explainable.
- Scores are heuristic and conceptual, not architectural, legal, structural, or code-compliance proof.
- Chat-edit planning context is reconstructed from the current semantic draft. It preserves room IDs but is still an MVP heuristic, not a full stored planning model.
- Chat-edit fallback may use direct deterministic layout if all optimizer candidates fail.
