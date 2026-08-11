"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { createEvent } from "@/lib/event-actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { REGISTRATION_TARGETS } from "@/lib/registration-targets";

const PAYER_LABELS: Record<string, string> = {
  host_student: "Host student",
  delegation_student: "Delegation student",
  delegation_registration: "Delegation registration",
  visitor: "Visitor",
};

const TARGET_LABELS: Record<string, string> = {
  delegation: "Visiting school delegations",
  host_student: "Host students",
  visitor: "Visitors / spectators",
};

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary";

export function NewEventDialog() {
  const [open, setOpen] = useState(false);
  const [activityRows, setActivityRows] = useState<number[]>([0]);
  const [feeRows, setFeeRows] = useState<number[]>([]);
  const nextActivityKey = useRef(1);
  const nextFeeKey = useRef(0);

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

  // Wrapped so the modal closes only after the server action completes.
  const createAndClose = async (formData: FormData) => {
    await createEvent(formData);
    setOpen(false);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New event
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
            aria-labelledby="new-event-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2
                id="new-event-title"
                className="font-display text-lg font-bold tracking-tight"
              >
                New event
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

            <form
              action={createAndClose}
              className="space-y-5 overflow-y-auto p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Spring Sports Meet 2026"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="type">Type</Label>
                  <Input id="type" name="type" placeholder="Sports / Gala / …" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" name="status" className={SELECT_CLASS} defaultValue="open">
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
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
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
                          defaultChecked
                          className="size-4 accent-[var(--primary)]"
                        />
                        {TARGET_LABELS[t]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Fee rules</h3>
                  <p className="text-xs text-muted-foreground">
                    One flat fee per payer type.
                  </p>
                  <div className="space-y-2">
                    {feeRows.map((key, i) => (
                      <div key={key} className="flex items-end gap-2">
                        <div className="flex-1 space-y-1.5">
                          <select name={`feePayer_${i}`} className={SELECT_CLASS} defaultValue="host_student">
                            {Object.entries(PAYER_LABELS).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24 space-y-1.5">
                          <Input
                            name={`feeAmount_${i}`}
                            type="number"
                            min={0}
                            required
                            placeholder="Rs"
                            aria-label="Amount"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Remove"
                          onClick={() => setFeeRows((r) => r.filter((k) => k !== key))}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                    {feeRows.length === 0 && (
                      <p className="text-xs text-muted-foreground">No fee rules.</p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFeeRows((r) => [...r, nextFeeKey.current++])}
                    >
                      <Plus className="size-4" /> Add fee rule
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Activities</h3>
                <div className="space-y-2">
                  {activityRows.map((key, i) => (
                    <div key={key} className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          name={`activityName_${i}`}
                          placeholder="Activity name"
                          aria-label="Activity name"
                        />
                      </div>
                      <div className="w-24 space-y-1.5">
                        <Input
                          name={`activityPrice_${i}`}
                          type="number"
                          min={0}
                          defaultValue={0}
                          placeholder="Rs"
                          aria-label="Activity price"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 pb-2.5 text-sm">
                        <input
                          type="checkbox"
                          name={`activityTeamBased_${i}`}
                          className="size-4 accent-[var(--primary)]"
                        />
                        Team
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        onClick={() =>
                          setActivityRows((r) => r.filter((k) => k !== key))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActivityRows((r) => [...r, nextActivityKey.current++])}
                  >
                    <Plus className="size-4" /> Add activity
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
