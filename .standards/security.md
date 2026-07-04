# Security Standard

## Purpose

ArchiFlow must protect project data, generated outputs, user identity, secrets, files, and backend automation boundaries.

## Requirements

- Enforce authentication and ownership server-side for protected data.
- Treat client state as untrusted for permissions.
- Keep secrets server-side and out of logs, client bundles, and persisted browser state.
- Validate and constrain uploads, file paths, API input, and generated actions.
- Fail closed for missing or invalid trust context.
- Do not add backend writes until auth, ownership, validation, and audit semantics exist.

## Review Gate

Security Engineer must approve trust-boundary, auth, upload, AI action, and backend write changes.
