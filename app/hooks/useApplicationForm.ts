"use client";

import { useCallback, useState, type FormEvent } from "react";
import { createEmptyJob } from "@/lib/jobs/mappers";
import type { Job, Status } from "@/lib/jobs/types";

type JobForm = Omit<Job, "id">;

type Options = {
  addJob: (job: JobForm) => Promise<Job>;
  editJob: (id: string, job: JobForm) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  updateJobStatus: (job: Job, status: Status) => Promise<Job | null>;
  showToast: (message: string) => void;
};

export function useApplicationForm({ addJob, editJob, deleteJob, updateJobStatus, showToast }: Options) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<JobForm>(() => createEmptyJob());
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(createEmptyJob());
    setFormError("");
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((job: Job) => {
    setEditingId(job.id);
    setForm({
      date: job.date,
      title: job.title,
      company: job.company,
      url: job.url,
      status: job.status,
      notes: job.notes,
    });
    setFormError("");
    setDialogOpen(true);
  }, []);

  const closeForm = useCallback(() => setDialogOpen(false), []);

  const saveJob = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormSaving(true);
    setFormError("");

    try {
      if (editingId) {
        await editJob(editingId, form);
        showToast("Application updated");
      } else {
        await addJob(form);
        showToast("Application added");
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "The application could not be saved.");
    } finally {
      setFormSaving(false);
    }
  }, [addJob, editJob, editingId, form, showToast]);

  const removeJob = useCallback(async (id: string) => {
    if (!window.confirm("Remove this application?")) return;

    try {
      await deleteJob(id);
      showToast("Application removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The application could not be deleted.");
    }
  }, [deleteJob, showToast]);

  const updateStatus = useCallback(async (job: Job, status: Status) => {
    try {
      const saved = await updateJobStatus(job, status);
      if (saved) showToast("Status updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The status could not be saved.");
    }
  }, [showToast, updateJobStatus]);

  return {
    dialogOpen,
    editingId,
    form,
    setForm,
    formSaving,
    formError,
    openAdd,
    openEdit,
    closeForm,
    saveJob,
    removeJob,
    updateStatus,
  };
}
