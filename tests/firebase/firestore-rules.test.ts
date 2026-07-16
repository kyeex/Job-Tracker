import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { Firestore as InternalFirestore } from "@firebase/firestore";
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createFirestoreJobsRepository } from "@/app/lib/firestore-jobs";
import { requireValidJobInput } from "@/lib/jobs/validation";
import { jobContractCases } from "../job-contract";

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

  it("has behavioral parity with the constants-driven validation contract", async () => {
    for (const [index, contractCase] of jobContractCases.entries()) {
      const ref = applicationRef("contract-owner", `contract-${index}`);

      if (contractCase.accepted) {
        const normalized = requireValidJobInput(contractCase.payload);
        await assertSucceeds(setDoc(ref, validApplication(normalized)));
      } else {
        await assertFails(setDoc(ref, validApplication(contractCase.payload)));
      }
    }
  });

  it("keeps createdAt immutable and requires a server update timestamp", async () => {
    const ref = applicationRef("owner");
    await assertSucceeds(setDoc(ref, validApplication()));

    await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { status: "Offer", updatedAt: new Date("2020-01-01") }));
  });

  it("runs the real repository CRUD implementation against an authenticated emulator context", async () => {
    const userId = "repository-owner";
    const firestore = environment.authenticatedContext(userId).firestore();
    const repository = createFirestoreJobsRepository(firestore as unknown as InternalFirestore, userId);

    const created = await repository.create({
      dateApplied: "2026-07-16",
      jobTitle: "Repository Engineer",
      company: "Acme Labs",
      jobUrl: "https://example.com/repository-engineer",
      status: "Applied",
      notes: "Created through the production repository",
    });
    expect(created.id).toBeTruthy();
    await expect(repository.listAll()).resolves.toEqual([created]);

    const updated = await repository.update(created.id, { status: "Interview", notes: "Screen scheduled" });
    expect(updated).toMatchObject({ id: created.id, status: "Interview", notes: "Screen scheduled" });

    await repository.remove(created.id);
    await expect(repository.listAll()).resolves.toEqual([]);
  });

  it("imports more than 500 records in chunks and remains idempotent when rerun", async () => {
    const userId = "bulk-owner";
    const firestore = environment.authenticatedContext(userId).firestore();
    const repository = createFirestoreJobsRepository(firestore as unknown as InternalFirestore, userId);
    const records = Array.from({ length: 625 }, (_, index) => ({
      dateApplied: `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
      jobTitle: `Imported role ${index + 1}`,
      company: `Company ${index % 25}`,
      jobUrl: `https://example.com/jobs/${index + 1}`,
      status: "Applied" as const,
      notes: index % 2 ? "Follow up" : "",
    }));
    const jobs = collection(firestore, "users", userId, "jobApplications");

    const first = await repository.import(records);
    const firstSnapshot = await getDocs(jobs);
    const firstIds = firstSnapshot.docs.map((item) => item.id).sort();
    const createdAtById = new Map(
      firstSnapshot.docs.map((item) => [item.id, item.data().createdAt.toMillis()]),
    );

    expect(first).toEqual({ imported: 625, created: 625, updated: 0, batches: 2 });
    expect(firstSnapshot.size).toBe(625);
    await expect(repository.listAll()).resolves.toHaveLength(625);

    const second = await repository.import(records);
    const secondSnapshot = await getDocs(jobs);

    expect(second).toEqual({ imported: 625, created: 0, updated: 625, batches: 2 });
    expect(secondSnapshot.size).toBe(625);
    expect(secondSnapshot.docs.map((item) => item.id).sort()).toEqual(firstIds);
    for (const item of secondSnapshot.docs) {
      expect(item.data().createdAt.toMillis()).toBe(createdAtById.get(item.id));
    }
  });
});
