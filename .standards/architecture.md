# Architecture Standard

## Purpose

ArchiFlow architecture must support authenticated, multi-user, auditable, AI-assisted architectural workflows.

## Requirements

- Keep domain concepts explicit and typed.
- Separate local prototype state from backend-derived state.
- Treat the server as source of truth for trust-critical, shared, irreversible, or cost-bearing state.
- Keep API contracts explicit and tested.
- Prefer small, scoped changes over broad refactors unless architecture risk justifies larger movement.
- Document significant architecture decisions.

## Review Gate

Senior Architect must approve changes to domain models, API contracts, persistence, routing, or major state boundaries.
