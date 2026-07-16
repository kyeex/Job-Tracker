"use client";

import { useCallback, useEffect, useState } from "react";
import {
  connectGoogleAccount,
  firebaseAuthErrorMessage,
  getFirebaseUser,
  observeFirebaseUser,
  signOutToGuestSession,
  type FirebaseAuthSnapshot,
} from "../lib/firebase-client";

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseAuthSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribe = () => undefined;
    let active = true;

    queueMicrotask(() => {
      if (!active) return;

      try {
        unsubscribe = observeFirebaseUser((nextUser) => {
          if (!active) return;
          setUser(nextUser);
          if (nextUser) setState("ready");
        });
        void getFirebaseUser().catch((authError) => {
          if (!active) return;
          setError(firebaseAuthErrorMessage(authError));
          setState("error");
        });
      } catch (authError) {
        setError(firebaseAuthErrorMessage(authError));
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
      const result = await connectGoogleAccount();
      setUser(result.user);
      setState("ready");
      return result;
    } catch (authError) {
      const message = firebaseAuthErrorMessage(authError);
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
      const nextUser = await signOutToGuestSession();
      setUser(nextUser);
      setState("ready");
      return nextUser;
    } catch (authError) {
      const message = firebaseAuthErrorMessage(authError);
      setError(message);
      throw new Error(message);
    } finally {
      setBusy(false);
    }
  }, []);

  return { user, state, busy, error, connectGoogle, continueAsGuest };
}
