"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mapPersistedJob, toJobPayload } from "@/lib/jobs/mappers";
import type { Job, JobImportRecord, LoadState, Status } from "@/lib/jobs/types";

const loadFirestoreJobs = () => import("../lib/firestore-jobs");

type UserJobStore = {
  ownerId: string | null;
  items: Job[];
};

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("Your Firebase session is still loading. Please try again.");
  }
}

export function useJobs(userId: string | null) {
  const [store, setStore] = useState<UserJobStore>({ ownerId: null, items: [] });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [savingStatusIds, setSavingStatusIds] = useState<Set<string>>(() => new Set());
  const activeUserIdRef = useRef(userId);

  const jobs = store.ownerId === userId ? store.items : [];

  useEffect(() => {
    activeUserIdRef.current = userId;
  }, [userId]);

  const updateUserJobs = useCallback((ownerId: string, update: (items: Job[]) => Job[]) => {
    if (activeUserIdRef.current !== ownerId) return;

    setStore((current) => ({
      ownerId,
      items: update(current.ownerId === ownerId ? current.items : []),
    }));
  }, []);

  const loadJobs = useCallback(async () => {
    if (!userId) {
      setLoadState("loading");
      setLoadError("");
      return;
    }

    const ownerId = userId;
    setLoadState("loading");
    setLoadError("");

    try {
      const { listFirestoreJobs } = await loadFirestoreJobs();
      const data = await listFirestoreJobs(ownerId);
      if (activeUserIdRef.current !== ownerId) return;

      setStore({ ownerId, items: data.map(mapPersistedJob) });
      setLoadState("ready");
    } catch (error) {
      if (activeUserIdRef.current !== ownerId) return;

      setStore({ ownerId, items: [] });
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : "Unable to load applications from Firestore.");
    }
  }, [userId]);

  useEffect(() => {
    queueMicrotask(() => void loadJobs());
  }, [loadJobs]);

  const addJob = useCallback(async (job: Omit<Job, "id">) => {
    requireUserId(userId);
    const ownerId = userId;
    const { createFirestoreJob } = await loadFirestoreJobs();
    const saved = mapPersistedJob(await createFirestoreJob(ownerId, toJobPayload(job)));
    updateUserJobs(ownerId, (items) => [saved, ...items]);
    return saved;
  }, [updateUserJobs, userId]);

  const editJob = useCallback(async (id: string, job: Omit<Job, "id">) => {
    requireUserId(userId);
    const ownerId = userId;
    const { updateFirestoreJob } = await loadFirestoreJobs();
    const data = await updateFirestoreJob(ownerId, id, toJobPayload(job));
    if (!data) {
      throw new Error("The application could not be found in Firestore.");
    }

    const saved = mapPersistedJob(data);
    updateUserJobs(ownerId, (items) => items.map((item) => (item.id === id ? saved : item)));
    return saved;
  }, [updateUserJobs, userId]);

  const deleteJob = useCallback(async (id: string) => {
    requireUserId(userId);
    const ownerId = userId;
    setDeletingIds((current) => new Set(current).add(id));
    try {
      const { deleteFirestoreJob } = await loadFirestoreJobs();
      await deleteFirestoreJob(ownerId, id);
      updateUserJobs(ownerId, (items) => items.filter((job) => job.id !== id));
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [updateUserJobs, userId]);

  const updateJobStatus = useCallback(
    async (job: Job, status: Status) => {
      requireUserId(userId);
      const ownerId = userId;
      if (job.status === status || savingStatusIds.has(job.id) || deletingIds.has(job.id)) {
        return null;
      }

      setSavingStatusIds((current) => new Set(current).add(job.id));
      try {
        const { updateFirestoreJob } = await loadFirestoreJobs();
        const data = await updateFirestoreJob(ownerId, job.id, { status });
        if (!data) {
          throw new Error("The application could not be found in Firestore.");
        }

        const saved = mapPersistedJob(data);
        updateUserJobs(ownerId, (items) => items.map((item) => (item.id === job.id ? saved : item)));
        return saved;
      } finally {
        setSavingStatusIds((current) => {
          const next = new Set(current);
          next.delete(job.id);
          return next;
        });
      }
    },
    [deletingIds, savingStatusIds, updateUserJobs, userId],
  );

  const importJobs = useCallback(async (records: JobImportRecord[]) => {
    requireUserId(userId);
    const ownerId = userId;
    const { importFirestoreJobs, listFirestoreJobs } = await loadFirestoreJobs();
    const result = await importFirestoreJobs(ownerId, records);
    const data = await listFirestoreJobs(ownerId);
    if (activeUserIdRef.current === ownerId) {
      setStore({ ownerId, items: data.map(mapPersistedJob) });
    }
    return { result, jobs: data };
  }, [userId]);

  return {
    jobs,
    loadState,
    loadError,
    loadJobs,
    deletingIds,
    savingStatusIds,
    addJob,
    editJob,
    deleteJob,
    updateJobStatus,
    importJobs,
  };
}
