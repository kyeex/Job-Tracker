# Deployment and runtime architecture

## Decision

The production architecture for Jobfolio is **Firebase Auth + Cloud Firestore**. Firestore is the only application data store.

## Target runtime

```text
Browser app
  ├─ Firebase Auth
  │   └─ establishes the signed-in user
  └─ Cloud Firestore
      └─ stores user-scoped job application documents
```

## Target data model

Firestore should store applications under the authenticated user:

```text
users/{userId}/jobApplications/{applicationId}
```

Each job application document should preserve the current domain contract:

- `dateApplied`
- `jobTitle`
- `company`
- `jobUrl`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

The existing centralized domain files in `lib/jobs/` remain the app-level source of truth for statuses, field limits, mapping, and validation.

## Security model

All Firestore reads and writes must be scoped to the authenticated Firebase user. The checked-in Firestore rules enforce that only `request.auth.uid == userId` can read or mutate a user's job application documents.

Google sign-in is the recoverable production identity. Anonymous authentication is a temporary guest bridge so a user can begin tracking before connecting Google. The connection flow links the anonymous identity when possible and transfers records through a verified local backup when the Google identity already exists.

## Current state

- Firebase project: `job-tracker-a8bee`
- Firebase Hosting/Auth/Firestore emulator config exists in `firebase.json`
- Firestore rules and indexes are version-controlled
- The UI uses Firebase Auth + Firestore for job reads and writes
- Firestore is the only persistence implementation
- Browser-local and account-transfer imports write directly through the Firestore repository

## Personal-scale collection loading

Jobfolio intentionally loads the authenticated user's complete application collection. This is an explicit personal-use constraint, not server-side pagination: the table paginates only what is rendered, while filters, sorting, dashboard totals, the heat map, growth tree, backup, and exports operate on the same complete in-memory history.

The repository names this operation `listAll()` to keep that cost visible. At 1,000 applications the UI displays a scale notice. This is a review threshold rather than a hard record limit; writes and reads continue to work.

Revisit this decision before supporting team accounts, routinely exceeding the threshold, or when measured startup latency and Firestore read cost become unacceptable. The replacement should combine cursor-based queries with server-derived aggregates and a streaming or server-side export path so pagination does not make totals or exports incomplete.

## Deployment target

The long-term deployment target is Firebase-first:

- Firebase Hosting for the web app shell
- Firebase Auth for sign-in
- Cloud Firestore for persistence
- Firestore Security Rules for owner-scoped access control

If server-side APIs become necessary, add a Firebase-supported backend such as Cloud Run or Cloud Functions while retaining Firestore as the source of truth.
