import type { JOB_STATUSES } from "./constants";

export type JobStatus = (typeof JOB_STATUSES)[number];
export type Status = JobStatus;

export type Job = {
  id: string;
  date: string;
  title: string;
  company: string;
  url: string;
  status: JobStatus;
  notes: string;
};

export type ApiJob = {
  id: string;
  dateApplied: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: JobStatus;
  notes: string;
};

export type DbJobApplication = ApiJob & {
  createdAt: string;
  updatedAt: string;
};

export type JobPayload = {
  dateApplied: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: JobStatus;
  notes: string;
};

export type JobInput = {
  dateApplied: string;
  jobTitle: string;
  company: string;
  jobUrl?: string;
  status?: JobStatus;
  notes?: string;
};

export type JobUpdateInput = Partial<JobInput>;

export type JobImportRecord = JobInput & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobApplicationRow = {
  id: string;
  date_applied: string;
  job_title: string;
  company: string;
  job_url: string;
  status: JobStatus;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type MigrationRecord = JobPayload & { id: string };
export type SortKey = "opportunity" | "date" | "status" | "notes";
export type LoadState = "loading" | "ready" | "error";

export type MigrationState = {
  status: "hidden" | "available" | "importing" | "complete" | "error";
  count: number;
  error?: string;
};

export type ColumnFilters = {
  opportunity: string;
  date: string;
  status: JobStatus | "All";
  notes: string;
};
