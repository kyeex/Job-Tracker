"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { JOB_STATUSES } from "@/lib/jobs/constants";
import type { Job, Status } from "@/lib/jobs/types";

type Props = {
  dialogOpen: boolean;
  editingId: string | null;
  form: Omit<Job, "id">;
  setForm: Dispatch<SetStateAction<Omit<Job, "id">>>;
  formSaving: boolean;
  formError: string;
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
};

export function ApplicationModal({
  dialogOpen,
  editingId,
  form,
  setForm,
  formSaving,
  formError,
  onClose,
  onSave,
}: Props) {
  if (!dialogOpen) {
    return null;
  }

  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !formSaving && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">OPPORTUNITY DETAILS</p>
            <h2 id="modal-title">{editingId ? "Edit application" : "Add an application"}</h2>
          </div>
          <button className="closeButton" disabled={formSaving} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={onSave}>
          <fieldset className="formFields" disabled={formSaving}>
            <div className="formGrid">
              <label>
                Job title
                <input
                  required
                  autoFocus
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Product Designer"
                />
              </label>
              <label>
                Company
                <input
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="e.g. Acme Studio"
                />
              </label>
            </div>
            <div className="formGrid">
              <label>
                Date applied
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
                  {JOB_STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Job URL
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://company.com/jobs/…"
              />
            </label>
            <label>
              Notes <span className="optional">Optional</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Contacts, next steps, salary range…"
                rows={3}
              />
            </label>
          </fieldset>
          {formError && (
            <p className="formError" role="alert">
              {formError}
            </p>
          )}
          <div className="formActions">
            <button type="button" disabled={formSaving} onClick={onClose}>
              Cancel
            </button>
            <button className="primaryButton" disabled={formSaving} type="submit">
              {formSaving ? "Saving..." : editingId ? "Save changes" : "Add application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
