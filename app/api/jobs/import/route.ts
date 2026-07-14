import { importJobs, type JobImportRecord } from "@/db/jobs";
import { jsonError, jsonOk, readJson, validateJobPayload } from "../_shared";
import { requireJobsApiAccess } from "../_security";

export async function POST(request: Request) {
  const accessDenied = requireJobsApiAccess(request);
  if (accessDenied) return accessDenied;

  const payload = await readJson(request);
  if (payload === null) {
    return jsonError("bad_json", "Request body must be valid JSON.", 400);
  }

  const records = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { records?: unknown }).records)
      ? (payload as { records: unknown[] }).records
      : null;

  if (!records) {
    return jsonError("invalid_request", "Import body must be an array or an object with a records array.", 422, {
      records: "Records must be an array.",
    });
  }

  const jobs: JobImportRecord[] = [];
  const fields: Record<string, string> = {};

  records.forEach((record, index) => {
    const validation = validateJobPayload(record);
    if (validation.ok) {
      const source = record && typeof record === "object" ? record as Record<string, unknown> : {};
      jobs.push({
        ...validation.input,
        id: typeof source.id === "string" && source.id.trim() ? source.id.trim() : undefined,
        createdAt: typeof source.createdAt === "string" ? source.createdAt : undefined,
        updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
      });
      return;
    }

    Object.entries(validation.fields).forEach(([field, message]) => {
      fields[`records.${index}.${field}`] = message;
    });
  });

  if (Object.keys(fields).length > 0) {
    return jsonError("invalid_request", "Import contains invalid job applications.", 422, fields);
  }

  try {
    const result = await importJobs(jobs);
    return jsonOk(result, { status: 201 });
  } catch {
    return jsonError("server_error", "Unable to import job applications.", 500);
  }
}
