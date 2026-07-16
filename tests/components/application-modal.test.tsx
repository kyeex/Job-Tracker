import { useState, type FormEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApplicationModal } from "@/app/components/ApplicationModal";
import type { Job } from "@/lib/jobs/types";
import { describe, expect, it, vi } from "vitest";

const emptyForm: Omit<Job, "id"> = {
  date: "2026-07-16",
  title: "",
  company: "",
  url: "",
  status: "Applied",
  notes: "",
};

function ModalHarness({ onSave, onClose }: { onSave: (form: Omit<Job, "id">) => void; onClose: () => void }) {
  const [form, setForm] = useState(emptyForm);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <ApplicationModal
      dialogOpen
      editingId={null}
      form={form}
      setForm={setForm}
      formSaving={false}
      formError=""
      onClose={onClose}
      onSave={save}
    />
  );
}

describe("ApplicationModal behavior", () => {
  it("collects application details and submits the controlled form", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ModalHarness onSave={onSave} onClose={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: "Job title" }), "Staff Engineer");
    await user.type(screen.getByRole("textbox", { name: "Company" }), "Acme Labs");
    await user.type(screen.getByRole("textbox", { name: "Job URL" }), "https://example.com/staff");
    await user.selectOptions(screen.getByRole("combobox", { name: "Status" }), "Interview");
    await user.type(screen.getByRole("textbox", { name: /Notes/i }), "Recruiter screen Friday");
    await user.click(screen.getByRole("button", { name: "Add application" }));

    expect(onSave).toHaveBeenCalledWith({
      date: "2026-07-16",
      title: "Staff Engineer",
      company: "Acme Labs",
      url: "https://example.com/staff",
      status: "Interview",
      notes: "Recruiter screen Friday",
    });
  });

  it("closes from Cancel without submitting", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ModalHarness onSave={onSave} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });
});
