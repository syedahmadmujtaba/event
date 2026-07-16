import { AuthShell } from "@/components/auth-shell";

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      subtitle="We sent you a verification link."
    >
      <p className="text-sm text-muted-foreground">
        Click the link in that email to confirm your address. Once confirmed, an
        admin will review your delegation and you&apos;ll hear back by email.
      </p>
    </AuthShell>
  );
}
