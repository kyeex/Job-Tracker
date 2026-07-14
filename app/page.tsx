"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Status = "Applied" | "Interview" | "Offer" | "Rejected";
type Job = { id: string; date: string; title: string; company: string; url: string; status: Status; notes: string };
type ApiJob = { id: string; dateApplied: string; jobTitle: string; company: string; jobUrl: string; status: Status; notes: string };
type JobPayload = { dateApplied: string; jobTitle: string; company: string; jobUrl: string; status: Status; notes: string };
type MigrationRecord = JobPayload & { id: string };
type SortKey = "opportunity" | "date" | "status" | "notes";
type LoadState = "loading" | "ready" | "error";
type MigrationState = {
  status: "hidden" | "available" | "importing" | "complete" | "error";
  count: number;
  error?: string;
};

const legacyJobsKey = "job-tracker-jobs";
const migrationCompleteKey = "job-tracker-d1-migration-complete";
const migrationBackupKey = "job-tracker-jobs-backup";

const emptyJob: Omit<Job, "id"> = {
  date: new Date().toISOString().slice(0, 10), title: "", company: "", url: "", status: "Applied", notes: "",
};

const statusOrder: Status[] = ["Applied", "Interview", "Offer", "Rejected"];
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function mapApiJob(job: ApiJob): Job {
  return {
    id: job.id,
    date: job.dateApplied,
    title: job.jobTitle,
    company: job.company,
    url: job.jobUrl,
    status: job.status,
    notes: job.notes,
  };
}

function toJobPayload(job: Omit<Job, "id">): JobPayload {
  return {
    dateApplied: job.date,
    jobTitle: job.title,
    company: job.company,
    jobUrl: job.url,
    status: job.status,
    notes: job.notes,
  };
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stableLegacyId(record: Record<string, unknown>, index: number) {
  const explicitId = readString(record.id);
  if (explicitId) {
    return explicitId;
  }

  const fingerprint = JSON.stringify([
    readString(record.date ?? record.dateApplied ?? record.date_applied),
    readString(record.title ?? record.jobTitle ?? record.job_title),
    readString(record.company),
    readString(record.url ?? record.jobUrl ?? record.job_url),
    readString(record.status),
    readString(record.notes),
    index,
  ]);
  let hash = 2166136261;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `legacy-${(hash >>> 0).toString(36)}`;
}

function normalizeLegacyRecord(value: unknown, index: number): MigrationRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    id: stableLegacyId(record, index),
    dateApplied: readString(record.date ?? record.dateApplied ?? record.date_applied),
    jobTitle: readString(record.title ?? record.jobTitle ?? record.job_title),
    company: readString(record.company),
    jobUrl: readString(record.url ?? record.jobUrl ?? record.job_url),
    status: readString(record.status) as Status,
    notes: readString(record.notes),
  };
}

function readLegacyRecords() {
  const raw = window.localStorage.getItem(legacyJobsKey);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return null;
  }

  const records = parsed
    .map((record, index) => normalizeLegacyRecord(record, index))
    .filter((record): record is MigrationRecord => Boolean(record));

  return { raw, records };
}

function downloadJsonBackup(raw: string, filename: string) {
  const blob = new Blob([raw], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function formatApiError(body: unknown, fallback: string) {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return fallback;
  }

  const error = (body as { error?: { message?: unknown; fields?: Record<string, string> } }).error;
  if (!error) {
    return fallback;
  }

  const fieldMessages = error.fields ? Object.values(error.fields).filter(Boolean) : [];
  return [typeof error.message === "string" ? error.message : fallback, ...fieldMessages].join(" ");
}

async function apiRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(formatApiError(body, "The database could not save this change."));
  }

  return body as T;
}

function yearDays(year: number) {
  const first = new Date(year, 0, 1);
  const start = new Date(year, 0, 1 - first.getDay());
  return Array.from({ length: 371 }, (_, index) => {
    const day = new Date(start); day.setDate(start.getDate() + index); return day;
  });
}

const xmlEscape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character] || character);

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeXlsx(rows: Job[]) {
  const encoder = new TextEncoder();
  const cell = (value: string, style = 0) => `<c t="inlineStr"${style ? ` s="${style}"` : ""}><is><t>${xmlEscape(value)}</t></is></c>`;
  const header = ["Date Applied", "Job Title", "Company", "Job URL", "Status", "Notes"];
  const sheetRows = [
    `<row r="1">${header.map((value) => cell(value, 1)).join("")}</row>`,
    ...rows.map((job, index) => `<row r="${index + 2}">${cell(job.date, 2)}${cell(job.title)}${cell(job.company)}${cell(job.url)}${cell(job.status)}${cell(job.notes)}</row>`),
  ].join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Job Applications" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF174F3D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="14" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="28" customWidth="1"/><col min="3" max="3" width="24" customWidth="1"/><col min="4" max="4" width="42" customWidth="1"/><col min="5" max="5" width="14" customWidth="1"/><col min="6" max="6" width="40" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:F${rows.length + 1}"/></worksheet>`,
  };
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  const u16 = (value: number) => [value & 255, value >>> 8 & 255]; const u32 = (value: number) => [value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255];
  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name); const data = encoder.encode(content); const checksum = crc32(data);
    const local = new Uint8Array([80,75,3,4,20,0,0,0,0,0,0,0,0,0,...u32(checksum),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,...nameBytes]);
    parts.push(local, data);
    central.push(new Uint8Array([80,75,1,2,20,0,20,0,0,0,0,0,0,0,0,0,...u32(checksum),...u32(data.length),...u32(data.length),...u16(nameBytes.length),0,0,0,0,0,0,0,0,0,0,0,0,...u32(offset),...nameBytes]));
    offset += local.length + data.length;
  });
  const centralSize = central.reduce((sum, part) => sum + part.length, 0); const count = central.length;
  return new Blob([...parts, ...central, new Uint8Array([80,75,5,6,0,0,0,0,...u16(count),...u16(count),...u32(centralSize),...u32(offset),0,0])], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyJob);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Status | "All">("All");
  const [columnFilters, setColumnFilters] = useState({ opportunity: "", date: "", status: "All" as Status | "All", notes: "" });
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "date", direction: "desc" });
  const [activityYear, setActivityYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());
  const [savingStatusIds, setSavingStatusIds] = useState<Set<string>>(() => new Set());
  const [migration, setMigration] = useState<MigrationState>({ status: "hidden", count: 0 });

  const loadJobs = useCallback(async () => {
    setLoadState("loading");
    setLoadError("");

    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || "Unable to load applications.");
      }

      if (!Array.isArray(data.jobs)) {
        throw new Error("The application list was not returned correctly.");
      }

      setJobs(data.jobs.map(mapApiJob));
      setLoadState("ready");
    } catch (error) {
      setJobs([]);
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : "Unable to load applications.");
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(migrationCompleteKey)) {
        return;
      }

      const legacy = readLegacyRecords();
      if (legacy?.records.length) {
        setMigration({ status: "available", count: legacy.records.length });
      }
    } catch {
      setMigration({ status: "error", count: 0, error: "Existing browser records were found, but they could not be read." });
    }
  }, []);

  const visibleJobs = useMemo(() => jobs
    .filter((job) => filter === "All" || job.status === filter)
    .filter((job) => `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase()))
    .filter((job) => `${job.title} ${job.company} ${job.url}`.toLowerCase().includes(columnFilters.opportunity.toLowerCase()))
    .filter((job) => !columnFilters.date || job.date === columnFilters.date)
    .filter((job) => columnFilters.status === "All" || job.status === columnFilters.status)
    .filter((job) => job.notes.toLowerCase().includes(columnFilters.notes.toLowerCase()))
    .sort((a, b) => {
      const values: Record<SortKey, [string, string]> = {
        opportunity: [`${a.company} ${a.title}`.toLowerCase(), `${b.company} ${b.title}`.toLowerCase()],
        date: [a.date, b.date], status: [a.status, b.status], notes: [a.notes.toLowerCase(), b.notes.toLowerCase()],
      };
      const result = values[sort.key][0].localeCompare(values[sort.key][1]);
      return sort.direction === "asc" ? result : -result;
    }), [jobs, filter, search, columnFilters, sort]);

  const changeSort = (key: SortKey) => {
    setSort((current) => current.key === key
      ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key, direction: key === "date" ? "desc" : "asc" });
  };

  const sortMark = (key: SortKey) => sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : " ↕";
  const hasColumnFilters = Boolean(columnFilters.opportunity || columnFilters.date || columnFilters.status !== "All" || columnFilters.notes);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const openAdd = () => {
    setEditingId(null); setForm({ ...emptyJob, date: new Date().toISOString().slice(0, 10) }); setFormError(""); setDialogOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditingId(job.id); setForm({ date: job.date, title: job.title, company: job.company, url: job.url, status: job.status, notes: job.notes }); setFormError(""); setDialogOpen(true);
  };

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    setFormSaving(true);
    setFormError("");

    try {
      if (editingId) {
        const data = await apiRequest<{ job: ApiJob }>(`/api/jobs/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toJobPayload(form)),
        });
        const saved = mapApiJob(data.job);
        setJobs((items) => items.map((job) => job.id === editingId ? saved : job));
        showToast("Application updated");
      } else {
        const data = await apiRequest<{ job: ApiJob }>("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toJobPayload(form)),
        });
        setJobs((items) => [mapApiJob(data.job), ...items]);
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
    if (window.confirm("Remove this application?")) {
      setDeletingIds((current) => new Set(current).add(id));
      try {
        await apiRequest<{ deleted: true }>(`/api/jobs/${id}`, { method: "DELETE" });
        setJobs((items) => items.filter((job) => job.id !== id));
        showToast("Application removed");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "The application could not be deleted.");
      } finally {
        setDeletingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    }
  };

  const updateStatus = async (job: Job, status: Status) => {
    if (job.status === status || savingStatusIds.has(job.id) || deletingIds.has(job.id)) {
      return;
    }

    setSavingStatusIds((current) => new Set(current).add(job.id));
    try {
      const data = await apiRequest<{ job: ApiJob }>(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const saved = mapApiJob(data.job);
      setJobs((items) => items.map((item) => item.id === job.id ? saved : item));
      showToast("Status updated");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "The status could not be saved.");
    } finally {
      setSavingStatusIds((current) => {
        const next = new Set(current);
        next.delete(job.id);
        return next;
      });
    }
  };

  const importLegacyApplications = async () => {
    let legacy: ReturnType<typeof readLegacyRecords>;

    try {
      legacy = readLegacyRecords();
    } catch {
      setMigration({ status: "error", count: 0, error: "The existing browser records could not be read." });
      return;
    }

    if (!legacy?.records.length) {
      setMigration({ status: "hidden", count: 0 });
      showToast("No browser records to import");
      return;
    }

    const backupName = `job-tracker-local-backup-${new Date().toISOString().slice(0, 10)}.json`;
    setMigration({ status: "importing", count: legacy.records.length });

    try {
      window.localStorage.setItem(migrationBackupKey, legacy.raw);
      window.localStorage.setItem(`${migrationBackupKey}-created-at`, new Date().toISOString());
      downloadJsonBackup(legacy.raw, backupName);

      const imported = await apiRequest<{ imported: number }>("/api/jobs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: legacy.records }),
      });

      if (imported.imported !== legacy.records.length) {
        throw new Error(`Imported ${imported.imported} of ${legacy.records.length} existing applications.`);
      }

      const data = await apiRequest<{ jobs: ApiJob[] }>("/api/jobs");
      const importedIds = new Set(legacy.records.map((record) => record.id));
      const verifiedCount = data.jobs.filter((job) => importedIds.has(job.id)).length;
      if (verifiedCount !== importedIds.size) {
        throw new Error(`Verified ${verifiedCount} of ${importedIds.size} imported applications.`);
      }

      setJobs(data.jobs.map(mapApiJob));
      window.localStorage.setItem(migrationCompleteKey, JSON.stringify({
        completedAt: new Date().toISOString(),
        sourceCount: legacy.records.length,
        importedCount: imported.imported,
        verifiedCount,
        backupKey: migrationBackupKey,
      }));
      window.localStorage.removeItem(legacyJobsKey);
      setMigration({ status: "complete", count: verifiedCount });
      showToast(`${verifiedCount} existing applications imported`);
    } catch (error) {
      setMigration({
        status: "error",
        count: legacy.records.length,
        error: error instanceof Error ? error.message : "The existing applications could not be imported.",
      });
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(jobs, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "job-tracker-backup.json"; link.click(); URL.revokeObjectURL(link.href);
    showToast("Backup downloaded");
  };

  const exportExcel = () => {
    if (!visibleJobs.length) return;
    const link = document.createElement("a"); link.href = URL.createObjectURL(makeXlsx(visibleJobs));
    link.download = `job-applications-${new Date().toISOString().slice(0, 10)}.xlsx`; link.click(); URL.revokeObjectURL(link.href);
    showToast(`${visibleJobs.length} ${visibleJobs.length === 1 ? "row" : "rows"} exported to Excel`);
  };

  const activeCount = jobs.filter((job) => job.status === "Applied" || job.status === "Interview").length;
  const interviewCount = jobs.filter((job) => job.status === "Interview").length;
  const isLoadingJobs = loadState === "loading";
  const hasLoadError = loadState === "error";
  const activityYears = useMemo(() => Array.from(new Set([new Date().getFullYear(), ...jobs.map((job) => Number(job.date.slice(0, 4)))] )).sort((a, b) => b - a), [jobs]);
  const activity = useMemo(() => jobs.reduce<Record<string, number>>((counts, job) => {
    counts[job.date] = (counts[job.date] || 0) + 1; return counts;
  }, {}), [jobs]);
  const heatmapDays = useMemo(() => yearDays(activityYear), [activityYear]);
  const yearApplications = jobs.filter((job) => job.date.startsWith(`${activityYear}-`)).length;
  const activeDays = Object.entries(activity).filter(([date, count]) => date.startsWith(`${activityYear}-`) && count > 0).length;

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#"><span className="brandMark">J</span><span>Jobfolio</span></a>
        <button className="mainActionButton" onClick={openAdd} aria-label="Add a new job application"><span className="mainActionIcon" aria-hidden="true">＋</span><span className="mainActionCopy"><strong>Add application</strong><small>Track a new opportunity</small></span></button>
        <div className="headerActions"><span className={`localBadge ${hasLoadError ? "warning" : ""}`}><i /> {isLoadingJobs ? "Loading database" : hasLoadError ? "Database retry needed" : "Loaded from database"}</span><button className="iconButton" onClick={exportData} aria-label="Download backup" title="Download backup">↓</button></div>
      </header>

      <section className="stats" aria-label="Application summary">
        <div className="statCard accent"><span className="statIcon">↗</span><div><strong>{jobs.length}</strong><span>Total applications</span></div><small>All time</small></div>
        <div className="statCard"><span className="statIcon warm">◎</span><div><strong>{activeCount}</strong><span>Active pursuits</span></div><small>Keep going</small></div>
        <div className="statCard"><span className="statIcon blue">◇</span><div><strong>{interviewCount}</strong><span>Interviews</span></div><small>{interviewCount ? "Great momentum" : "Coming soon"}</small></div>
        <div className="statCard quote"><p>“Success is the sum of small efforts, repeated day in and day out.”</p><span>— Robert Collier</span></div>
      </section>

      {migration.status !== "hidden" && <section className={`migrationBanner migration-${migration.status}`} aria-live="polite">
        <div>
          <p className="eyebrow">LOCAL DATA MIGRATION</p>
          <h2>{migration.status === "complete" ? "Existing applications imported" : "Import existing applications"}</h2>
          <p>{migration.status === "complete"
            ? `${migration.count} browser-saved ${migration.count === 1 ? "application is" : "applications are"} now in the database. A JSON backup was preserved.`
            : migration.status === "error"
              ? migration.error
              : `${migration.count} browser-saved ${migration.count === 1 ? "application was" : "applications were"} found. A JSON backup will be saved before importing.`}</p>
        </div>
        {migration.status !== "complete" && <button onClick={() => void importLegacyApplications()} disabled={migration.status === "importing"}>
          {migration.status === "importing" ? "Importing..." : "Import existing applications"}
        </button>}
      </section>}

      <section className="activitySection" aria-labelledby="activity-title">
        <div className="activityHeader">
          <div><p className="eyebrow">APPLICATION RHYTHM</p><h2 id="activity-title">Your year in applications</h2><p>{yearApplications} {yearApplications === 1 ? "application" : "applications"} across {activeDays} active {activeDays === 1 ? "day" : "days"}</p></div>
          <label className="yearPicker"><span>Year</span><select value={activityYear} onChange={(event) => setActivityYear(Number(event.target.value))}>{activityYears.map((year) => <option key={year}>{year}</option>)}</select></label>
        </div>
        <div className="heatmapScroll">
          <div className="heatmapFrame">
            <div className="monthLabels" aria-hidden="true">{Array.from({ length: 12 }, (_, month) => {
              const janFirst = new Date(activityYear, 0, 1); const gridStart = new Date(activityYear, 0, 1 - janFirst.getDay());
              const monthStart = new Date(activityYear, month, 1); const week = Math.floor((monthStart.getTime() - gridStart.getTime()) / 604800000) + 1;
              return <span key={month} style={{ gridColumn: week }}>{monthStart.toLocaleDateString(undefined, { month: "short" })}</span>;
            })}</div>
            <div className="heatmapBody">
              <div className="weekdayLabels" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
              <div className="heatmapGrid" role="grid" aria-label={`${activityYear} job application activity`}>
                {heatmapDays.map((day) => {
                  const key = dateKey(day); const count = activity[key] || 0; const inYear = day.getFullYear() === activityYear;
                  const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
                  const label = `${day.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}: ${count} ${count === 1 ? "application" : "applications"}`;
                  return <span key={key} className={`heatDay level-${level}${inYear ? "" : " outsideYear"}`} title={inYear ? label : ""} role="gridcell" aria-label={inYear ? label : undefined} />;
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="heatmapFooter"><span>Each square is one day</span><div className="legend"><span>Less</span>{[0,1,2,3,4].map((level) => <i key={level} className={`heatDay level-${level}`} />)}<span>More</span></div></div>
      </section>

      <section className="tracker">
        <div className="sectionHeading"><div><p className="eyebrow">APPLICATIONS</p><h2>Your opportunities</h2></div><span>{visibleJobs.length} {visibleJobs.length === 1 ? "role" : "roles"}</span></div>
        <div className="toolbar">
          <label className="search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by role or company…" aria-label="Search applications" /></label>
          <div className="toolbarActions"><div className="filters" aria-label="Filter by status">{(["All", ...statusOrder] as const).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><button className="excelButton" onClick={exportExcel} disabled={!visibleJobs.length} title="Export the visible grid rows to Excel"><span>▦</span> Export Excel</button></div>
        </div>

        {isLoadingJobs ? <div className="empty loadingState" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /><h3>Loading opportunities</h3><p>Pulling your saved applications from the database.</p></div>
        : hasLoadError ? <div className="empty errorState" role="alert"><span>!</span><h3>Could not load opportunities</h3><p>{loadError}</p><button onClick={loadJobs}>Retry</button></div>
        : jobs.length ? <div className="tableWrap"><table><thead>
          <tr className="columnHeadings">
            <th><button className={sort.key === "opportunity" ? "sorted" : ""} onClick={() => changeSort("opportunity")}>Opportunity<span>{sortMark("opportunity")}</span></button></th>
            <th><button className={sort.key === "date" ? "sorted" : ""} onClick={() => changeSort("date")}>Date applied<span>{sortMark("date")}</span></button></th>
            <th><button className={sort.key === "status" ? "sorted" : ""} onClick={() => changeSort("status")}>Status<span>{sortMark("status")}</span></button></th>
            <th><button className={sort.key === "notes" ? "sorted" : ""} onClick={() => changeSort("notes")}>Notes<span>{sortMark("notes")}</span></button></th>
            <th>{hasColumnFilters && <button className="clearFilters" onClick={() => setColumnFilters({ opportunity: "", date: "", status: "All", notes: "" })}>Clear</button>}<span className="srOnly">Actions</span></th>
          </tr>
          <tr className="columnFilters">
            <th><input value={columnFilters.opportunity} onChange={(e) => setColumnFilters({ ...columnFilters, opportunity: e.target.value })} placeholder="Filter role, company or URL" aria-label="Filter opportunities" /></th>
            <th><input type="date" value={columnFilters.date} onChange={(e) => setColumnFilters({ ...columnFilters, date: e.target.value })} aria-label="Filter by application date" /></th>
            <th><select value={columnFilters.status} onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value as Status | "All" })} aria-label="Filter by column status"><option>All</option>{statusOrder.map((status) => <option key={status}>{status}</option>)}</select></th>
            <th><input value={columnFilters.notes} onChange={(e) => setColumnFilters({ ...columnFilters, notes: e.target.value })} placeholder="Filter notes" aria-label="Filter notes" /></th><th />
          </tr>
        </thead><tbody>
          {visibleJobs.map((job) => {
            const isDeleting = deletingIds.has(job.id);
            const isSavingStatus = savingStatusIds.has(job.id);
            return <tr key={job.id} className={isDeleting ? "rowSaving" : ""}>
            <td><div className="opportunity"><span className="companyAvatar">{job.company.slice(0, 1).toUpperCase()}</span><div>{job.url ? <a className="jobTitleLink" href={job.url.startsWith("http") ? job.url : `https://${job.url}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${job.title} at ${job.company} in a new tab`}><strong>{job.title}<span className="newTabMark" aria-hidden="true">↗</span></strong></a> : <strong>{job.title}</strong>}<span>{job.company}</span></div></div></td>
            <td>{new Date(`${job.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
            <td><div className="statusCell"><select className={`statusSelect status-${job.status.toLowerCase()}`} value={job.status} disabled={isSavingStatus || isDeleting} onChange={(e) => void updateStatus(job, e.target.value as Status)}>{statusOrder.map((status) => <option key={status}>{status}</option>)}</select>{isSavingStatus && <span className="savingPill">Saving</span>}</div></td>
            <td className="notesCell">{job.notes || <span>—</span>}</td>
            <td><div className="rowActions"><button disabled={isDeleting || isSavingStatus} onClick={() => openEdit(job)} aria-label={`Edit ${job.title}`}>Edit</button><button className="delete" disabled={isDeleting || isSavingStatus} onClick={() => void removeJob(job.id)} aria-label={`Delete ${job.title}`}>{isDeleting ? "..." : "×"}</button></div></td>
          </tr>;
          })}
          {!visibleJobs.length && <tr><td colSpan={5}><div className="empty tableEmpty"><span>✦</span><h3>No matching opportunities</h3><p>Adjust or clear a filter to see more roles.</p>{hasColumnFilters && <button onClick={() => setColumnFilters({ opportunity: "", date: "", status: "All", notes: "" })}>Clear column filters</button>}</div></td></tr>}
        </tbody></table></div> : <div className="empty"><span>✦</span><h3>No opportunities here yet</h3><p>Add your first application to start tracking.</p><button onClick={openAdd}>Add application</button></div>}
      </section>

      <section className="hero heroBottom">
        <div><p className="eyebrow">YOUR CAREER COMMAND CENTER</p><h1>Make your next move<br/><em>the right one.</em></h1><p className="heroCopy">Keep every opportunity organized, follow up with confidence, and turn applications into offers.</p></div>
        <figure className="careerVisual"><img src="/career-command-center.png" alt="Professional working at a desk with plants and an upward growth chart" /><figcaption className="srOnly">Career growth and focused job-search progress</figcaption></figure>
      </section>

      {dialogOpen && <div className="modalBackdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !formSaving && setDialogOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modalHeader"><div><p className="eyebrow">OPPORTUNITY DETAILS</p><h2 id="modal-title">{editingId ? "Edit application" : "Add an application"}</h2></div><button className="closeButton" disabled={formSaving} onClick={() => setDialogOpen(false)} aria-label="Close">×</button></div>
        <form onSubmit={saveJob}>
          <fieldset className="formFields" disabled={formSaving}>
          <div className="formGrid"><label>Job title<input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior Product Designer" /></label><label>Company<input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Acme Studio" /></label></div>
          <div className="formGrid"><label>Date applied<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>{statusOrder.map((status) => <option key={status}>{status}</option>)}</select></label></div>
          <label>Job URL<input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://company.com/jobs/…" /></label>
          <label>Notes <span className="optional">Optional</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contacts, next steps, salary range…" rows={3} /></label>
          </fieldset>
          {formError && <p className="formError" role="alert">{formError}</p>}
          <div className="formActions"><button type="button" disabled={formSaving} onClick={() => setDialogOpen(false)}>Cancel</button><button className="primaryButton" disabled={formSaving} type="submit">{formSaving ? "Saving..." : editingId ? "Save changes" : "Add application"}</button></div>
        </form>
      </div></div>}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      <footer><span>Jobfolio</span><p>Your applications load from the local D1 database.</p></footer>
    </main>
  );
}
