"use client";

import { FormEvent, useState } from "react";
import { ApplicationModal } from "./components/ApplicationModal";
import { ApplicationRhythm } from "./components/ApplicationRhythm";
import { CareerHero } from "./components/CareerHero";
import { DashboardStats } from "./components/DashboardStats";
import { MigrationBanner } from "./components/MigrationBanner";
import { OpportunitiesTable } from "./components/OpportunitiesTable";
import { Toast } from "./components/Toast";
import { useJobFilters } from "./hooks/useJobFilters";
import { useJobs } from "./hooks/useJobs";
import { useLegacyMigration } from "./hooks/useLegacyMigration";
import { useToast } from "./hooks/useToast";
import { emptyJob } from "@/lib/jobs/mappers";
import type { Job, Status } from "@/lib/jobs/types";
import { makeXlsx } from "./lib/xlsx-export";

export default function Home() {
  const {
    jobs,
    setJobs,
    loadState,
    loadError,
    loadJobs,
    deletingIds,
    savingStatusIds,
    addJob,
    editJob,
    deleteJob,
    updateJobStatus,
    importJobs,
  } = useJobs();
  const {
    search,
    setSearch,
    filter,
    setFilter,
    columnFilters,
    setColumnFilters,
    sort,
    changeSort,
    sortMark,
    hasColumnFilters,
    clearColumnFilters,
    visibleJobs,
  } = useJobFilters(jobs);
  const { toast, showToast } = useToast();
  const { migration, importLegacyApplications } = useLegacyMigration({ setJobs, showToast, importJobs });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyJob);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const isLoadingJobs = loadState === "loading";
  const hasLoadError = loadState === "error";

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyJob, date: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (job: Job) => {
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
  };

  const saveJob = async (event: FormEvent<HTMLFormElement>) => {
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
  };

  const removeJob = async (id: string) => {
    if (!window.confirm("Remove this application?")) {
      return;
    }

    try {
      await deleteJob(id);
      showToast("Application removed");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The application could not be deleted.");
    }
  };

  const updateStatus = async (job: Job, status: Status) => {
    try {
      const saved = await updateJobStatus(job, status);
      if (saved) {
        showToast("Status updated");
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The status could not be saved.");
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "job-tracker-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Backup downloaded");
  };

  const exportExcel = () => {
    if (!visibleJobs.length) {
      return;
    }

    const link = document.createElement("a");
    link.href = URL.createObjectURL(makeXlsx(visibleJobs));
    link.download = `job-applications-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast(`${visibleJobs.length} ${visibleJobs.length === 1 ? "row" : "rows"} exported to Excel`);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brandMark">J</span>
          <span>Jobfolio</span>
        </a>
        <button className="mainActionButton" onClick={openAdd} aria-label="Add a new job application">
          <span className="mainActionIcon" aria-hidden="true">
            ＋
          </span>
          <span className="mainActionCopy">
            <strong>Add application</strong>
            <small>Track a new opportunity</small>
          </span>
        </button>
        <div className="headerActions">
          <span className={`localBadge ${hasLoadError ? "warning" : ""}`}>
            <i /> {isLoadingJobs ? "Loading Firestore" : hasLoadError ? "Firestore retry needed" : "Loaded from Firestore"}
          </span>
          <button className="iconButton" onClick={exportData} aria-label="Download backup" title="Download backup">
            ↓
          </button>
        </div>
      </header>

      <DashboardStats jobs={jobs} />
      <MigrationBanner migration={migration} onImport={() => void importLegacyApplications()} />
      <ApplicationRhythm jobs={jobs} />
      <OpportunitiesTable
        jobs={jobs}
        visibleJobs={visibleJobs}
        loadState={loadState}
        loadError={loadError}
        loadJobs={() => void loadJobs()}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        sort={sort}
        changeSort={changeSort}
        sortMark={sortMark}
        hasColumnFilters={hasColumnFilters}
        clearColumnFilters={clearColumnFilters}
        exportExcel={exportExcel}
        openAdd={openAdd}
        openEdit={openEdit}
        removeJob={(id) => void removeJob(id)}
        updateStatus={(job, status) => void updateStatus(job, status)}
        deletingIds={deletingIds}
        savingStatusIds={savingStatusIds}
      />
      <CareerHero />
      <ApplicationModal
        dialogOpen={dialogOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        formSaving={formSaving}
        formError={formError}
        onClose={() => setDialogOpen(false)}
        onSave={(event) => void saveJob(event)}
      />
      <Toast message={toast} />
      <footer>
        <span>Jobfolio</span>
        <p>Your applications load from Firebase Firestore.</p>
      </footer>
    </main>
  );
}
