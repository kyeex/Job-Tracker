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

test("job tracker keeps the expected Firestore and migration affordances", async () => {
  const [migrationHook, firestoreJobs, table, exportHelper, constants, validation, hosting, packageJson] =
    await Promise.all([
    readFile(new URL("hooks/useLegacyMigration.ts", appRoot), "utf8"),
    readFile(new URL("lib/firestore-jobs.ts", appRoot), "utf8"),
    readFile(new URL("components/OpportunitiesTable.tsx", appRoot), "utf8"),
    readFile(new URL("lib/xlsx-export.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/constants.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/validation.ts", appRoot), "utf8"),
    readFile(new URL("../.openai/hosting.json", appRoot), "utf8"),
    readFile(new URL("../package.json", appRoot), "utf8"),
  ]);

  assert.match(migrationHook, /legacyJobsKey = "job-tracker-jobs"/);
  assert.match(migrationHook, /importJobs/);
  assert.match(firestoreJobs, /createFirestoreJobsRepository/);
  assert.match(table, /onExport=\{exportExcel\}/);
  assert.match(exportHelper, /sheetData/);
  assert.match(constants, /JOB_STATUSES/);
  assert.match(validation, /JOB_FIELD_LIMITS/);
  assert.match(hosting, /"d1": null/);
  assert.doesNotMatch(packageJson, /drizzle-orm|drizzle-kit|db:generate/);
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

test("opportunities table delegates toolbar, filters, rows, and pagination", async () => {
  const [table, toolbar, filters, row, pagination, paginationHook] = await Promise.all([
    readFile(new URL("components/OpportunitiesTable.tsx", appRoot), "utf8"),
    readFile(new URL("components/OpportunitiesToolbar.tsx", appRoot), "utf8"),
    readFile(new URL("components/OpportunitiesFilters.tsx", appRoot), "utf8"),
    readFile(new URL("components/OpportunityRow.tsx", appRoot), "utf8"),
    readFile(new URL("components/PaginationControls.tsx", appRoot), "utf8"),
    readFile(new URL("hooks/usePagination.ts", appRoot), "utf8"),
  ]);

  for (const name of ["OpportunitiesToolbar", "OpportunitiesFilters", "OpportunityRow", "PaginationControls"]) {
    assert.match(table, new RegExp(name));
  }
  assert.match(table, /usePagination/);
  assert.match(toolbar, /Export Excel/);
  assert.match(filters, /Filter role, company or URL/);
  assert.match(row, /target="_blank"/);
  assert.match(pagination, /Applications pagination/);
  assert.match(paginationHook, /export function getPageWindow/);
});

test("application rhythm delegates heat-map and tree calculations", async () => {
  const [rhythm, activity] = await Promise.all([
    readFile(new URL("components/ApplicationRhythm.tsx", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/activity.ts", appRoot), "utf8"),
  ]);

  for (const name of [
    "getActivityYears",
    "getApplicationActivity",
    "getGrowthTreeProgress",
    "getHeatmapLevel",
    "getMonthGridColumn",
    "getYearActivityStats",
    "getYearDays",
  ]) {
    assert.match(rhythm, new RegExp(name));
    assert.match(activity, new RegExp(`export function ${name}`));
  }
  assert.doesNotMatch(rhythm, /function yearDays|const treeStages|jobs\.reduce<Record/);
});

test("job domain types, constants, mappers, and validation are centralized", async () => {
  const [types, constants, mappers, validation, page, repository] = await Promise.all([
    readFile(new URL("../lib/jobs/types.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/constants.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/mappers.ts", appRoot), "utf8"),
    readFile(new URL("../lib/jobs/validation.ts", appRoot), "utf8"),
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("lib/firestore-jobs.ts", appRoot), "utf8"),
  ]);

  assert.match(types, /export type JobStatus/);
  assert.match(constants, /export const JOB_STATUSES/);
  assert.match(mappers, /export function mapPersistedJob/);
  assert.match(validation, /export function validateJobPayload/);
  assert.match(page, /@\/lib\/jobs\/types/);
  assert.match(repository, /@\/lib\/jobs\/validation/);
  assert.match(repository, /@\/lib\/jobs\/types/);
});

test("deployment architecture is documented as Firebase Auth plus Firestore", async () => {
  const [architecture, firebase, security, readme, rules, useJobs, firestoreJobs] = await Promise.all([
    readFile(new URL("../ARCHITECTURE.md", appRoot), "utf8"),
    readFile(new URL("../FIREBASE.md", appRoot), "utf8"),
    readFile(new URL("../SECURITY_DECISION.md", appRoot), "utf8"),
    readFile(new URL("../README.md", appRoot), "utf8"),
    readFile(new URL("../firestore.rules", appRoot), "utf8"),
    readFile(new URL("hooks/useJobs.ts", appRoot), "utf8"),
    readFile(new URL("lib/firestore-jobs.ts", appRoot), "utf8"),
  ]);

  for (const document of [architecture, firebase, security, readme]) {
    assert.match(document, /Firebase Auth \+ (Cloud )?Firestore/);
  }

  assert.match(architecture, /Firestore is the only application data store/);
  assert.match(firebase, /retired D1 routes, schema, and migrations have been removed/i);
  assert.match(security, /request\.auth\.uid == userId/);
  assert.match(rules, /users\/\{userId\}\/jobApplications\/\{applicationId\}/);
  assert.match(useJobs, /getFirebaseJobsRepository/);
  assert.match(useJobs, /repository\.list/);
  assert.match(firestoreJobs, /users", userId, "jobApplications/);
  assert.doesNotMatch(useJobs, /\/api\/jobs/);
});

test("retired D1 and Drizzle implementation is absent", async () => {
  const [hosting, packageJson, viteConfig, worker, buildPlugin] = await Promise.all([
    readFile(new URL("../.openai/hosting.json", appRoot), "utf8"),
    readFile(new URL("../package.json", appRoot), "utf8"),
    readFile(new URL("../vite.config.ts", appRoot), "utf8"),
    readFile(new URL("../worker/index.ts", appRoot), "utf8"),
    readFile(new URL("../build/sites-vite-plugin.ts", appRoot), "utf8"),
  ]);

  assert.match(hosting, /"d1": null/);
  for (const source of [packageJson, viteConfig, worker, buildPlugin]) {
    assert.doesNotMatch(source, /D1Database|d1_databases|drizzle-orm|drizzle-kit|db:generate|env\.DB/);
  }
});

test("recoverable Google authentication preserves guest applications", async () => {
  const [page, authHook, firebaseClient, accountControl, transfer, firebaseDocs] = await Promise.all([
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("hooks/useFirebaseAuth.ts", appRoot), "utf8"),
    readFile(new URL("lib/firebase-client.ts", appRoot), "utf8"),
    readFile(new URL("components/AccountControl.tsx", appRoot), "utf8"),
    readFile(new URL("lib/auth-transfer.ts", appRoot), "utf8"),
    readFile(new URL("../FIREBASE.md", appRoot), "utf8"),
  ]);

  assert.match(page, /<AccountControl/);
  assert.match(page, /restoreAuthTransfer/);
  assert.match(authHook, /connectGoogleAccount/);
  assert.match(firebaseClient, /linkWithPopup/);
  assert.match(firebaseClient, /signInWithCredential/);
  assert.match(firebaseClient, /GoogleAuthProvider\.credentialFromError/);
  assert.match(accountControl, /Applications recoverable/);
  assert.match(transfer, /job-tracker-google-auth-transfer-v1/);
  assert.match(firebaseDocs, /enable both/);
  assert.match(firebaseDocs, /Google/);
  assert.match(firebaseDocs, /Anonymous/);
});

test("Firestore data access implements the shared injectable repository contract", async () => {
  const [contract, repository, useJobs] = await Promise.all([
    readFile(new URL("../lib/jobs/repository.ts", appRoot), "utf8"),
    readFile(new URL("lib/firestore-jobs.ts", appRoot), "utf8"),
    readFile(new URL("hooks/useJobs.ts", appRoot), "utf8"),
  ]);

  assert.match(contract, /export interface JobsRepository/);
  assert.match(repository, /createFirestoreJobsRepository\(db: Firestore, userId: string\)/);
  assert.match(repository, /getFirebaseJobsRepository/);
  assert.match(useJobs, /repository\.update/);
  assert.match(useJobs, /repository\.import/);
});

test("Firebase and Excel stay out of the initial page chunk", async () => {
  const [page, jobsHook, authHook] = await Promise.all([
    readFile(new URL("page.tsx", appRoot), "utf8"),
    readFile(new URL("hooks/useJobs.ts", appRoot), "utf8"),
    readFile(new URL("hooks/useFirebaseAuth.ts", appRoot), "utf8"),
  ]);

  assert.match(page, /await import\("\.\/lib\/xlsx-export"\)/);
  assert.doesNotMatch(page, /import \{ makeXlsx \} from/);
  assert.match(jobsHook, /import\("\.\.\/lib\/firestore-jobs"\)/);
  assert.match(authHook, /import\("\.\.\/lib\/firebase-client"\)/);
});
