'use client';
/**
 * PageContainer – Wraps every dashboard page.
 *
 * Props:
 *   title:    Main heading
 *   subtitle: Supporting description (optional)
 *   actions:  JSX node placed on the right side of the header
 *   children: Page content
 */
export default function PageContainer({ actions, children }) {
  return (
    <section className="flex flex-col h-full gap-6 p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>

      {/* ---- Content ---- */}
      <div className="flex-1">{children}</div>
    </section>
  );
}