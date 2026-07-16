import { DEFAULT_JOB_STATUS, JOB_FIELD_LIMITS, JOB_STATUSES } from "./constants.ts";
import type { JobPayload, JobStatus, JobUpdateInput } from "./types";
import { formatLocalDate } from "../local-date.ts";

type ValidationFailure = {
  ok: false;
  fields: Record<string, string>;
};

type JobValidationSuccess = {
  ok: true;
  input: JobPayload;
};

type JobUpdateValidationSuccess = {
  ok: true;
  input: JobUpdateInput;
};

export class JobValidationError extends Error {
  readonly fields: Record<string, string>;

  constructor(fields: Record<string, string>, context = "Job application") {
    const details = Object.values(fields).join(" ");
    super(`${context} is invalid.${details ? ` ${details}` : ""}`);
    this.name = "JobValidationError";
    this.fields = fields;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown) {
  const raw = readString(value);
  if (!raw) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const parsed = new Date(`${raw}T00:00:00.000Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() + 1 !== month ||
      parsed.getUTCDate() !== day
    ) {
      return "";
    }

    return raw;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : formatLocalDate(parsed);
}

function normalizeUrl(value: unknown, fields: Record<string, string>) {
  const raw = readString(value);
  if (!raw) {
    return "";
  }

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) {
      fields.jobUrl = "Job URL must use http or https.";
      return "";
    }

    const normalized = url.toString();
    if (normalized.length > JOB_FIELD_LIMITS.url) {
      fields.jobUrl = `Job URL must be ${JOB_FIELD_LIMITS.url} characters or fewer.`;
      return "";
    }

    return normalized;
  } catch {
    fields.jobUrl = "Job URL must be a valid URL.";
    return "";
  }
}

function normalizeStatus(value: unknown, fields: Record<string, string>) {
  const raw = readString(value);
  if (!raw) {
    return undefined;
  }

  if (!JOB_STATUSES.includes(raw as JobStatus)) {
    fields.status = `Status must be one of: ${JOB_STATUSES.join(", ")}.`;
    return undefined;
  }

  return raw as JobStatus;
}

export function validateJobPayload(payload: unknown): JobValidationSuccess | ValidationFailure;
export function validateJobPayload(
  payload: unknown,
  options: { partial: true },
): JobUpdateValidationSuccess | ValidationFailure;
export function validateJobPayload(
  payload: unknown,
  options?: { partial?: false },
): JobValidationSuccess | ValidationFailure;
export function validateJobPayload(payload: unknown, options: { partial?: boolean } = {}) {
  const fields: Record<string, string> = {};
  const record = asRecord(payload);

  if (!record) {
    return {
      ok: false as const,
      fields: { body: "Request body must be a JSON object." },
    };
  }

  const partial = options.partial ?? false;
  const dateApplied = normalizeDate(record.dateApplied ?? record.date_applied ?? record.date);
  const jobTitle = readString(record.jobTitle ?? record.job_title ?? record.title);
  const company = readString(record.company);
  const jobUrl = normalizeUrl(record.jobUrl ?? record.job_url ?? record.url, fields);
  const status = normalizeStatus(record.status, fields);
  const notes = readString(record.notes);
  const hasStatus = "status" in record;

  if (!partial || "dateApplied" in record || "date_applied" in record || "date" in record) {
    if (!dateApplied) {
      fields.dateApplied = "Date applied must be a valid date.";
    }
  }

  if (!partial || "jobTitle" in record || "job_title" in record || "title" in record) {
    if (!jobTitle) {
      fields.jobTitle = "Job title is required.";
    } else if (jobTitle.length > JOB_FIELD_LIMITS.title) {
      fields.jobTitle = `Job title must be ${JOB_FIELD_LIMITS.title} characters or fewer.`;
    }
  }

  if (!partial || "company" in record) {
    if (!company) {
      fields.company = "Company is required.";
    } else if (company.length > JOB_FIELD_LIMITS.company) {
      fields.company = `Company must be ${JOB_FIELD_LIMITS.company} characters or fewer.`;
    }
  }

  if (notes.length > JOB_FIELD_LIMITS.notes) {
    fields.notes = `Notes must be ${JOB_FIELD_LIMITS.notes} characters or fewer.`;
  }

  if (partial && hasStatus && !status && !fields.status) {
    fields.status = `Status must be one of: ${JOB_STATUSES.join(", ")}.`;
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false as const, fields };
  }

  const input: JobUpdateInput = {};
  if (dateApplied) input.dateApplied = dateApplied;
  if (jobTitle) input.jobTitle = jobTitle;
  if (company) input.company = company;
  if (jobUrl || "jobUrl" in record || "job_url" in record || "url" in record) input.jobUrl = jobUrl;
  if (status) input.status = status;
  if (notes || "notes" in record) input.notes = notes;

  if (!partial) {
    return {
      ok: true as const,
      input: {
        dateApplied,
        jobTitle,
        company,
        jobUrl,
        status: input.status ?? DEFAULT_JOB_STATUS,
        notes,
      },
    };
  }

  return { ok: true as const, input };
}

export function requireValidJobInput(payload: unknown, context?: string): JobPayload {
  const validation = validateJobPayload(payload);
  if (!validation.ok) {
    throw new JobValidationError(validation.fields, context);
  }

  return validation.input;
}

export function requireValidJobUpdate(payload: unknown, context?: string): JobUpdateInput {
  const validation = validateJobPayload(payload, { partial: true });
  if (!validation.ok) {
    throw new JobValidationError(validation.fields, context);
  }

  return validation.input;
}
