# Performance Standard

## Purpose

ArchiFlow must feel fast and stable even as projects, documents, workflow history, and AI outputs grow.

## Requirements

- Scope data reads and avoid unbounded requests.
- Avoid unnecessary bundle weight and repeated expensive rendering.
- Keep animations lightweight and respectful of reduced motion.
- Measure or reason explicitly about performance-sensitive changes.
- Do not sacrifice correctness, security, or auditability for speed.

## Review Gate

Performance Engineer must review large screens, heavy rendering, broad data fetching, animation-heavy changes, and new dependencies.
