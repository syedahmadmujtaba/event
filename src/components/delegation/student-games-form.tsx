"use client";

import { useActionState } from "react";
import { setStudentGames } from "@/lib/coordinator-actions";
import { Button } from "@/components/ui/button";

export function StudentGamesForm({
  regId,
  participantId,
  activities,
  registered,
}: {
  regId: string;
  participantId: string;
  activities: { id: string; name: string }[];
  registered: string[];
}) {
  const [error, formAction, pending] = useActionState(
    async (_prev: string, formData: FormData) => await setStudentGames(formData),
    "",
  );
  const checked = new Set(registered);

  return (
    <form action={formAction} className="mt-3 rounded-lg bg-surface-muted p-4">
      <input type="hidden" name="regId" value={regId} />
      <input type="hidden" name="participantId" value={participantId} />
      <p className="text-xs font-medium text-muted-foreground">Games</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {activities.map((a) => (
          <label key={a.id} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              name="activityId"
              value={a.id}
              defaultChecked={checked.has(a.id)}
              className="size-4 accent-[var(--primary)]"
            />
            {a.name}
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-status-rejected-tint px-3 py-2 text-sm text-status-rejected">
          {error}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <Button size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save games"}
        </Button>
      </div>
    </form>
  );
}