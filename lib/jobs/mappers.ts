import { DEFAULT_JOB_STATUS } from "./constants.ts";
import type { Job, JobPayload, PersistedJob } from "./types";
import { formatLocalDate } from "../local-date.ts";

export function createEmptyJob(date = new Date()): Omit<Job, "id"> {
  return {
    date: formatLocalDate(date),
    title: "",
    company: "",
    url: "",
    status: DEFAULT_JOB_STATUS,
    notes: "",
  };
}

export function mapPersistedJob(job: PersistedJob): Job {
  return {
    id: job.id,
    date: job.dateApplied,
    title: job.jobTitle,
    company: job.company,
    url: job.jobUrl,
    status: job.status,
    notes: job.notes,
  };
}

export function toJobPayload(job: Omit<Job, "id">): JobPayload {
  return {
    dateApplied: job.date,
    jobTitle: job.title,
    company: job.company,
    jobUrl: job.url,
    status: job.status,
    notes: job.notes,
  };
}
