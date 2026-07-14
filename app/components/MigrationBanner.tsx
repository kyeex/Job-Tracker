import type { MigrationState } from "@/lib/jobs/types";

export function MigrationBanner({
  migration,
  onImport,
}: {
  migration: MigrationState;
  onImport: () => void;
}) {
  if (migration.status === "hidden") {
    return null;
  }

  return (
    <section className={`migrationBanner migration-${migration.status}`} aria-live="polite">
      <div>
        <p className="eyebrow">LOCAL DATA MIGRATION</p>
        <h2>{migration.status === "complete" ? "Existing applications imported" : "Import existing applications"}</h2>
        <p>
          {migration.status === "complete"
            ? `${migration.count} browser-saved ${migration.count === 1 ? "application is" : "applications are"} now in the database. A JSON backup was preserved.`
            : migration.status === "error"
              ? migration.error
              : `${migration.count} browser-saved ${migration.count === 1 ? "application was" : "applications were"} found. A JSON backup will be saved before importing.`}
        </p>
      </div>
      {migration.status !== "complete" && (
        <button onClick={onImport} disabled={migration.status === "importing"}>
          {migration.status === "importing" ? "Importing..." : "Import existing applications"}
        </button>
      )}
    </section>
  );
}
