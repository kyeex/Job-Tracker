# Firebase setup

This repo is connected to Firebase project `job-tracker-a8bee` through `.firebaserc`.

## What is configured

- Firebase Hosting config in `firebase.json`
- Local Firebase emulators for Hosting, Auth, and Firestore
- Firestore security rules that scope job applications to the signed-in user
- Firestore composite indexes for common job-tracker filters and sorts

## Architecture decision

The selected target architecture is **Firebase Auth + Cloud Firestore**.

The current D1-backed API routes are transitional. The next implementation passes should migrate the app's read/write paths to Firebase Auth + Firestore and then remove the D1-specific API/database layer after verification.

Firestore documents should live at:

```text
users/{userId}/jobApplications/{applicationId}
```

The checked-in Firestore rules already enforce user ownership for that path.

## Hosting note

Firebase Hosting can serve the generated static client assets from `dist/client`. The full CRUD experience should not be considered production-ready on Firebase until the app's data layer uses Firebase Auth + Firestore.

## Useful commands

```bash
npm run build
npx firebase-tools emulators:start --project job-tracker-a8bee
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project job-tracker-a8bee
npx firebase-tools deploy --only hosting --project job-tracker-a8bee
```

Do not use the Hosting deploy as the final production path until the Firebase Auth + Firestore read/write migration is complete.
