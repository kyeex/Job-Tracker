"use client";

import { useCallback, useEffect, useState } from "react";
import type { FirebaseAuthSnapshot } from "../lib/firebase-client";

const loadFirebaseClient = () => import("../lib/firebase-client");

async function getFirebaseAuthErrorMessage(error: unknown) {
  const { firebaseAuthErrorMessage } = await loadFirebaseClient();
  return firebaseAuthErrorMessage(error);
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseAuthSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => undefined;
    let active = true;

    queueMicrotask(async () => {
      if (!active) return;

      try {
        const { getFirebaseUser, observeFirebaseUser } = await loadFirebaseClient();
        if (!active) return;

        unsubscribe = observeFirebaseUser((nextUser) => {
          if (!active) return;
          setUser(nextUser);
          if (nextUser) setState("ready");
        });
        void getFirebaseUser().catch((authError) => {
          if (!active) return;
          void getFirebaseAuthErrorMessage(authError).then((message) => {
            if (!active) return;
            setError(message);
            setState("error");
          });
        });
      } catch (authError) {
        if (!active) return;
        setError(await getFirebaseAuthErrorMessage(authError));
        setState("error");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const connectGoogle = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { connectGoogleAccount } = await loadFirebaseClient();
      const result = await connectGoogleAccount();
      setUser(result.user);
      setState("ready");
      return result;
    } catch (authError) {
      const message = await getFirebaseAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, []);

  const continueAsGuest = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const { signOutToGuestSession } = await loadFirebaseClient();
      const nextUser = await signOutToGuestSession();
      setUser(nextUser);
      setState("ready");
      return nextUser;
    } catch (authError) {
      const message = await getFirebaseAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { user, state, busy, error, connectGoogle, continueAsGuest };
}
