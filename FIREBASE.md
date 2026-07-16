# Firebase setup

This repo is connected to Firebase project `job-tracker-a8bee` through `.firebaserc`.

## What is configured

- Firebase Hosting config in `firebase.json`
- Local Firebase emulators for Hosting, Auth, and Firestore
- Recoverable Google sign-in, with anonymous sessions used only as a temporary guest bridge
- Firestore security rules that scope job applications to the signed-in user
- Firestore composite indexes for common job-tracker filters and sorts

## Architecture decision

The selected target architecture is **Firebase Auth + Cloud Firestore**.

The browser app uses Firebase Auth + Firestore for all job application reads and writes. The retired D1 routes, schema, and migrations have been removed.

Firestore documents should live at:

```text
users/{userId}/jobApplications/{applicationId}
```

The checked-in Firestore rules already enforce user ownership for that path.

Application imports are validated in full before writing, use deterministic document IDs when a source ID is missing, and commit in batches of 400 writes. A partially completed import can therefore be retried without creating duplicate applications; existing documents retain their original `createdAt` timestamp.

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

In Firebase Console → Authentication → Sign-in method, enable both:

- **Google**, which is the recoverable account used across browsers and devices
- **Anonymous**, which lets a first-time visitor create applications before connecting Google

When Google is connected, the app first links the temporary anonymous user so its Firebase UID and records are preserved. If that Google account already exists, the app signs into it and imports the temporary records using stable application IDs. A local transfer backup remains available until the import succeeds.

## Hosting note

Firebase Hosting can serve the generated static client assets from `dist/client`. The full CRUD experience depends on the Firebase Web App environment values and Firebase Auth/Firestore being enabled.

## Useful commands

```bash
npm run build
npm run test:components
npm run test:firebase
npm run test:all
npx firebase-tools emulators:start --project job-tracker-a8bee
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project job-tracker-a8bee
npx firebase-tools deploy --only hosting --project job-tracker-a8bee
```

`npm run test:firebase` starts an isolated Firestore emulator, loads the checked-in rules, runs the ownership and validation tests, and shuts the emulator down. It requires Java 11 or newer and never reads or writes production Firestore data. `npm run test:all` runs the build, unit tests, behavioral component tests, and emulator integration tests together.

Do not use the Hosting deploy as the final production path until the Firebase environment values are configured in the hosting environment and the Firestore path is smoke-tested.
