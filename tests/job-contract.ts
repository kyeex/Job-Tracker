import { DEFAULT_JOB_STATUS, JOB_FIELD_LIMITS, JOB_STATUSES } from "../lib/jobs/constants.ts";

export type JobContractCase = {
  name: string;
  payload: Record<string, unknown>;
  accepted: boolean;
};

export const canonicalJobPayload = {
  dateApplied: "2026-07-16",
  jobTitle: "Staff Engineer",
  company: "Acme Labs",
  jobUrl: "https://example.com/jobs/staff-engineer",
  status: DEFAULT_JOB_STATUS,
  notes: "Recruiter screen scheduled",
};

function replace(field: string, value: unknown) {
  return { ...canonicalJobPayload, [field]: value };
}

function urlWithLength(length: number) {
  const prefix = "https://example.com/";
  return `${prefix}${"a".repeat(length - prefix.length)}`;
}

export const jobContractCases: JobContractCase[] = [
  ...JOB_STATUSES.map((status) => ({
    name: `supported status: ${status}`,
    payload: replace("status", status),
    accepted: true,
  })),
  {
    name: "title at maximum length",
    payload: replace("jobTitle", "t".repeat(JOB_FIELD_LIMITS.title)),
    accepted: true,
  },
  {
    name: "title over maximum length",
    payload: replace("jobTitle", "t".repeat(JOB_FIELD_LIMITS.title + 1)),
    accepted: false,
  },
  {
    name: "company at maximum length",
    payload: replace("company", "c".repeat(JOB_FIELD_LIMITS.company)),
    accepted: true,
  },
  {
    name: "company over maximum length",
    payload: replace("company", "c".repeat(JOB_FIELD_LIMITS.company + 1)),
    accepted: false,
  },
  {
    name: "URL at maximum length",
    payload: replace("jobUrl", urlWithLength(JOB_FIELD_LIMITS.url)),
    accepted: true,
  },
  {
    name: "URL over maximum length",
    payload: replace("jobUrl", urlWithLength(JOB_FIELD_LIMITS.url + 1)),
    accepted: false,
  },
  {
    name: "blank optional URL",
    payload: replace("jobUrl", ""),
    accepted: true,
  },
  {
    name: "unsupported URL protocol",
    payload: replace("jobUrl", "ftp://example.com/job"),
    accepted: false,
  },
  {
    name: "notes at maximum length",
    payload: replace("notes", "n".repeat(JOB_FIELD_LIMITS.notes)),
    accepted: true,
  },
  {
    name: "notes over maximum length",
    payload: replace("notes", "n".repeat(JOB_FIELD_LIMITS.notes + 1)),
    accepted: false,
  },
  {
    name: "unsupported status",
    payload: replace("status", "Archived"),
    accepted: false,
  },
  {
    name: "normalizable application date",
    payload: replace("dateApplied", "2026-7-16"),
    accepted: true,
  },
  {
    name: "invalid application date",
    payload: replace("dateApplied", "not-a-date"),
    accepted: false,
  },
  {
    name: "blank required title",
    payload: replace("jobTitle", ""),
    accepted: false,
  },
  {
    name: "blank required company",
    payload: replace("company", ""),
    accepted: false,
  },
];
