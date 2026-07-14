import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { DEFAULT_JOB_STATUS, JOB_FIELD_LIMITS, JOB_STATUSES } from "@/lib/jobs/constants";

const quotedJobStatuses = JOB_STATUSES.map((status) => `'${status}'`).join(", ");

export const jobApplications = sqliteTable(
  "job_applications",
  {
    id: text("id").primaryKey().notNull(),
    dateApplied: text("date_applied").notNull(),
    jobTitle: text("job_title").notNull(),
    company: text("company").notNull(),
    jobUrl: text("job_url").notNull().default(""),
    status: text("status", {
      enum: JOB_STATUSES,
    })
      .notNull()
      .default(DEFAULT_JOB_STATUS),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("job_applications_date_applied_idx").on(table.dateApplied),
    index("job_applications_status_idx").on(table.status),
    index("job_applications_company_idx").on(table.company),
    index("job_applications_updated_at_idx").on(table.updatedAt),
    check(
      "job_applications_date_applied_format_check",
      sql`${table.dateApplied} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
    check(
      "job_applications_status_check",
      sql`${table.status} IN ${sql.raw(`(${quotedJobStatuses})`)}`,
    ),
    check(
      "job_applications_job_title_check",
      sql`length(trim(${table.jobTitle})) BETWEEN 1 AND ${sql.raw(String(JOB_FIELD_LIMITS.title))}`,
    ),
    check(
      "job_applications_company_check",
      sql`length(trim(${table.company})) BETWEEN 1 AND ${sql.raw(String(JOB_FIELD_LIMITS.company))}`,
    ),
    check(
      "job_applications_job_url_length_check",
      sql`length(${table.jobUrl}) <= ${sql.raw(String(JOB_FIELD_LIMITS.url))}`,
    ),
    check(
      "job_applications_notes_length_check",
      sql`length(${table.notes}) <= ${sql.raw(String(JOB_FIELD_LIMITS.notes))}`,
    ),
  ],
);

export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;
