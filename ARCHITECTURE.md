# Deployment and runtime architecture

## Decision

The target production architecture for Jobfolio is **Firebase Auth + Cloud Firestore**.

The existing Cloudflare D1 implementation is now considered a transitional data layer. The browser app's active read/write path is Firebase Auth + Firestore. D1 should remain in place only until existing browser/D1 records are migrated into Firestore and the old API/database code is removed.

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

Anonymous production access should not be able to read, create, update, delete, export, or import job records.

## Migration strategy

1. Add Firebase client initialization and Auth UI/state.
2. Add a Firestore repository behind the existing job operations contract.
3. Switch the UI read path from `/api/jobs`/D1 to Firebase Auth + Firestore.
4. Switch the write path to Firestore.
5. Build a one-time import flow from existing local/D1 records into `users/{userId}/jobApplications`.
6. Verify filters, sorting, heat map, dashboard totals, backup export, and XLSX export against Firestore data.
7. Remove D1-specific API routes, schema, migrations, and `.openai/hosting.json` D1 binding after the Firestore path is proven.

## Current transitional state

- Firebase project: `job-tracker-a8bee`
- Firebase Hosting/Auth/Firestore emulator config exists in `firebase.json`
- Firestore rules and indexes are version-controlled
- The UI uses Firebase Auth + Firestore for job reads and writes
- D1-backed `/api/jobs` routes still exist as transitional code
- D1 should not be treated as the long-term production database

## Deployment target

The long-term deployment target is Firebase-first:

- Firebase Hosting for the web app shell
- Firebase Auth for sign-in
- Cloud Firestore for persistence
- Firestore Security Rules for owner-scoped access control

If server-side rendering or API endpoints remain necessary after the Firestore migration, add a Firebase-supported backend such as Cloud Run or Cloud Functions. Do not keep D1 as the production source of truth.
