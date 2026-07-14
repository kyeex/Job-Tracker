# Security Decision

This tracker is currently treated as a personal local application.

Localhost API requests are allowed so the app remains usable for personal D1
development. Public or non-local API requests are blocked by default in
`app/api/jobs/_security.ts`.

Before any publicly reachable production deployment, add authentication and
owner-scoped data:

- add a `user_id` column to `job_applications`;
- derive the authenticated user on the server;
- assign `user_id` on create/import;
- include `user_id` in every list, update, delete, and import query;
- reject unauthenticated requests before touching the database.

Until that owner-scoped schema exists, public API requests fail closed. Anonymous
public requests receive `401 authentication_required`; authenticated public
requests receive `403 owner_scope_required` so global records cannot be exposed
or modified.
