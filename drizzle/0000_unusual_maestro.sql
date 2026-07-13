CREATE TABLE `job_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`date_applied` text NOT NULL,
	`job_title` text NOT NULL,
	`company` text NOT NULL,
	`job_url` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Applied' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "job_applications_date_applied_format_check" CHECK("job_applications"."date_applied" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "job_applications_status_check" CHECK("job_applications"."status" IN ('Applied', 'Interview', 'Offer', 'Rejected')),
	CONSTRAINT "job_applications_job_title_check" CHECK(length(trim("job_applications"."job_title")) BETWEEN 1 AND 200),
	CONSTRAINT "job_applications_company_check" CHECK(length(trim("job_applications"."company")) BETWEEN 1 AND 200),
	CONSTRAINT "job_applications_job_url_length_check" CHECK(length("job_applications"."job_url") <= 2048),
	CONSTRAINT "job_applications_notes_length_check" CHECK(length("job_applications"."notes") <= 10000)
);
--> statement-breakpoint
CREATE INDEX `job_applications_date_applied_idx` ON `job_applications` (`date_applied`);--> statement-breakpoint
CREATE INDEX `job_applications_status_idx` ON `job_applications` (`status`);--> statement-breakpoint
CREATE INDEX `job_applications_company_idx` ON `job_applications` (`company`);--> statement-breakpoint
CREATE INDEX `job_applications_updated_at_idx` ON `job_applications` (`updated_at`);