import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const jobApplications = sqliteTable(
  "job_applications",
  {
    id: text("id").primaryKey().notNull(),
    dateApplied: text("date_applied").notNull(),
    jobTitle: text("job_title").notNull(),
    company: text("company").notNull(),
    jobUrl: text("job_url").notNull().default(""),
    status: text("status", {
      enum: ["Applied", "Interview", "Offer", "Rejected"],
    })
      .notNull()
      .default("Applied"),
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
      sql`${table.status} IN ('Applied', 'Interview', 'Offer', 'Rejected')`,
    ),
    check(
      "job_applications_job_title_check",
      sql`length(trim(${table.jobTitle})) BETWEEN 1 AND 200`,
    ),
    check(
      "job_applications_company_check",
      sql`length(trim(${table.company})) BETWEEN 1 AND 200`,
    ),
    check(
      "job_applications_job_url_length_check",
      sql`length(${table.jobUrl}) <= 2048`,
    ),
    check(
      "job_applications_notes_length_check",
      sql`length(${table.notes}) <= 10000`,
    ),
  ],
);

export type JobApplication = typeof jobApplications.$inferSelect;
export type NewJobApplication = typeof jobApplications.$inferInsert;
