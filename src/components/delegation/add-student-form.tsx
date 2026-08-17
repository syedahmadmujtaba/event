"use client";

import { useActionState } from "react";
import { addParticipant } from "@/lib/coordinator-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddStudentForm({
  regId,
  activities,
}: {
  regId: string;
  activities: { id: string; name: string }[];
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string, formData: FormData) => await addParticipant(formData),
    "",
  );

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-border p-5">
      <input type="hidden" name="regId" value={regId} />
      <p className="text-sm font-semibold">Add student</p>
      <div className="flex flex-wrap items-end gap-3">
        <Input name="name" placeholder="Student name" className="h-10 w-52" required />
        <Input
          name="idNumber"
          placeholder="CNIC / smart card / B-form"
          className="h-10 w-60"
          required
        />
        <select
          name="gender"
          required
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary"
        >
          <option value="" disabled>
            Gender
          </option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <Input name="dob" type="date" className="h-10 w-40" aria-label="Date of birth" required />
      </div>
      <p className="text-xs text-muted-foreground">
        Add a date of birth — age is derived from it. Tick games to register this
        student for them now.
      </p>
      {activities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Register for games</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {activities.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="activityId"
                  value={a.id}
                  className="size-4 accent-[var(--primary)]"
                />
                {a.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p className="rounded-lg bg-status-rejected-tint px-3 py-2 text-sm text-status-rejected">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add student"}
        </Button>
      </div>
    </form>
  );
}