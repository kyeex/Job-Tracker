import type { JobStatus } from "./types";

export const JOB_STATUSES = ["Applied", "Interview", "Offer", "Rejected"] as const;
export const DEFAULT_JOB_STATUS: JobStatus = "Applied";

export const JOB_FIELD_LIMITS = {
  title: 200,
  company: 200,
  url: 2048,
  notes: 10000,
} as const;

// Jobfolio intentionally keeps one user's complete history in memory so that
// filters, activity views, cumulative growth, backups, and exports agree.
// Reassess this personal-scale strategy when a user reaches this threshold.
export const PERSONAL_SCALE_APPLICATION_WARNING_THRESHOLD = 1_000;

export const EMPTY_COLUMN_FILTERS = {
  opportunity: "",
  date: "",
  status: "All",
  notes: "",
} as const;
