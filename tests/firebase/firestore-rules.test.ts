import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "job-tracker-a8bee";
let environment: RulesTestEnvironment;

const validApplication = (overrides: Record<string, unknown> = {}) => ({
  dateApplied: "2026-07-16",
  jobTitle: "Staff Engineer",
  company: "Acme Labs",
  jobUrl: "https://example.com/jobs/staff-engineer",
  status: "Applied",
  notes: "Recruiter screen scheduled",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const applicationRef = (uid: string, id = "application-1") =>
  doc(environment.authenticatedContext(uid).firestore(), "users", uid, "jobApplications", id);

beforeAll(async () => {
  const rulesPath = fileURLToPath(new URL("../../firestore.rules", import.meta.url));
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile(rulesPath, "utf8"),
    },
  });
});

beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

describe("job application Firestore rules", () => {
  it("allows an owner to create, read, update, and delete an application", async () => {
    const ref = applicationRef("owner");

    await assertSucceeds(setDoc(ref, validApplication()));
    const snapshot = await assertSucceeds(getDoc(ref));
    expect(snapshot.data()?.jobTitle).toBe("Staff Engineer");

    await assertSucceeds(updateDoc(ref, { status: "Interview", updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("rejects unauthenticated access", async () => {
    const firestore = environment.unauthenticatedContext().firestore();
    const ref = doc(firestore, "users", "owner", "jobApplications", "anonymous-attempt");

    await assertFails(setDoc(ref, validApplication()));
    await assertFails(getDoc(ref));
  });

  it("prevents another authenticated user from reading or changing an owner's record", async () => {
    const ownerRef = applicationRef("owner");
    await assertSucceeds(setDoc(ownerRef, validApplication()));

    const intruderFirestore = environment.authenticatedContext("intruder").firestore();
    const intruderRef = doc(intruderFirestore, "users", "owner", "jobApplications", "application-1");

    await assertFails(getDoc(intruderRef));
    await assertFails(updateDoc(intruderRef, { status: "Offer", updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(intruderRef));
  });

  it("enforces the shared field shape, status, URL, and length constraints", async () => {
    await assertFails(setDoc(applicationRef("owner", "extra-field"), validApplication({ unexpected: true })));
    await assertFails(setDoc(applicationRef("owner", "bad-status"), validApplication({ status: "Archived" })));
    await assertFails(setDoc(applicationRef("owner", "bad-url"), validApplication({ jobUrl: "ftp://example.com/job" })));
    await assertFails(setDoc(applicationRef("owner", "long-title"), validApplication({ jobTitle: "x".repeat(201) })));
  });

  it("keeps createdAt immutable and requires a server update timestamp", async () => {
    const ref = applicationRef("owner");
    await assertSucceeds(setDoc(ref, validApplication()));

    await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { status: "Offer", updatedAt: new Date("2020-01-01") }));
  });
});
