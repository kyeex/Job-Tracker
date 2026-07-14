# Security Decision

This tracker is moving toward a Firebase Auth + Cloud Firestore production
architecture.

During the transition, the browser app uses Firebase Auth + Firestore for job
records. Localhost D1 API requests are still allowed only so legacy/transitional
D1 development remains possible. Public or non-local API requests are blocked by
default in `app/api/jobs/_security.ts`.

The target production security model is:

- Firebase Auth establishes the signed-in user.
- Firestore stores job records under
  `users/{userId}/jobApplications/{applicationId}`.
- Firestore Security Rules allow access only when
  `request.auth.uid == userId`.
- Anonymous requests cannot read, create, update, delete, export, or import job
  records.

Until the D1 API routes are removed, public API requests fail closed. Anonymous
public requests receive `401 authentication_required`; authenticated public
requests receive `403 owner_scope_required` so global D1 records cannot be
exposed or modified.
