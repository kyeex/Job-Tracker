"use client";

import { useCallback, useEffect, useState } from "react";
import { mapPersistedJob, toJobPayload } from "@/lib/jobs/mappers";
import type { Job, JobImportRecord, LoadState, Status } from "@/lib/jobs/types";

const loadFirestoreJobs = () => import("../lib/firestore-jobs");

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [savingStatusIds, setSavingStatusIds] = useState<Set<string>>(() => new Set());

  const loadJobs = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");

    try {
      const { listFirestoreJobs } = await loadFirestoreJobs();
      const data = await listFirestoreJobs();
      setJobs(data.map(mapPersistedJob));
      setLoadState("ready");
    } catch (error) {
      setJobs([]);
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : "Unable to load applications from Firestore.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadJobs());
  }, [loadJobs]);

  const addJob = useCallback(async (job: Omit<Job, "id">) => {
    const { createFirestoreJob } = await loadFirestoreJobs();
    const saved = mapPersistedJob(await createFirestoreJob(toJobPayload(job)));
    setJobs((items) => [saved, ...items]);
    return saved;
  }, []);

  const editJob = useCallback(async (id: string, job: Omit<Job, "id">) => {
    const { updateFirestoreJob } = await loadFirestoreJobs();
    const data = await updateFirestoreJob(id, toJobPayload(job));
    if (!data) {
      throw new Error("The application could not be found in Firestore.");
    }

    const saved = mapPersistedJob(data);
    setJobs((items) => items.map((item) => (item.id === id ? saved : item)));
    return saved;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setDeletingIds((current) => new Set(current).add(id));
    try {
      const { deleteFirestoreJob } = await loadFirestoreJobs();
      await deleteFirestoreJob(id);
      setJobs((items) => items.filter((job) => job.id !== id));
    } finally {
      setDeletingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const updateJobStatus = useCallback(
    async (job: Job, status: Status) => {
      if (job.status === status || savingStatusIds.has(job.id) || deletingIds.has(job.id)) {
        return null;
      }

      setSavingStatusIds((current) => new Set(current).add(job.id));
      try {
        const { updateFirestoreJob } = await loadFirestoreJobs();
        const data = await updateFirestoreJob(job.id, { status });
        if (!data) {
          throw new Error("The application could not be found in Firestore.");
        }

        const saved = mapPersistedJob(data);
        setJobs((items) => items.map((item) => (item.id === job.id ? saved : item)));
        return saved;
      } finally {
        setSavingStatusIds((current) => {
          const next = new Set(current);
          next.delete(job.id);
          return next;
        });
      }
    },
    [deletingIds, savingStatusIds],
  );

  const importJobs = useCallback(async (records: JobImportRecord[]) => {
    const { importFirestoreJobs, listFirestoreJobs } = await loadFirestoreJobs();
    const result = await importFirestoreJobs(records);
    const data = await listFirestoreJobs();
    setJobs(data.map(mapPersistedJob));
    return { result, jobs: data };
  }, []);

  return {
    jobs,
    setJobs,
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
