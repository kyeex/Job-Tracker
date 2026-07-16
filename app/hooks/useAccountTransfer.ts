"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FirebaseAuthSnapshot } from "../lib/firebase-client";
import type { Job, JobImportRecord } from "@/lib/jobs/types";
import {
  clearAuthTransfer,
  createAuthTransferRecords,
  readAuthTransfer,
  saveAuthTransfer,
} from "../lib/auth-transfer";

type Options = {
  jobs: Job[];
  user: FirebaseAuthSnapshot | null;
  connectGoogle: () => Promise<unknown>;
  continueAsGuest: () => Promise<unknown>;
  importJobs: (records: JobImportRecord[]) => Promise<unknown>;
  showToast: (message: string) => void;
};

export function useAccountTransfer({
  jobs,
  user,
  connectGoogle,
  continueAsGuest,
  importJobs,
  showToast,
}: Options) {
  const transferPromise = useRef<Promise<number> | null>(null);

  const restoreAuthTransfer = useCallback(() => {
    if (transferPromise.current) return transferPromise.current;

    const records = readAuthTransfer();
    if (!records.length) return Promise.resolve(0);

    const restore = importJobs(records)
      .then(() => {
        clearAuthTransfer();
        return records.length;
      })
      .finally(() => {
        transferPromise.current = null;
      });
    transferPromise.current = restore;
    return restore;
  }, [importJobs]);

  useEffect(() => {
    if (!user || user.isAnonymous) return;

    void restoreAuthTransfer()
      .then((restored) => {
        if (restored) showToast(`${restored} applications restored to your Google account`);
      })
      .catch(() => undefined);
  }, [restoreAuthTransfer, showToast, user]);

  const connectGoogleAccount = useCallback(async () => {
    saveAuthTransfer(createAuthTransferRecords(jobs));

    try {
      await connectGoogle();
      showToast("Google account connected. Your applications are now recoverable.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Google account connection failed.");
    }
  }, [connectGoogle, jobs, showToast]);

  const signOutAccount = useCallback(async () => {
    try {
      await continueAsGuest();
      showToast("Signed out. This guest session starts with a separate application list.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The account could not be signed out.");
    }
  }, [continueAsGuest, showToast]);

  return { connectGoogleAccount, signOutAccount };
}
