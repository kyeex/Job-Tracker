import { DEFAULT_JOB_STATUS } from "./constants";
import type { ApiJob, DbJobApplication, Job, JobApplicationRow, JobInput, JobPayload } from "./types";

export const emptyJob: Omit<Job, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  company: "",
  url: "",
  status: DEFAULT_JOB_STATUS,
  notes: "",
};

export function mapApiJob(job: ApiJob): Job {
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

export function mapJobRow(row: JobApplicationRow): DbJobApplication {
  return {
    id: row.id,
    dateApplied: row.date_applied,
    jobTitle: row.job_title,
    company: row.company,
    jobUrl: row.job_url,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeJobInput(input: JobInput) {
  return {
    dateApplied: input.dateApplied,
    jobTitle: input.jobTitle.trim(),
    company: input.company.trim(),
    jobUrl: input.jobUrl?.trim() ?? "",
    status: input.status ?? DEFAULT_JOB_STATUS,
    notes: input.notes?.trim() ?? "",
  };
}
