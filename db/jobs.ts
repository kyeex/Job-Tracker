import { getD1Database } from "./index";
import { mapJobRow, normalizeJobInput } from "@/lib/jobs/mappers";
import type { JobApplicationRow, JobImportRecord, JobInput, JobUpdateInput } from "@/lib/jobs/types";
import type { JobApplication } from "./schema";

const jobColumns = `
  id,
  date_applied,
  job_title,
  company,
  job_url,
  status,
  notes,
  created_at,
  updated_at
`;

function makeId() {
  return crypto.randomUUID();
}

async function getJobById(id: string) {
  const db = getD1Database();
  const row = await db
    .prepare(`SELECT ${jobColumns} FROM job_applications WHERE id = ?`)
    .bind(id)
    .first<JobApplicationRow>();

  return row ? (mapJobRow(row) as JobApplication) : null;
}

export async function listJobs() {
  const db = getD1Database();
  const { results } = await db
    .prepare(
      `SELECT ${jobColumns}
       FROM job_applications
       ORDER BY date_applied DESC, updated_at DESC`,
    )
    .all<JobApplicationRow>();

  return results.map((row) => mapJobRow(row) as JobApplication);
}

export async function createJob(input: JobInput) {
  const db = getD1Database();
  const id = makeId();
  const values = normalizeJobInput(input);

  await db
    .prepare(
      `INSERT INTO job_applications (
        id,
        date_applied,
        job_title,
        company,
        job_url,
        status,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      values.dateApplied,
      values.jobTitle,
      values.company,
      values.jobUrl,
      values.status,
      values.notes,
    )
    .run();

  const job = await getJobById(id);
  if (!job) {
    throw new Error("Job application was created but could not be retrieved.");
  }

  return job;
}

export async function updateJob(id: string, input: JobUpdateInput) {
  const db = getD1Database();

  await db
    .prepare(
      `UPDATE job_applications
       SET
        date_applied = COALESCE(?, date_applied),
        job_title = COALESCE(?, job_title),
        company = COALESCE(?, company),
        job_url = COALESCE(?, job_url),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      input.dateApplied ?? null,
      input.jobTitle?.trim() ?? null,
      input.company?.trim() ?? null,
      input.jobUrl?.trim() ?? null,
      input.status ?? null,
      input.notes?.trim() ?? null,
      id,
    )
    .run();

  return getJobById(id);
}

export async function deleteJob(id: string) {
  const db = getD1Database();
  const result = await db
    .prepare("DELETE FROM job_applications WHERE id = ?")
    .bind(id)
    .run();
  const changes = (result.meta as { changes?: number }).changes ?? 0;

  return changes > 0;
}

export async function importJobs(records: JobImportRecord[]) {
  if (records.length === 0) {
    return { imported: 0 };
  }

  const db = getD1Database();
  const statements = records.map((record) => {
    const id = record.id ?? makeId();
    const values = normalizeJobInput(record);

    return db
      .prepare(
        `INSERT INTO job_applications (
          id,
          date_applied,
          job_title,
          company,
          job_url,
          status,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), COALESCE(?, CURRENT_TIMESTAMP))
        ON CONFLICT(id) DO UPDATE SET
          date_applied = excluded.date_applied,
          job_title = excluded.job_title,
          company = excluded.company,
          job_url = excluded.job_url,
          status = excluded.status,
          notes = excluded.notes,
          updated_at = excluded.updated_at`,
      )
      .bind(
        id,
        values.dateApplied,
        values.jobTitle,
        values.company,
        values.jobUrl,
        values.status,
        values.notes,
        record.createdAt ?? null,
        record.updatedAt ?? null,
      );
  });

  await db.batch(statements);

  return { imported: records.length };
}
