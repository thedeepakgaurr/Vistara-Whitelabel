export function AuthShell({
  brandName,
  title,
  subtitle,
  children,
  footer,
}: {
  brandName: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(600px circle at 15% 10%, var(--primary-soft), transparent 60%), radial-gradient(500px circle at 85% 90%, var(--primary-soft), transparent 55%)',
        }}
      />
      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm shadow-primary/30">
            {brandName[0]}
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(16,16,20,0.04)]">
          {children}
        </div>

        <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </div>
  );
}
