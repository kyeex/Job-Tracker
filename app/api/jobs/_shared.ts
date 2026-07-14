import type { JobInput, JobStatus, JobUpdateInput } from "@/db/jobs";

export type ApiErrorCode =
  | "bad_json"
  | "invalid_request"
  | "not_found"
  | "authentication_required"
  | "owner_scope_required"
  | "server_error";

export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
    fields?: Record<string, string>;
  };
};

const statuses: JobStatus[] = ["Applied", "Interview", "Offer", "Rejected"];
const maxUrlLength = 2048;
const maxNotesLength = 10000;
const maxTitleLength = 200;
const maxCompanyLength = 200;

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  fields?: Record<string, string>,
) {
  const body: ApiError = { error: { code, message } };
  if (fields && Object.keys(fields).length > 0) {
    body.error.fields = fields;
  }

  return Response.json(body, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
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
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
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
    if (normalized.length > maxUrlLength) {
      fields.jobUrl = `Job URL must be ${maxUrlLength} characters or fewer.`;
      return "";
    }

    return normalized;
  } catch {
    fields.jobUrl = "Job URL must be a valid URL.";
    return "";
  }
}

function normalizeStatus(value: unknown, fields: Record<string, string>, required: boolean) {
  const raw = readString(value);
  if (!raw) {
    if (required) {
      fields.status = "Status is required.";
    }

    return undefined;
  }

  if (!statuses.includes(raw as JobStatus)) {
    fields.status = `Status must be one of: ${statuses.join(", ")}.`;
    return undefined;
  }

  return raw as JobStatus;
}

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
  const status = normalizeStatus(record.status, fields, false);
  const notes = readString(record.notes);

  if (!partial || "dateApplied" in record || "date_applied" in record || "date" in record) {
    if (!dateApplied) {
      fields.dateApplied = "Date applied must be a valid date.";
    }
  }

  if (!partial || "jobTitle" in record || "job_title" in record || "title" in record) {
    if (!jobTitle) {
      fields.jobTitle = "Job title is required.";
    } else if (jobTitle.length > maxTitleLength) {
      fields.jobTitle = `Job title must be ${maxTitleLength} characters or fewer.`;
    }
  }

  if (!partial || "company" in record) {
    if (!company) {
      fields.company = "Company is required.";
    } else if (company.length > maxCompanyLength) {
      fields.company = `Company must be ${maxCompanyLength} characters or fewer.`;
    }
  }

  if (notes.length > maxNotesLength) {
    fields.notes = `Notes must be ${maxNotesLength} characters or fewer.`;
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
        dateApplied: input.dateApplied,
        jobTitle: input.jobTitle,
        company: input.company,
        jobUrl: input.jobUrl ?? "",
        status: input.status ?? "Applied",
        notes: input.notes ?? "",
      } as JobInput,
    };
  }

  return { ok: true as const, input };
}
