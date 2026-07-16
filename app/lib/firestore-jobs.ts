"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from "@firebase/firestore";
import { DEFAULT_JOB_STATUS } from "@/lib/jobs/constants";
import { FIRESTORE_IMPORT_BATCH_SIZE, prepareJobImports } from "@/lib/jobs/imports";
import type { JobImportRecord, JobStatus, PersistedJob } from "@/lib/jobs/types";
import type { JobImportResult, JobsRepository } from "@/lib/jobs/repository";
import { requireValidJobInput, requireValidJobUpdate } from "@/lib/jobs/validation";
import { getFirebaseFirestore } from "./firebase-firestore";

type FirestoreJobDocument = {
  dateApplied: string;
  jobTitle: string;
  company: string;
  jobUrl: string;
  status: JobStatus;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function userJobsCollection(db: Firestore, userId: string) {
  if (!userId.trim()) {
    throw new Error("A Firebase user ID is required to access job applications.");
  }

  return collection(db, "users", userId, "jobApplications");
}

function normalizeImportedTimestamp(value: string | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function mapJobDocument(id: string, data: DocumentData): PersistedJob {
  const job = data as Partial<FirestoreJobDocument>;
  return {
    id,
    dateApplied: job.dateApplied ?? "",
    jobTitle: job.jobTitle ?? "",
    company: job.company ?? "",
    jobUrl: job.jobUrl ?? "",
    status: job.status ?? DEFAULT_JOB_STATUS,
    notes: job.notes ?? "",
  };
}

async function importJobs(
  db: Firestore,
  jobs: ReturnType<typeof userJobsCollection>,
  records: JobImportRecord[],
): Promise<JobImportResult> {
  if (!records.length) {
    return { imported: 0, created: 0, updated: 0, batches: 0 };
  }

  const prepared = prepareJobImports(records);
  const existingIds = new Set((await getDocs(jobs)).docs.map((job) => job.id));
  let created = 0;
  let updated = 0;

  for (let start = 0; start < prepared.length; start += FIRESTORE_IMPORT_BATCH_SIZE) {
    const batch = writeBatch(db);
    const recordsInBatch = prepared.slice(start, start + FIRESTORE_IMPORT_BATCH_SIZE);

    recordsInBatch.forEach((record) => {
      const reference = doc(jobs, record.id);
      const exists = existingIds.has(record.id);
      const timestamps = exists
        ? { updatedAt: serverTimestamp() }
        : {
            createdAt: normalizeImportedTimestamp(record.createdAt) ?? serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
      if (exists) updated += 1;
      else created += 1;

      batch.set(reference, { ...record.values, ...timestamps }, { merge: true });
    });

    await batch.commit();
  }

  return {
    imported: prepared.length,
    created,
    updated,
    batches: Math.ceil(prepared.length / FIRESTORE_IMPORT_BATCH_SIZE),
  };
}

export function createFirestoreJobsRepository(db: Firestore, userId: string): JobsRepository {
  const jobs = userJobsCollection(db, userId);

  return {
    async list() {
      const snapshot = await getDocs(query(jobs, orderBy("dateApplied", "desc"), orderBy("updatedAt", "desc")));
      return snapshot.docs.map((job) => mapJobDocument(job.id, job.data()));
    },

    async create(input) {
      const reference = doc(jobs);
      const values = requireValidJobInput(input);
      await setDoc(reference, {
        ...values,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { id: reference.id, ...values };
    },

    async update(id, input) {
      const updates = requireValidJobUpdate(input);
      const reference = doc(jobs, id);
      await updateDoc(reference, { ...updates, updatedAt: serverTimestamp() });
      const updated = await getDoc(reference);
      return updated.exists() ? mapJobDocument(updated.id, updated.data()) : null;
    },

    async remove(id) {
      await deleteDoc(doc(jobs, id));
    },

    import(records) {
      return importJobs(db, jobs, records);
    },
  };
}

export function getFirebaseJobsRepository(userId: string) {
  return createFirestoreJobsRepository(getFirebaseFirestore(), userId);
}
