import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ReceiptText,
  UserCheck,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

// ponytail: placeholder figures until the DB + queues land (Phase 2+).
const STATS = [
  { label: "Pending approvals", value: "12", icon: Users, tone: "pending" },
  { label: "Payments to verify", value: "8", icon: ReceiptText, tone: "info" },
  { label: "Registered participants", value: "1,204", icon: UserCheck, tone: "brand" },
  { label: "Revenue collected", value: "Rs 486,000", icon: Wallet, tone: "verified" },
] as const;

const QUEUE = [
  { name: "Beaconhouse — Boys Athletics", type: "Delegation", status: "pending" },
  { name: "City School — Gala Troupe", type: "Delegation", status: "payment_submitted" },
  { name: "Ali Raza (Roll 22-118)", type: "Host student", status: "payment_submitted" },
  { name: "LGS — Football Squad", type: "Delegation", status: "pending" },
];

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spring Sports Meet 2026 · overview at a glance
          </p>
        </div>
        <Button size="sm" variant="outline">
          View all events
          <ArrowUpRight />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Badge tone={tone}>
                  <Icon className="size-3.5" />
                </Badge>
              </div>
              <p className="mt-3 font-display text-3xl font-bold tracking-tight">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Needs your attention</CardTitle>
            <Button size="sm" variant="ghost">
              Open queue
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {QUEUE.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delegations</span>
              <span className="font-medium">18 approved</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Activities</span>
              <span className="font-medium">14</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Matches scheduled</span>
              <span className="font-medium">31</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Credentials issued</span>
              <span className="font-medium">1,042</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
