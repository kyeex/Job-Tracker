# Security Decision

This tracker is moving toward a Firebase Auth + Cloud Firestore production
architecture.

During the transition, localhost API requests are allowed so the app remains
usable for personal D1 development. Public or non-local API requests are blocked
by default in `app/api/jobs/_security.ts`.

The target production security model is:

- Firebase Auth establishes the signed-in user.
- Firestore stores job records under
  `users/{userId}/jobApplications/{applicationId}`.
- Firestore Security Rules allow access only when
  `request.auth.uid == userId`.
- Anonymous requests cannot read, create, update, delete, export, or import job
  records.

Until the Firestore read/write path replaces D1, public API requests fail
closed. Anonymous public requests receive `401 authentication_required`;
authenticated public requests receive `403 owner_scope_required` so global D1
records cannot be exposed or modified.
