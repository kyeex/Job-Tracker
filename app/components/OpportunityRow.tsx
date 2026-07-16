import { JOB_STATUSES } from "@/lib/jobs/constants";
import type { Job, Status } from "@/lib/jobs/types";

type Props = {
  job: Job;
  isDeleting: boolean;
  isSavingStatus: boolean;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onStatusChange: (job: Job, status: Status) => void;
};

export function OpportunityRow({ job, isDeleting, isSavingStatus, onEdit, onDelete, onStatusChange }: Props) {
  const isBusy = isDeleting || isSavingStatus;
  const displayDate = new Date(`${job.date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <tr className={isDeleting ? "rowSaving" : ""}>
      <td>
        <div className="opportunity">
          <span className="companyAvatar">{job.company.slice(0, 1).toUpperCase()}</span>
          <div>
            {job.url ? (
              <a
                className="jobTitleLink"
                href={job.url.startsWith("http") ? job.url : `https://${job.url}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${job.title} at ${job.company} in a new tab`}
              >
                <strong>
                  {job.title}
                  <span className="newTabMark" aria-hidden="true">↗</span>
                </strong>
              </a>
            ) : (
              <strong>{job.title}</strong>
            )}
            <span>{job.company}</span>
          </div>
        </div>
      </td>
      <td>{displayDate}</td>
      <td>
        <div className="statusCell">
          <select
            className={`statusSelect status-${job.status.toLowerCase()}`}
            value={job.status}
            disabled={isBusy}
            onChange={(event) => onStatusChange(job, event.target.value as Status)}
            aria-label={`Status for ${job.title}`}
          >
            {JOB_STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          {isSavingStatus && <span className="savingPill">Saving</span>}
        </div>
      </td>
      <td className="notesCell">{job.notes || <span>—</span>}</td>
      <td>
        <div className="rowActions">
          <button type="button" disabled={isBusy} onClick={() => onEdit(job)} aria-label={`Edit ${job.title}`}>
            Edit
          </button>
          <button
            type="button"
            className="delete"
            disabled={isBusy}
            onClick={() => onDelete(job.id)}
            aria-label={`Delete ${job.title}`}
          >
            {isDeleting ? "..." : "×"}
          </button>
        </div>
      </td>
    </tr>
  );
}
