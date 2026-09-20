'use client';

import React from "react";

import {
  Loader2,
  Receipt,
  Wrench,
} from "lucide-react";

import {
  cn,
} from "@/lib/utils";

type ProcessingAction =
  | "SUBMIT_TO_BILLING"
  | "COMPLETE_WORK";

interface ServiceTrackingLoadingModalProps {
  open: boolean;
  action: ProcessingAction;
}

const ACTION_CONTENT: Record<
  ProcessingAction,
  {
    title: string;
    description: string;
    icon: React.ElementType;
  }
> = {
  SUBMIT_TO_BILLING: {
    title: "Sending Costing",
    description:
      "Please wait while the estimated costing is being submitted to billing.",
    icon: Receipt,
  },

  COMPLETE_WORK: {
    title: "Completing Job",
    description:
      "Please wait while the Final Cost is being generated and the job is being completed.",
    icon: Wrench,
  },
};

export default function ServiceTrackingLoadingModal({
  open,
  action,
}: ServiceTrackingLoadingModalProps) {
  if (!open) {
    return null;
  }

  const content =
    ACTION_CONTENT[action];

  const ActionIcon =
    content.icon;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-tracking-loading-title"
      aria-describedby="service-tracking-loading-description"
      aria-busy="true"
    >
      <div
        className={cn(
          "w-full max-w-sm",
          "rounded-2xl border border-border",
          "bg-card shadow-2xl"
        )}
      >
        <div className="flex flex-col items-center px-6 py-8 text-center sm:px-8 sm:py-9">
          {/* =====================================================
              ICON / SPINNER
          ====================================================== */}

          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ActionIcon className="h-7 w-7" />

            <span
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              aria-hidden="true"
            />

            <Loader2
              className="absolute -right-1 -top-1 h-6 w-6 animate-spin text-primary"
              aria-hidden="true"
            />
          </div>

          {/* =====================================================
              TITLE
          ====================================================== */}

          <h2
            id="service-tracking-loading-title"
            className="mt-5 text-lg font-semibold tracking-tight text-foreground"
          >
            {content.title}
          </h2>

          {/* =====================================================
              DESCRIPTION
          ====================================================== */}

          <p
            id="service-tracking-loading-description"
            className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground"
          >
            {content.description}
          </p>

          {/* =====================================================
              STATUS
          ====================================================== */}

          <div className="mt-5 flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-2">
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-primary"
              aria-hidden="true"
            />

            <span className="text-xs font-medium text-muted-foreground">
              Processing request...
            </span>
          </div>

          {/* =====================================================
              NON-DISMISSIBLE NOTICE
          ====================================================== */}

          <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
            Please do not close this page or submit the action again
            while the request is processing.
          </p>
        </div>
      </div>
    </div>
  );
}