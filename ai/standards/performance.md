# Performance Standard

## Performance Goals

The product should feel responsive during prompt submission, conversational editing, plan rendering, and export generation. AI latency should be managed with clear progress states and efficient deterministic processing.

## Targets

- First visible response after prompt submission should appear quickly, even if generation continues.
- Plan rendering should remain smooth for MVP-sized residential layouts.
- Conversational edits should update the visible plan without unnecessary full reloads.
- PNG/PDF exports should complete predictably for standard plan sizes.

## Rules

- Keep floor plan state compact and normalized.
- Avoid recomputing geometry that can be derived once per validated change.
- Debounce expensive validation or rendering work during interactive edits.
- Use background jobs for slow exports if needed.
- Measure before optimizing.

## AI Latency

- Show progress states for generation and edits.
- Keep prompts focused and schema-constrained.
- Cache reusable static context where appropriate.
- Avoid sending unnecessary project history to the model.

## Monitoring

- Track generation duration, validation duration, render duration, and export duration.
- Track AI retry counts and validation failure rates.
