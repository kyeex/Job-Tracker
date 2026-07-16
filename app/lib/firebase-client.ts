"use client";

import { initializeApp, getApps, type FirebaseApp } from "@firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signOut,
  type Auth,
  type User,
} from "@firebase/auth";

type FirebaseClient = {
  app: FirebaseApp;
  auth: Auth;
};

let client: FirebaseClient | null = null;
let authEmulatorConnected = false;
let persistencePromise: Promise<void> | null = null;
let userInitializationPromise: Promise<User> | null = null;

export type FirebaseAuthSnapshot = {
  uid: string;
  displayName: string;
  email: string;
  isAnonymous: boolean;
};

export type GoogleConnectionResult = {
  user: FirebaseAuthSnapshot;
  accountChanged: boolean;
};

function toAuthSnapshot(user: User): FirebaseAuthSnapshot {
  return {
    uid: user.uid,
    displayName: user.displayName?.trim() ?? "",
    email: user.email?.trim() ?? "",
    isAnonymous: user.isAnonymous,
  };
}

function authErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

function canRecoverExistingGoogleAccount(error: unknown) {
  return ["auth/credential-already-in-use", "auth/email-already-in-use"].includes(authErrorCode(error));
}

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

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
    if (!authEmulatorConnected) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      authEmulatorConnected = true;
    }
  }

  client = { app, auth };
  return client;
}

function ensureLocalPersistence(auth: Auth) {
  if (!persistencePromise) {
    persistencePromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      persistencePromise = null;
      throw error;
    });
  }

  return persistencePromise;
}

function startAnonymousSession(auth: Auth) {
  if (!userInitializationPromise) {
    userInitializationPromise = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        userInitializationPromise = null;
      });
  }

  return userInitializationPromise;
}

export async function getFirebaseUser(): Promise<User> {
  const { auth } = getFirebaseClient();
  await ensureLocalPersistence(auth);

  if (auth.currentUser) {
    return auth.currentUser;
  }

  return startAnonymousSession(auth);
}

export function observeFirebaseUser(listener: (user: FirebaseAuthSnapshot | null) => void) {
  const { auth } = getFirebaseClient();
  return onAuthStateChanged(auth, (user) => listener(user ? toAuthSnapshot(user) : null));
}

export async function connectGoogleAccount(): Promise<GoogleConnectionResult> {
  const { auth } = getFirebaseClient();
  const currentUser = await getFirebaseUser();
  const previousUid = currentUser.uid;

  if (!currentUser.isAnonymous) {
    return { user: toAuthSnapshot(currentUser), accountChanged: false };
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const credential = await linkWithPopup(currentUser, provider);
    return { user: toAuthSnapshot(credential.user), accountChanged: false };
  } catch (error) {
    const googleCredential = GoogleAuthProvider.credentialFromError(error);
    if (!canRecoverExistingGoogleAccount(error) || !googleCredential) {
      throw error;
    }

    const credential = await signInWithCredential(auth, googleCredential);
    return {
      user: toAuthSnapshot(credential.user),
      accountChanged: credential.user.uid !== previousUid,
    };
  }
}

export async function signOutToGuestSession() {
  const { auth } = getFirebaseClient();
  await ensureLocalPersistence(auth);
  await signOut(auth);
  userInitializationPromise = null;
  return toAuthSnapshot(await startAnonymousSession(auth));
}

export function firebaseAuthErrorMessage(error: unknown) {
  switch (authErrorCode(error)) {
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled for this Firebase project yet.";
    case "auth/unauthorized-domain":
      return "This website domain is not authorized for Firebase sign-in.";
    case "auth/popup-blocked":
      return "The Google sign-in window was blocked. Allow popups and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Google sign-in could not reach Firebase. Check your connection and try again.";
    default:
      return error instanceof Error ? error.message : "Google sign-in could not be completed.";
  }
}
