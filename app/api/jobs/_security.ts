import { jsonError } from "./_shared";

const authenticatedUserEmailHeader = "oai-authenticated-user-email";

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function requestHostname(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const rawHost = forwardedHost?.split(",")[0]?.trim() || new URL(request.url).host;
  if (rawHost.startsWith("[")) {
    return rawHost.slice(1, rawHost.indexOf("]"));
  }

  return rawHost.split(":")[0] || "";
}

export function requireJobsApiAccess(request: Request) {
  const hostname = requestHostname(request);
  if (isLocalHostname(hostname)) {
    return null;
  }

  const email = request.headers.get(authenticatedUserEmailHeader);
  if (!email) {
    return jsonError(
      "authentication_required",
      "Authentication is required before accessing job records on a public deployment.",
      401,
    );
  }

  return jsonError(
    "owner_scope_required",
    "Public access is disabled until job records include a user owner and every query is scoped to that owner.",
    403,
  );
}
