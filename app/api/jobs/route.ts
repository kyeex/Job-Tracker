import { createJob, listJobs } from "@/db/jobs";
import { validateJobPayload } from "@/lib/jobs/validation";
import { jsonError, jsonOk, readJson } from "./_shared";
import { requireJobsApiAccess } from "./_security";

export async function GET(request: Request) {
  const accessDenied = requireJobsApiAccess(request);
  if (accessDenied) return accessDenied;

  try {
    const jobs = await listJobs();
    return jsonOk({ jobs });
  } catch {
    return jsonError("server_error", "Unable to load job applications.", 500);
  }
}

export async function POST(request: Request) {
  const accessDenied = requireJobsApiAccess(request);
  if (accessDenied) return accessDenied;

  const payload = await readJson(request);
  if (payload === null) {
    return jsonError("bad_json", "Request body must be valid JSON.", 400);
  }

  const validation = validateJobPayload(payload);
  if (!validation.ok) {
    return jsonError("invalid_request", "Job application is invalid.", 422, validation.fields);
  }

  try {
    const job = await createJob(validation.input);
    return jsonOk({ job }, { status: 201 });
  } catch {
    return jsonError("server_error", "Unable to create job application.", 500);
  }
}
