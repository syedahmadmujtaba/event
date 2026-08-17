"use client";

import { Trash } from "lucide-react";
import { deleteParticipant } from "@/lib/coordinator-actions";
import { Button } from "@/components/ui/button";

export function DeleteStudentButton({
  regId,
  participantId,
  name,
}: {
  regId: string;
  participantId: string;
  name: string;
}) {
  return (
    <form
      action={deleteParticipant}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Remove "${name}" and their game registrations? This cannot be undone.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="regId" value={regId} />
      <input type="hidden" name="participantId" value={participantId} />
      <Button size="sm" variant="danger">
        <Trash className="size-4" /> Delete
      </Button>
    </form>
  );
}