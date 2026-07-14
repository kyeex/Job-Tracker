"use client";

import { initializeApp, getApps, type FirebaseApp } from "@firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from "@firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "@firebase/firestore";

type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let client: FirebaseClient | null = null;
let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function readFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `Firebase is not configured. Add ${missing
        .map((key) => `NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`)
        .join(", ")} to your local .env file.`,
    );
  }

  return config as {
    apiKey: string;
    authDomain: string;
    projectId: string;
    appId: string;
  };
}

export function getFirebaseClient() {
  if (client) {
    return client;
  }

  const app = getApps()[0] ?? initializeApp(readFirebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    if (!authEmulatorConnected) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      authEmulatorConnected = true;
    }

    if (!firestoreEmulatorConnected) {
      connectFirestoreEmulator(db, "localhost", 8080);
      firestoreEmulatorConnected = true;
    }
  }

  client = { app, auth, db };
  return client;
}

export async function getFirebaseUser(): Promise<User> {
  const { auth } = getFirebaseClient();
  await setPersistence(auth, browserLocalPersistence);

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}
