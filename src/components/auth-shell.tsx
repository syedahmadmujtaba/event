import { Card } from "@/components/ui/card";

// Split layout: energetic brand panel + focused form card.
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute -right-16 -top-16 size-72 rounded-full bg-accent/40 blur-2xl" />
        <div className="absolute -bottom-24 -left-10 size-80 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-white/15 font-display text-lg font-bold">
            E
          </span>
          <span className="font-display text-xl font-bold">Eventide</span>
        </div>
        <div className="relative max-w-sm">
          <h2 className="font-display text-3xl font-bold leading-tight">
            One system of record for every delegation, payment, and pass.
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Approvals, verifications, and credentials — all in one place.
          </p>
        </div>
        <div className="relative text-sm text-primary-foreground/70">
          Host School · Admin console
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 lg:hidden flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
              E
            </span>
            <span className="font-display text-xl font-bold">Eventide</span>
          </div>
          <Card className="p-6">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              {title}
            </h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}
