import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Input, Label } from "@/components/ui/input";
import { login } from "@/lib/auth-actions";
import { getCurrentUser, userCount } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  if (await getCurrentUser()) redirect("/admin");
  if ((await userCount()) === 0) redirect("/setup");

  const { verified } = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to the admin console.">
      {verified === "1" && (
        <p className="mb-4 rounded-lg bg-status-verified-tint px-3 py-2 text-sm text-status-verified">
          Email verified — your delegation is now awaiting admin approval.
        </p>
      )}
      {verified === "0" && (
        <p className="mb-4 rounded-lg bg-status-rejected-tint px-3 py-2 text-sm text-status-rejected">
          That verification link is invalid or expired.
        </p>
      )}
      <AuthForm action={login} submitLabel="Sign in">
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
            autoComplete="current-password"
            required
          />
        </div>
      </AuthForm>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Registering a school?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Register your delegation
        </Link>
      </p>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Host student?{" "}
        <Link href="/student/login" className="font-medium text-primary hover:underline">
          Sign in with roll number
        </Link>
      </p>
    </AuthShell>
  );
}
