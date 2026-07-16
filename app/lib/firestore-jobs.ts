"use client";

import {
  collection,
  deleteDoc,
  doc,
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
import type { ApiJob, JobImportRecord, JobInput, JobStatus, JobUpdateInput } from "@/lib/jobs/types";
import { requireValidJobInput, requireValidJobUpdate } from "@/lib/jobs/validation";
import { getFirebaseClient, getFirebaseUser } from "./firebase-client";

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
  return collection(db, "users", userId, "jobApplications");
}

function normalizeImportedTimestamp(value: string | undefined) {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function mapJobDocument(id: string, data: DocumentData): ApiJob {
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

export async function listFirestoreJobs() {
  const { db } = getFirebaseClient();
  const user = await getFirebaseUser();
  const snapshot = await getDocs(
    query(userJobsCollection(db, user.uid), orderBy("dateApplied", "desc"), orderBy("updatedAt", "desc")),
  );

  return snapshot.docs.map((job) => mapJobDocument(job.id, job.data()));
}

export async function createFirestoreJob(input: JobInput) {
  const { db } = getFirebaseClient();
  const user = await getFirebaseUser();
  const reference = doc(userJobsCollection(db, user.uid));
  const values = requireValidJobInput(input);

  await setDoc(reference, {
    ...values,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { id: reference.id, ...values };
}

export async function updateFirestoreJob(id: string, input: JobUpdateInput) {
  const { db } = getFirebaseClient();
  const user = await getFirebaseUser();
  const updates = requireValidJobUpdate(input);

  await updateDoc(doc(userJobsCollection(db, user.uid), id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });

  const existing = await listFirestoreJobs();
  return existing.find((job) => job.id === id) ?? null;
}

export async function deleteFirestoreJob(id: string) {
  const { db } = getFirebaseClient();
  const user = await getFirebaseUser();

  await deleteDoc(doc(userJobsCollection(db, user.uid), id));
  return true;
}

export async function importFirestoreJobs(records: JobImportRecord[]) {
  if (!records.length) {
    return { imported: 0 };
  }

  const { db } = getFirebaseClient();
  const user = await getFirebaseUser();
  const batch = writeBatch(db);
  const jobs = userJobsCollection(db, user.uid);
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
