'use client';

import React from 'react';

import {
  FileText,
  StickyNote,
} from 'lucide-react';

import {
  cn,
} from '@/lib/utils';

/* ================================================================
   PROPS
================================================================ */

interface AppointmentNotesCardProps {
  notes?: string | null;

  className?: string;
}

/* ================================================================
   COMPONENT
================================================================ */

export default function AppointmentNotesCard({
  notes,
  className,
}: AppointmentNotesCardProps) {
  const normalizedNotes =
    notes?.trim() || '';

  /*
   * Do not render an empty Notes card.
   */
  if (!normalizedNotes) {
    return null;
  }

  return (
    <section
      className={cn(
        `
          w-full
          overflow-hidden
          rounded-lg
          border
          border-border
          bg-card
          shadow-sm
        `,
        className,
      )}
    >
      {/* ==========================================================
          HEADER
      =========================================================== */}

      <div
        className="
          flex
          items-center
          gap-2
          border-b
          border-border
          px-3
          py-2.5
        "
      >
        <div
          className="
            flex
            h-7
            w-7
            shrink-0
            items-center
            justify-center
            rounded-md
            bg-primary/10
          "
        >
          <StickyNote
            className="
              h-3.5
              w-3.5
              text-primary
            "
          />
        </div>

        <div className="min-w-0">
          <p
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-widest
              text-muted-foreground
            "
          >
            Appointment Notes
          </p>
        </div>
      </div>

      {/* ==========================================================
          CONTENT
      =========================================================== */}

      <div
        className="
          flex
          items-start
          gap-2.5
          p-3
        "
      >
        <FileText
          className="
            mt-0.5
            h-4
            w-4
            shrink-0
            text-muted-foreground
          "
        />

        <p
          className="
            min-w-0
            whitespace-pre-wrap
            break-words
            text-xs
            leading-5
            text-foreground
          "
        >
          {normalizedNotes}
        </p>
      </div>
    </section>
  );
}