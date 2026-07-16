import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-muted-foreground",
        pending: "bg-status-pending-tint text-status-pending",
        verified: "bg-status-verified-tint text-status-verified",
        rejected: "bg-status-rejected-tint text-status-rejected",
        info: "bg-status-info-tint text-status-info",
        brand: "bg-primary-tint text-primary",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type Tone = NonNullable<VariantProps<typeof badge>["tone"]>;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/*
  Maps the app's status strings (§8 state machine) to a tone + label.
  ponytail: single source of truth so every table/queue renders status the same way.
  Statuses evolve during dev — extend this map, not each call site.
*/
const STATUS: Record<string, { tone: Tone; label: string }> = {
  pending: { tone: "pending", label: "Pending" },
  payment_submitted: { tone: "info", label: "Payment submitted" },
  submitted: { tone: "info", label: "Submitted" },
  approved: { tone: "verified", label: "Approved" },
  verified: { tone: "verified", label: "Verified" },
  rejected: { tone: "rejected", label: "Rejected" },
  payment_rejected: { tone: "rejected", label: "Payment rejected" },
  scheduled: { tone: "info", label: "Scheduled" },
  ongoing: { tone: "brand", label: "Ongoing" },
  completed: { tone: "verified", label: "Completed" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
