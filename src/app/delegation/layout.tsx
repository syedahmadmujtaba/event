import { requireUser } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

export default async function DelegationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
            E
          </span>
          <span className="font-display text-lg font-bold">Eventide</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Sign out"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
