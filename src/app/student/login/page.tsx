import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { Input, Label } from "@/components/ui/input";
import { hostLoginAction } from "@/lib/host-actions";
import { getHostStudent } from "@/lib/host-auth";

export const dynamic = "force-dynamic";

export default async function StudentLoginPage() {
  if (await getHostStudent()) redirect("/student");

  return (
    <AuthShell title="Host student sign-in" subtitle="Enter your roll number and CNIC.">
      <AuthForm action={hostLoginAction} submitLabel="Sign in">
        <div className="space-y-1.5">
          <Label htmlFor="rollNumber">Roll number</Label>
          <Input id="rollNumber" name="rollNumber" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cnic">CNIC</Label>
          <Input id="cnic" name="cnic" required />
        </div>
      </AuthForm>
    </AuthShell>
  );
}
