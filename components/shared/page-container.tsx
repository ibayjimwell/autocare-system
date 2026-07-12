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
    <section className="flex flex-col h-full gap-6 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {title && (
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1">{children}</div>
    </section>
  );
}