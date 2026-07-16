import type { FirebaseAuthSnapshot } from "../lib/firebase-client";

type Props = {
  user: FirebaseAuthSnapshot | null;
  state: "loading" | "ready" | "error";
  busy: boolean;
  error: string;
  onConnect: () => void;
  onSignOut: () => void;
};

export function AccountControl({ user, state, busy, error, onConnect, onSignOut }: Props) {
  const hasAccount = Boolean(user && !user.isAnonymous);
  const accountName = user?.displayName || user?.email || "Google account";

  return (
    <div className={`accountControl ${hasAccount ? "accountConnected" : ""}`} title={error || undefined}>
      <span className="accountAvatar" aria-hidden="true">
        {hasAccount ? accountName.slice(0, 1).toUpperCase() : "♙"}
      </span>
      <span className="accountCopy">
        <strong>{state === "loading" ? "Connecting…" : hasAccount ? accountName : "Guest session"}</strong>
        <small>{hasAccount ? "Applications recoverable" : error || "Secure your applications"}</small>
      </span>
      <button
        type="button"
        disabled={busy || state === "loading"}
        onClick={hasAccount ? onSignOut : onConnect}
        aria-label={hasAccount ? `Sign out of ${accountName}` : "Connect a Google account"}
      >
        {busy ? "Please wait" : hasAccount ? "Sign out" : "Connect Google"}
      </button>
    </div>
  );
}
