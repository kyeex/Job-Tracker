"use client";

import { useEffect, useState } from "react";
import type { JobImportRecord, MigrationRecord, MigrationState, PersistedJob, Status } from "@/lib/jobs/types";

const legacyJobsKey = "job-tracker-jobs";
const migrationCompleteKey = "job-tracker-d1-migration-complete";
const migrationBackupKey = "job-tracker-jobs-backup";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stableLegacyId(record: Record<string, unknown>, index: number) {
  const explicitId = readString(record.id);
  if (explicitId) {
    return explicitId;
  }

  const fingerprint = JSON.stringify([
    readString(record.date ?? record.dateApplied ?? record.date_applied),
    readString(record.title ?? record.jobTitle ?? record.job_title),
    readString(record.company),
    readString(record.url ?? record.jobUrl ?? record.job_url),
    readString(record.status),
    readString(record.notes),
    index,
  ]);
  let hash = 2166136261;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `legacy-${(hash >>> 0).toString(36)}`;
}

function normalizeLegacyRecord(value: unknown, index: number): MigrationRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    id: stableLegacyId(record, index),
    dateApplied: readString(record.date ?? record.dateApplied ?? record.date_applied),
    jobTitle: readString(record.title ?? record.jobTitle ?? record.job_title),
    company: readString(record.company),
    jobUrl: readString(record.url ?? record.jobUrl ?? record.job_url),
    status: readString(record.status) as Status,
    notes: readString(record.notes),
  };
}

function readLegacyRecords() {
  const raw = window.localStorage.getItem(legacyJobsKey);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return null;
  }

  const records = parsed
    .map((record, index) => normalizeLegacyRecord(record, index))
    .filter((record): record is MigrationRecord => Boolean(record));

  return { raw, records };
}

function downloadJsonBackup(raw: string, filename: string) {
  const blob = new Blob([raw], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function useLegacyMigration({
  showToast,
  importJobs,
}: {
  showToast: (message: string) => void;
  importJobs: (records: JobImportRecord[]) => Promise<{ result: { imported: number }; jobs: PersistedJob[] }>;
}) {
  const [migration, setMigration] = useState<MigrationState>({ status: "hidden", count: 0 });

  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (window.localStorage.getItem(migrationCompleteKey)) {
          return;
        }

        const legacy = readLegacyRecords();
        if (legacy?.records.length) {
          setMigration({ status: "available", count: legacy.records.length });
        }
      } catch {
        setMigration({
          status: "error",
          count: 0,
          error: "Existing browser records were found, but they could not be read.",
        });
      }
    });
  }, []);

  const importLegacyApplications = async () => {
    let legacy: ReturnType<typeof readLegacyRecords>;

    try {
      legacy = readLegacyRecords();
    } catch {
      setMigration({ status: "error", count: 0, error: "The existing browser records could not be read." });
      return;
    }

    if (!legacy?.records.length) {
      setMigration({ status: "hidden", count: 0 });
      showToast("No browser records to import");
      return;
    }

    const backupName = `job-tracker-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    setMigration({ status: "importing", count: legacy.records.length });

    try {
      window.localStorage.setItem(migrationBackupKey, legacy.raw);
      window.localStorage.setItem(`${migrationBackupKey}-created-at`, new Date().toISOString());
      downloadJsonBackup(legacy.raw, backupName);

      const { result: imported, jobs } = await importJobs(legacy.records);

      if (imported.imported !== legacy.records.length) {
        throw new Error(`Imported ${imported.imported} of ${legacy.records.length} existing applications.`);
      }

      const importedIds = new Set(legacy.records.map((record) => record.id));
      const verifiedCount = jobs.filter((job) => importedIds.has(job.id)).length;
      if (verifiedCount !== importedIds.size) {
        throw new Error(`Verified ${verifiedCount} of ${importedIds.size} imported applications.`);
      }

      window.localStorage.setItem(
        migrationCompleteKey,
        JSON.stringify({
          completedAt: new Date().toISOString(),
          sourceCount: legacy.records.length,
          importedCount: imported.imported,
          verifiedCount,
          backupKey: migrationBackupKey,
        }),
      );
      window.localStorage.removeItem(legacyJobsKey);
      setMigration({ status: "complete", count: verifiedCount });
      showToast(`${verifiedCount} existing applications imported`);
    } catch (error) {
      setMigration({
        status: "error",
        count: legacy.records.length,
        error: error instanceof Error ? error.message : "The existing applications could not be imported.",
      });
    }
  };

  return { migration, importLegacyApplications };
}
