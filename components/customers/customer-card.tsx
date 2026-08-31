'use client';

import React, { useState, useEffect } from 'react';
import { customersApi } from '@/lib/customers/customers';
import { Mail, Phone, User, AlertCircle, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerData {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  deactivated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerCardProps {
  customerId: string;
  className?: string;
}

export default function CustomerCard({ customerId, className }: CustomerCardProps) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    async function fetchCustomer() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await customersApi.get(customerId);
        const data = response?.data || response?.customer || response;

        if (data && data.fullname) {
          setCustomer(data);
        } else {
          setError('Customer profile not found.');
        }
      } catch (err) {
        setError('Failed to fetch customer data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCustomer();
  }, [customerId]);

  // Micro Horizontal Skeleton Loader
  if (isLoading) {
    return (
      <div className={cn("flex w-full animate-pulse items-center gap-3 rounded-lg border border-border bg-card/60 p-3", className)}>
        <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="h-3 w-48 rounded bg-muted" />
        </div>
      </div>
    );
  }

  // Error Fallback State
  if (error || !customer) {
    return (
      <div className={cn("flex w-full items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive", className)}>
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{error || "Missing customer reference."}</span>
      </div>
    );
  }

  // Generate clean name initials for the badge
  const initials = customer.fullname
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/50",
        customer.deactivated && "border-destructive/20 opacity-70",
        className,
      )}
    >
      {/* Decorative Watermark Background Vector Icon - Digital ID Look */}
      <User aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-4 h-20 w-20 select-none text-primary/10" />

      {/* Profile ID Badge Side Panel */}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-primary/10 bg-primary/10 font-heading text-sm font-semibold tracking-wider text-primary">
        {initials || <User className="h-4 w-4" />}

        {/* Guard rails for checking deactivated customer records */}
        {customer.deactivated && (
          <div className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-xs">
            <ShieldX className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      {/* Main Metadata Identifier Block */}
      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="truncate text-sm font-semibold leading-none tracking-tight text-foreground">
          {customer.fullname}
        </h4>

        {/* Quick Contact Rows Container */}
        <div className="flex flex-col gap-x-3 gap-y-0.5 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center">
          <span className="flex max-w-[180px] items-center gap-1 truncate">
            <Mail className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{customer.email}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span>{customer.phone}</span>
          </span>
        </div>
      </div>
    </div>
  );
}