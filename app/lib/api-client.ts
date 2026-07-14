function formatApiError(body: unknown, fallback: string) {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = (body as { error?: { message?: unknown; fields?: Record<string, string> } }).error;
  if (!error) {
    return fallback;
  }

  const fieldMessages = error.fields ? Object.values(error.fields).filter(Boolean) : [];
  return [typeof error.message === "string" ? error.message : fallback, ...fieldMessages].join(" ");
}

export async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatApiError(body, "The database could not save this change."));
  }

  return body as T;
}
