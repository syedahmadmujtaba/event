import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { requireUser, isAdmin } from "@/lib/auth";
import { logout } from "@/lib/auth-actions";
import { LogOut } from "lucide-react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/delegation");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur">
          <div className="md:hidden font-display text-lg font-bold">Eventide</div>
          <div className="hidden md:block text-sm text-muted-foreground">
            Host School · Admin console
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-accent-tint text-accent text-sm font-semibold">
              {initials(user.name)}
            </span>
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
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
