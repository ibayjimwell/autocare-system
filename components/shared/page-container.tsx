'use client';

interface PageContainerProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageContainer({
  title,
  subtitle,
  actions,
  children,
}: PageContainerProps) {
  return (
    <section className="flex h-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Header ---- */}
      {/* Kept disabled as in the current build — the app Header already renders page context. */}
      {/* <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          {title && (
            <h1 className="text-2xl md:text-xl lg:text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div> */}

      {/* ---- Content ---- */}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}