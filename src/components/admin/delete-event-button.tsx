"use client";

import { Trash } from "lucide-react";
import { deleteEvent } from "@/lib/event-actions";
import { Button } from "@/components/ui/button";

export function DeleteEventButton({ eventId, name }: { eventId: string; name: string }) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Delete "${name}"? This also removes its activities, fee rules, registrations, teams and payments. This cannot be undone.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <Button size="sm" variant="danger">
        <Trash className="size-4" /> Delete
      </Button>
    </form>
  );
}