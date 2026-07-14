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
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from "@firebase/firestore";
import { DEFAULT_JOB_STATUS } from "@/lib/jobs/constants";
import type { ApiJob, JobImportRecord, JobInput, JobStatus, JobUpdateInput } from "@/lib/jobs/types";
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

function normalizeInput(input: JobInput): FirestoreJobDocument {
  return {
    dateApplied: input.dateApplied,
    jobTitle: input.jobTitle.trim(),
    company: input.company.trim(),
    jobUrl: input.jobUrl?.trim() ?? "",
    status: input.status ?? DEFAULT_JOB_STATUS,
    notes: input.notes?.trim() ?? "",
  };
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
  const values = normalizeInput(input);

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
  const updates: JobUpdateInput = {};

  if (input.dateApplied !== undefined) updates.dateApplied = input.dateApplied;
  if (input.jobTitle !== undefined) updates.jobTitle = input.jobTitle.trim();
  if (input.company !== undefined) updates.company = input.company.trim();
  if (input.jobUrl !== undefined) updates.jobUrl = input.jobUrl.trim();
  if (input.status !== undefined) updates.status = input.status;
  if (input.notes !== undefined) updates.notes = input.notes.trim();

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

  records.forEach((record) => {
    const reference = record.id ? doc(jobs, record.id) : doc(jobs);
    const values = normalizeInput(record);
    batch.set(
      reference,
      {
        ...values,
        createdAt: record.createdAt ?? serverTimestamp(),
        updatedAt: record.updatedAt ?? serverTimestamp(),
      },
      { merge: true },
    );
  });

  await batch.commit();
  return { imported: records.length };
}
