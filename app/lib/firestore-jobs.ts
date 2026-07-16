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
import type { JobImportRecord, JobInput, JobStatus, JobUpdateInput, PersistedJob } from "@/lib/jobs/types";
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

export async function listFirestoreJobs(userId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(
    query(userJobsCollection(db, userId), orderBy("dateApplied", "desc"), orderBy("updatedAt", "desc")),
  );

  return snapshot.docs.map((job) => mapJobDocument(job.id, job.data()));
}

export async function createFirestoreJob(userId: string, input: JobInput) {
  const db = getFirebaseFirestore();
  const reference = doc(userJobsCollection(db, userId));
  const values = requireValidJobInput(input);

  await setDoc(reference, {
    ...values,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: reference.id, ...values };
}

export async function updateFirestoreJob(userId: string, id: string, input: JobUpdateInput) {
  const db = getFirebaseFirestore();
  const updates = requireValidJobUpdate(input);
  const reference = doc(userJobsCollection(db, userId), id);

  await updateDoc(reference, {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const updated = await getDoc(reference);
  return updated.exists() ? mapJobDocument(updated.id, updated.data()) : null;
}

export async function deleteFirestoreJob(userId: string, id: string) {
  const db = getFirebaseFirestore();

  await deleteDoc(doc(userJobsCollection(db, userId), id));
  return true;
}

export async function importFirestoreJobs(userId: string, records: JobImportRecord[]) {
  if (!records.length) {
    return { imported: 0 };
  }

  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  const jobs = userJobsCollection(db, userId);
  const existingIds = new Set((await getDocs(jobs)).docs.map((job) => job.id));

  records.forEach((record, index) => {
    const reference = record.id ? doc(jobs, record.id) : doc(jobs);
    const values = requireValidJobInput(record, `Imported application ${index + 1}`);
    const timestamps = existingIds.has(reference.id)
      ? { updatedAt: serverTimestamp() }
      : {
          createdAt: normalizeImportedTimestamp(record.createdAt) ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
    batch.set(
      reference,
      {
        ...values,
        ...timestamps,
      },
      { merge: true },
    );
  });

  await batch.commit();
  return { imported: records.length };
}
