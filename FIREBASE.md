# Firebase setup

This repo is connected to Firebase project `job-tracker-a8bee` through `.firebaserc`.

## What is configured

- Firebase Hosting config in `firebase.json`
- Local Firebase emulators for Hosting, Auth, and Firestore
- Firestore security rules that scope job applications to the signed-in user
- Firestore composite indexes for common job-tracker filters and sorts

## Hosting note

The current app is built with `vinext`, Cloudflare Worker-style server output, and D1-backed API routes. Firebase Hosting can serve the generated static client assets from `dist/client`, but the job tracker will still need a Firebase-compatible backend before a public Firebase deployment can run the full CRUD experience.

Good next choices:

1. Keep the current D1/Sites deployment for the full app and use Firebase only for project scaffolding.
2. Move the app to Firebase Auth + Firestore, then deploy as a Firebase-first app.
3. Put the server app behind Firebase Hosting using a Firebase-supported backend such as Cloud Run, then replace or bridge D1 persistence.

## Useful commands

```bash
npm run build
npx firebase-tools emulators:start --project job-tracker-a8bee
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project job-tracker-a8bee
npx firebase-tools deploy --only hosting --project job-tracker-a8bee
```

Do not use the Hosting deploy as the final production path until the backend/database decision above is complete.
