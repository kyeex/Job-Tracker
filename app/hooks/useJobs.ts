"use client";

import { useCallback, useEffect, useState } from "react";
import { mapApiJob, toJobPayload } from "@/lib/jobs/mappers";
import type { ApiJob, Job, LoadState, Status } from "@/lib/jobs/types";
import { apiRequest } from "../lib/api-client";

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
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || "Unable to load applications.");
      }

      if (!Array.isArray(data.jobs)) {
        throw new Error("The application list was not returned correctly.");
      }

      setJobs(data.jobs.map(mapApiJob));
      setLoadState("ready");
    } catch (error) {
      setJobs([]);
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : "Unable to load applications.");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadJobs());
  }, [loadJobs]);

  const addJob = useCallback(async (job: Omit<Job, "id">) => {
    const data = await apiRequest<{ job: ApiJob }>("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toJobPayload(job)),
    });
    const saved = mapApiJob(data.job);
    setJobs((items) => [saved, ...items]);
    return saved;
  }, []);

  const editJob = useCallback(async (id: string, job: Omit<Job, "id">) => {
    const data = await apiRequest<{ job: ApiJob }>(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toJobPayload(job)),
    });
    const saved = mapApiJob(data.job);
    setJobs((items) => items.map((item) => (item.id === id ? saved : item)));
    return saved;
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    setDeletingIds((current) => new Set(current).add(id));
    try {
      await apiRequest<{ deleted: true }>(`/api/jobs/${id}`, { method: "DELETE" });
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
        const data = await apiRequest<{ job: ApiJob }>(`/api/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const saved = mapApiJob(data.job);
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
  };
}
