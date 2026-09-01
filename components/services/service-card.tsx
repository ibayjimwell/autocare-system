'use client';

import React, {
  useState,
  useEffect,
} from 'react';

import {
  servicesApi,
} from '@/lib/services/services';

import {
  Clock,
  Wrench,
  ClipboardList,
  Gauge,
  AlertCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  basePrice: string | number | null;
  estimatedDuration: number;
  durationMinutes?: number;
  active: boolean;
  type:
    | 'PMS'
    | 'REPAIR'
    | 'CHECKUP'
    | string;
  createdAt: string;
  updatedAt: string;
}

interface ServiceCardProps {
  serviceId: string;
  className?: string;
}

const SERVICE_TYPE_CONFIG: Record<
  string,
  {
    label: string;
    bg: string;
    text: string;
    icon: React.ComponentType<any>;
  }
> = {
  PMS: {
    label: 'PMS',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: ClipboardList,
  },

  REPAIR: {
    label: 'Repair',
    bg: 'bg-primary/10 dark:bg-primary/20',
    text: 'text-primary',
    icon: Wrench,
  },

  CHECKUP: {
    label: 'Checkup',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: Gauge,
  },
};

export default function ServiceCard({
  serviceId,
  className,
}: ServiceCardProps) {
  const [service, setService] =
    useState<ServiceData | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }

    async function fetchService() {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await servicesApi.get(
            serviceId
          );

        const data =
          response?.data ||
          response?.service ||
          response;

        if (
          data &&
          data.name
        ) {
          setService(data);
        } else {
          setError(
            'Service configuration not found.'
          );
        }
      } catch (err) {
        setError(
          'Failed to fetch service catalog item.'
        );

        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchService();
  }, [serviceId]);

  if (isLoading) {
    return (
      <div
        className={cn(
          `
          flex w-full animate-pulse
          items-center
          justify-between gap-4
          rounded-md
          border border-border
          bg-card
          p-3
          `,
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-8 w-8 shrink-0 rounded-md bg-muted" />

          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-3 w-1/4 rounded bg-muted" />
          </div>
        </div>

        <div className="h-5 w-16 shrink-0 rounded bg-muted" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div
        className={cn(
          `
          flex w-full
          items-center gap-2
          rounded-md
          border
          border-destructive/10
          bg-destructive/5
          p-3
          text-xs
          font-medium
          text-destructive
          `,
          className
        )}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />

        <span>
          {error ||
            'Missing service identification parameter.'}
        </span>
      </div>
    );
  }

  const typeConfig =
    SERVICE_TYPE_CONFIG[
      service.type.toUpperCase()
    ] || {
      label: service.type,
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      icon: Wrench,
    };

  const TypeIcon =
    typeConfig.icon;

  const rawMinutes =
    service.estimatedDuration ||
    service.durationMinutes ||
    0;

  const formattedDuration =
    rawMinutes >= 60
      ? `${Math.floor(
          rawMinutes / 60
        )}h${
          rawMinutes % 60 > 0
            ? ` ${
                rawMinutes % 60
              }m`
            : ''
        }`
      : `${rawMinutes} mins`;

  const formattedPrice =
    service.basePrice
      ? new Intl.NumberFormat(
          'en-US',
          {
            style:
              'currency',
            currency:
              'PHP',
          }
        ).format(
          Number(
            service.basePrice
          )
        )
      : 'Quote Req.';

  return (
    <div
      className={cn(
        `
        flex w-full
        items-center
        justify-between
        gap-4
        rounded-md
        border border-border
        bg-card
        p-3
        transition-colors
        select-none
        `,
        !service.active &&
          'opacity-60 grayscale-[30%]',
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            `
            flex h-11 w-11
            shrink-0
            items-center
            justify-center
            rounded-md
            border
            border-primary/10
            `,
            typeConfig.bg,
            typeConfig.text
          )}
        >
          <TypeIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                `
                rounded-full
                px-1.5 py-0.5
                text-[10px]
                font-semibold
                uppercase
                tracking-wide
                `,
                typeConfig.bg,
                typeConfig.text
              )}
            >
              {typeConfig.label}
            </span>

            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                service.active
                  ? 'bg-emerald-500'
                  : 'bg-muted-foreground/60'
              )}
            />
          </div>

          <h4 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {service.name}
          </h4>

          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />

            <span>
              {formattedDuration}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col justify-center text-right">
        <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Base Price
        </span>

        <span className="text-sm font-semibold tracking-tight text-foreground">
          {formattedPrice}
        </span>
      </div>
    </div>
  );
}