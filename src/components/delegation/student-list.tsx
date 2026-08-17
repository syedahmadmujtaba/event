"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { StudentGamesForm } from "./student-games-form";
import { EditStudentDialog } from "./edit-student-dialog";
import { DeleteStudentButton } from "./delete-student-button";

type Student = {
  id: string;
  name: string;
  gender: string | null;
  idNumber: string | null;
  dob: string | null;
};

type Game = { activityId: string; name: string; status: string };

const ageFromDob = (dob: string | null) =>
  dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31_556_952_000) : null;

export function StudentList({
  regId,
  students,
  activities,
  games,
}: {
  regId: string;
  students: Student[];
  activities: { id: string; name: string }[];
  games: Record<string, Game[]>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {students.map((s) => {
        const open = openId === s.id;
        const g = games[s.id] ?? [];
        return (
          <div key={s.id} className="overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : s.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3.5 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{s.name}</span>
                {s.gender && (
                  <span className="text-xs capitalize text-muted-foreground">{s.gender}</span>
                )}
                {s.dob && (
                  <span className="text-xs text-muted-foreground">
                    Age {ageFromDob(s.dob)}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {g.length} game{g.length === 1 ? "" : "s"}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </span>
            </button>

            {open && (
              <div className="space-y-4 border-t border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {s.dob && <span>DOB {s.dob}</span>}
                  {s.idNumber && <span>CNIC / B-Form: {s.idNumber}</span>}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {g.map((rr) => (
                    <span key={rr.activityId} className="inline-flex items-center gap-1">
                      <Badge tone="neutral">{rr.name}</Badge>
                      <StatusBadge status={rr.status} />
                    </span>
                  ))}
                  {g.length === 0 && (
                    <p className="text-xs text-muted-foreground">Not registered for any game yet.</p>
                  )}
                </div>

                {activities.length > 0 && (
                  <StudentGamesForm
                    regId={regId}
                    participantId={s.id}
                    activities={activities}
                    registered={g.map((rr) => rr.activityId)}
                  />
                )}

                <div className="flex items-center gap-2">
                  <EditStudentDialog
                    regId={regId}
                    participant={{
                      id: s.id,
                      name: s.name,
                      idNumber: s.idNumber,
                      gender: s.gender,
                      dob: s.dob,
                    }}
                  />
                  <DeleteStudentButton regId={regId} participantId={s.id} name={s.name} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}