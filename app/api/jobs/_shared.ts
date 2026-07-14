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
