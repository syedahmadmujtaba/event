"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthState } from "@/lib/auth-actions";

export function AuthForm({
  action,
  submitLabel,
  children,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state.error && (
        <p className="rounded-lg bg-status-rejected-tint px-3 py-2 text-sm text-status-rejected">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}
