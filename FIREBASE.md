# Firebase setup

This repo is connected to Firebase project `job-tracker-a8bee` through `.firebaserc`.

## What is configured

- Firebase Hosting config in `firebase.json`
- Local Firebase emulators for Hosting, Auth, and Firestore
- Firestore security rules that scope job applications to the signed-in user
- Firestore composite indexes for common job-tracker filters and sorts

## Architecture decision

The selected target architecture is **Firebase Auth + Cloud Firestore**.

The browser app now uses Firebase Auth + Firestore for job application reads and writes. The current D1-backed API routes are transitional and should be removed after the Firestore path is verified and existing records are migrated.

Firestore documents should live at:

```text
users/{userId}/jobApplications/{applicationId}
```

The checked-in Firestore rules already enforce user ownership for that path.

## Required local environment

Create `.env.local` from `.env.example` and fill in the Firebase Web App values from the Firebase console:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

For the current anonymous-auth flow, enable Anonymous sign-in in Firebase Auth or use the Auth emulator.

## Hosting note

Firebase Hosting can serve the generated static client assets from `dist/client`. The full CRUD experience depends on the Firebase Web App environment values and Firebase Auth/Firestore being enabled.

## Useful commands

```bash
npm run build
npx firebase-tools emulators:start --project job-tracker-a8bee
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project job-tracker-a8bee
npx firebase-tools deploy --only hosting --project job-tracker-a8bee
```

Do not use the Hosting deploy as the final production path until the Firebase environment values are configured in the hosting environment and the Firestore path is smoke-tested.
