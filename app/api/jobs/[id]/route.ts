import { deleteJob, updateJob } from "@/db/jobs";
import { validateJobPayload } from "@/lib/jobs/validation";
import { jsonError, jsonOk, readJson } from "../_shared";
import { requireJobsApiAccess } from "../_security";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function readId(context: RouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PATCH(request: Request, context: RouteContext) {
  const accessDenied = requireJobsApiAccess(request);
  if (accessDenied) return accessDenied;

  const id = await readId(context);
  if (!id) {
    return jsonError("invalid_request", "Job application id is required.", 400);
  }

  const payload = await readJson(request);
  if (payload === null) {
    return jsonError("bad_json", "Request body must be valid JSON.", 400);
  }

  const validation = validateJobPayload(payload, { partial: true });
  if (!validation.ok) {
    return jsonError("invalid_request", "Job application update is invalid.", 422, validation.fields);
  }

  try {
    const job = await updateJob(id, validation.input);
    if (!job) {
      return jsonError("not_found", "Job application was not found.", 404);
    }

    return jsonOk({ job });
  } catch {
    return jsonError("server_error", "Unable to update job application.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const accessDenied = requireJobsApiAccess(_request);
  if (accessDenied) return accessDenied;

  const id = await readId(context);
  if (!id) {
    return jsonError("invalid_request", "Job application id is required.", 400);
  }

  try {
    const deleted = await deleteJob(id);
    if (!deleted) {
      return jsonError("not_found", "Job application was not found.", 404);
    }

    return jsonOk({ deleted: true });
  } catch {
    return jsonError("server_error", "Unable to delete job application.", 500);
  }
}
