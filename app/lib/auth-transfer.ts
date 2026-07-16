"use client";

import type { Job, JobImportRecord } from "@/lib/jobs/types";

const AUTH_TRANSFER_KEY = "job-tracker-google-auth-transfer-v1";

export function createAuthTransferRecords(jobs: Job[]): JobImportRecord[] {
  return jobs.map((job) => ({
    id: job.id,
    dateApplied: job.date,
    jobTitle: job.title,
    company: job.company,
    jobUrl: job.url,
    status: job.status,
    notes: job.notes,
  }));
}

export function saveAuthTransfer(records: JobImportRecord[]) {
  if (!records.length) return;
  window.localStorage.setItem(AUTH_TRANSFER_KEY, JSON.stringify(records));
}

export function readAuthTransfer(): JobImportRecord[] {
  const raw = window.localStorage.getItem(AUTH_TRANSFER_KEY);
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as JobImportRecord[]) : [];
  } catch {
    return [];
  }
}

export function clearAuthTransfer() {
  window.localStorage.removeItem(AUTH_TRANSFER_KEY);
}
