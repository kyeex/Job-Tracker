"use client";

import { AccountControl } from "./components/AccountControl";
import { ApplicationModal } from "./components/ApplicationModal";
import { ApplicationRhythm } from "./components/ApplicationRhythm";
import { CareerHero } from "./components/CareerHero";
import { DashboardStats } from "./components/DashboardStats";
import { MigrationBanner } from "./components/MigrationBanner";
import { OpportunitiesTable } from "./components/OpportunitiesTable";
import { Toast } from "./components/Toast";
import { useJobFilters } from "./hooks/useJobFilters";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { useJobs } from "./hooks/useJobs";
import { useLegacyMigration } from "./hooks/useLegacyMigration";
import { useToast } from "./hooks/useToast";
import { useAccountTransfer } from "./hooks/useAccountTransfer";
import { useApplicationForm } from "./hooks/useApplicationForm";
import { useJobExports } from "./hooks/useJobExports";

export default function Home() {
  const auth = useFirebaseAuth();
  const {
    jobs,
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
  } = useJobs(auth.user?.uid ?? null);
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
  const { migration, importLegacyApplications } = useLegacyMigration({ showToast, importJobs });
  const { connectGoogleAccount, signOutAccount } = useAccountTransfer({
    jobs,
    user: auth.user,
    connectGoogle: auth.connectGoogle,
    continueAsGuest: auth.continueAsGuest,
    importJobs,
    showToast,
  });
  const applicationForm = useApplicationForm({ addJob, editJob, deleteJob, updateJobStatus, showToast });
  const { exportBackup, exportExcel } = useJobExports({ jobs, visibleJobs, showToast });

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brandMark">J</span>
          <span>Jobfolio</span>
        </a>
        <button className="mainActionButton" onClick={applicationForm.openAdd} aria-label="Add a new job application">
          <span className="mainActionIcon" aria-hidden="true">
            ＋
          </span>
          <span className="mainActionCopy">
            <strong>Add application</strong>
            <small>Track a new opportunity</small>
          </span>
        </button>
        <div className="headerActions">
          <AccountControl
            user={auth.user}
            state={auth.state}
            busy={auth.busy}
            error={auth.error}
            onConnect={() => void connectGoogleAccount()}
            onSignOut={() => void signOutAccount()}
          />
          <button className="iconButton" onClick={exportBackup} aria-label="Download backup" title="Download backup">
            ↓
          </button>
        </div>
      </header>

      <DashboardStats jobs={jobs} />
      <MigrationBanner migration={migration} onImport={() => void importLegacyApplications()} />
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
        exportExcel={() => void exportExcel()}
        openAdd={applicationForm.openAdd}
        openEdit={applicationForm.openEdit}
        removeJob={(id) => void applicationForm.removeJob(id)}
        updateStatus={(job, status) => void applicationForm.updateStatus(job, status)}
        deletingIds={deletingIds}
        savingStatusIds={savingStatusIds}
      />
      <ApplicationRhythm jobs={jobs} />
      <CareerHero />
      <ApplicationModal
        dialogOpen={applicationForm.dialogOpen}
        editingId={applicationForm.editingId}
        form={applicationForm.form}
        setForm={applicationForm.setForm}
        formSaving={applicationForm.formSaving}
        formError={applicationForm.formError}
        onClose={applicationForm.closeForm}
        onSave={(event) => void applicationForm.saveJob(event)}
      />
      <Toast message={toast} />
      <footer>
        <span>Jobfolio</span>
        <p>Your applications load from Firebase Firestore.</p>
      </footer>
    </main>
  );
}
