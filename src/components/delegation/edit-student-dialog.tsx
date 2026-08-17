"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Pencil, X } from "lucide-react";
import { updateParticipant } from "@/lib/coordinator-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EditStudentDialog({
  regId,
  participant,
}: {
  regId: string;
  participant: { id: string; name: string; idNumber: string | null; gender: string | null; dob: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState(
    async (_prev: string, formData: FormData) => {
      const err = await updateParticipant(formData);
      if (!err) setOpen(false);
      return err;
    },
    "",
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Edit
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-student-title-${participant.id}`}
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                id={`edit-student-title-${participant.id}`}
                className="font-display text-lg font-bold tracking-tight"
              >
                Edit student
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4 p-5">
              <input type="hidden" name="regId" value={regId} />
              <input type="hidden" name="participantId" value={participant.id} />
              <div className="space-y-1.5">
                <Label htmlFor="name">Student name</Label>
                <Input id="name" name="name" required defaultValue={participant.name} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idNumber">CNIC / smart card / B-form</Label>
                <Input
                  id="idNumber"
                  name="idNumber"
                  required
                  defaultValue={participant.idNumber ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  name="gender"
                  required
                  defaultValue={participant.gender ?? ""}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
                >
                  <option value="" disabled>
                    Gender
                  </option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth</Label>
                <Input id="dob" name="dob" type="date" required defaultValue={participant.dob ?? ""} />
              </div>
              {error && (
                <p className="rounded-lg bg-status-rejected-tint px-3 py-2 text-sm text-status-rejected">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}