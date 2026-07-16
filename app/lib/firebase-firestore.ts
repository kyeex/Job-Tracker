"use client";

import { connectFirestoreEmulator, getFirestore, type Firestore } from "@firebase/firestore";
import { getFirebaseClient } from "./firebase-client";

let firestore: Firestore | null = null;
let emulatorConnected = false;

export function getFirebaseFirestore() {
  if (firestore) {
    return firestore;
  }

  firestore = getFirestore(getFirebaseClient().app);

  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" && !emulatorConnected) {
    connectFirestoreEmulator(firestore, "localhost", 8080);
    emulatorConnected = true;
  }

  return firestore;
}
