# Security Decision

This tracker uses a Firebase Auth + Cloud Firestore production architecture.

The target production security model is:

- Firebase Auth establishes the signed-in user.
- Firestore stores job records under
  `users/{userId}/jobApplications/{applicationId}`.
- Firestore Security Rules allow access only when
  `request.auth.uid == userId`.
- Firestore validates the job document shape, supported statuses, field limits,
  timestamps, and ownership before accepting writes.
- Anonymous authentication is a temporary owner-scoped guest identity. Google
  sign-in provides the recoverable identity used across browsers and devices.
