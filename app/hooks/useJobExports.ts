"use client";

import { useCallback } from "react";
import type { Job } from "@/lib/jobs/types";
import { formatLocalDate } from "@/lib/local-date";

type Options = {
  jobs: Job[];
  visibleJobs: Job[];
  showToast: (message: string) => void;
};

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function useJobExports({ jobs, visibleJobs, showToast }: Options) {
  const exportBackup = useCallback(() => {
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
    downloadBlob(blob, "job-tracker-backup.json");
    showToast("Backup downloaded");
  }, [jobs, showToast]);

  const exportExcel = useCallback(async () => {
    if (!visibleJobs.length) return;

    const { makeXlsx } = await import("../lib/xlsx-export");
    downloadBlob(makeXlsx(visibleJobs), `job-applications-${formatLocalDate()}.xlsx`);
    showToast(`${visibleJobs.length} ${visibleJobs.length === 1 ? "row" : "rows"} exported to Excel`);
  }, [showToast, visibleJobs]);

  return { exportBackup, exportExcel };
}
