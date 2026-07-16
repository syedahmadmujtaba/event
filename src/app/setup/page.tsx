import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { Input, Label } from "@/components/ui/input";
import { createFirstAdmin } from "@/lib/auth-actions";
import { userCount } from "@/lib/auth";

// Must re-check the DB on every request (redirects once setup is done).
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/login");

  return (
    <AuthShell
      title="Create your admin account"
      subtitle="First-run setup — this becomes the Super Admin."
    >
      <AuthForm action={createFirstAdmin} submitLabel="Create account">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
      </AuthForm>
    </AuthShell>
  );
}
