import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appRoot = new URL("../app/", import.meta.url);
const projectRoot = new URL("../", import.meta.url);

test("job tracker replaces the starter skeleton with product UI", async () => {
  const [page, layout, packageJson, hero, rhythm, table] = await Promise.all([
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("layout.tsx", appRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("components/CareerHero.tsx", appRoot), "utf8"),
    readFile(new URL("components/ApplicationRhythm.tsx", appRoot), "utf8"),
    readFile(new URL("components/OpportunitiesTable.tsx", appRoot), "utf8"),
  ]);

  assert.match(layout, /Jobfolio — Personal Job Tracker/);
  assert.match(page, /<CareerHero \/>/);
  assert.match(page, /<ApplicationRhythm jobs=\{jobs\} \/>/);
  assert.match(page, /<OpportunitiesTable/);
  assert.match(hero, /YOUR CAREER COMMAND CENTER/);
  assert.match(rhythm, /APPLICATION RHYTHM/);
  assert.match(table, /Your opportunities/);
  assert.doesNotMatch(page, /SkeletonPreview|react-loading-skeleton|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});

test("job tracker keeps the expected database and migration affordances", async () => {
  const [migrationHook, schema, apiRoute, importRoute, table, exportHelper, constants, validation] =
    await Promise.all([
    readFile(new URL("hooks/useLegacyMigration.ts", appRoot), "utf8"),
    readFile(new URL("../db/schema.ts", appRoot), "utf8"),
    readFile(new URL("api/jobs/route.ts", appRoot), "utf8"),
    readFile(new URL("api/jobs/import/route.ts", appRoot), "utf8"),
    readFile(new URL("components/OpportunitiesTable.tsx", appRoot), "utf8"),
    readFile(new URL("lib/xlsx-export.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/constants.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/validation.ts", appRoot), "utf8"),
  ]);

  assert.match(migrationHook, /legacyJobsKey = "job-tracker-jobs"/);
  assert.match(migrationHook, /\/api\/jobs\/import/);
  assert.match(table, /Export Excel/);
  assert.match(exportHelper, /sheetData/);
  assert.match(schema, /job_applications/);
  assert.match(schema, /JOB_STATUSES/);
  assert.match(schema, /JOB_FIELD_LIMITS/);
  assert.match(schema, /job_applications_date_applied_idx/);
  assert.match(schema, /job_applications_status_idx/);
  assert.match(apiRoute, /validateJobPayload/);
  assert.match(importRoute, /importJobs/);
  assert.match(constants, /JOB_STATUSES/);
  assert.match(validation, /JOB_FIELD_LIMITS/);
});

test("page delegates major responsibilities to extracted hooks and components", async () => {
  const page = await readFile(new URL("page.tsx", appRoot), "utf8");

  for (const name of [
    "ApplicationRhythm",
    "OpportunitiesTable",
    "ApplicationModal",
    "DashboardStats",
    "MigrationBanner",
    "CareerHero",
    "Toast",
    "useJobs",
    "useJobFilters",
    "useLegacyMigration",
  ]) {
    assert.match(page, new RegExp(name));
  }

  assert.doesNotMatch(page, /function makeXlsx|function yearDays|function readLegacyRecords/);
});

test("job domain types, constants, mappers, and validation are centralized", async () => {
  const [types, constants, mappers, validation, page, apiShared, repository] = await Promise.all([
    readFile(new URL("../lib/jobs/types.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/constants.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/mappers.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/validation.ts", appRoot), "utf8"),
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("api/jobs/_shared.ts", appRoot), "utf8"),
    readFile(new URL("../db/jobs.ts", appRoot), "utf8"),
  ]);

  assert.match(types, /export type JobStatus/);
  assert.match(constants, /export const JOB_STATUSES/);
  assert.match(mappers, /export function mapApiJob/);
  assert.match(validation, /export function validateJobPayload/);
  assert.match(page, /@\/lib\/jobs\/types/);
  assert.doesNotMatch(apiShared, /validateJobPayload|JOB_STATUSES|JobInput/);
  assert.match(repository, /@\/lib\/jobs\/mappers/);
  assert.match(repository, /@\/lib\/jobs\/types/);
});

test("deployment architecture is documented as Firebase Auth plus Firestore", async () => {
  const [architecture, firebase, security, readme, rules] = await Promise.all([
    readFile(new URL("../ARCHITECTURE.md", appRoot), "utf8"),
    readFile(new URL("../FIREBASE.md", appRoot), "utf8"),
    readFile(new URL("../SECURITY_DECISION.md", appRoot), "utf8"),
    readFile(new URL("../README.md", appRoot), "utf8"),
    readFile(new URL("../firestore.rules", appRoot), "utf8"),
  ]);

  for (const document of [architecture, firebase, security, readme]) {
    assert.match(document, /Firebase Auth \+ (Cloud )?Firestore/);
  }

  assert.match(architecture, /D1 implementation is now considered a transitional data layer/);
  assert.match(firebase, /current D1-backed API routes are transitional/i);
  assert.match(security, /request\.auth\.uid == userId/);
  assert.match(rules, /users\/\{userId\}\/jobApplications\/\{applicationId\}/);
});
