"use client";

import { useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateEvent } from "@/lib/event-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REGISTRATION_TARGETS } from "@/lib/registration-targets";

const TARGET_LABELS: Record<string, string> = {
  delegation: "Visiting school delegations",
  host_student: "Host students",
  visitor: "Visitors / spectators",
};

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary";

export type EditEventData = {
  id: string;
  name: string;
  type: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  registerableBy: string[];
  maxActivitiesPerParticipant: number | null;
};

export function EditEventDialog({ event, alignEnd }: { event: EditEventData; alignEnd?: boolean }) {
  const [open, setOpen] = useState(false);

  // Escape closes; lock body scroll while open.
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

  const editAndClose = async (formData: FormData) => {
    await updateEvent(formData);
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        {...(alignEnd ? { className: "self-end" } : {})}
      >
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
            aria-labelledby={`edit-event-title-${event.id}`}
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                id={`edit-event-title-${event.id}`}
                className="font-display text-lg font-bold tracking-tight"
              >
                Edit event
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

            <form action={editAndClose} className="space-y-5 overflow-y-auto p-5">
              <input type="hidden" name="eventId" value={event.id} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required defaultValue={event.name} autoFocus />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="type">Type</Label>
                  <Input id="type" name="type" defaultValue={event.type ?? ""} placeholder="Sports / Gala / …" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" defaultValue={event.startDate ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" defaultValue={event.endDate ?? ""} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" name="status" className={SELECT_CLASS} defaultValue={event.status}>
                    <option value="open">Open — live for registration</option>
                    <option value="draft">Draft — hidden</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxActivitiesPerParticipant">
                    Max activities per participant
                  </Label>
                  <Input
                    id="maxActivitiesPerParticipant"
                    name="maxActivitiesPerParticipant"
                    type="number"
                    min={1}
                    placeholder="No limit"
                    defaultValue={event.maxActivitiesPerParticipant ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Who can register</h3>
                <p className="text-xs text-muted-foreground">
                  Groups who will see and can register for this event.
                </p>
                <div className="space-y-2">
                  {REGISTRATION_TARGETS.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="target"
                        value={t}
                        defaultChecked={event.registerableBy.includes(t)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      {TARGET_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}