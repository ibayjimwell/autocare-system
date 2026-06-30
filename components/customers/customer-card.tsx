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
      <div className={cn("w-full rounded-md border border-border bg-card/50 p-3 flex items-center gap-3 animate-pulse", className)}>
        <div className="h-10 w-10 bg-muted rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-3 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  // Error Fallback State
  if (error || !customer) {
    return (
      <div className={cn("w-full rounded-md border border-destructive/10 bg-destructive/5 p-3 flex items-center gap-2 text-destructive text-xs", className)}>
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
        "relative w-full overflow-hidden rounded-md border border-border/70 bg-muted/30 p-3 transition-colors hover:bg-muted/50 flex items-center gap-3.5",
        customer.deactivated && "opacity-70 border-destructive/20",
        className
      )}
    >
      {/* Decorative Watermark Background Vector Icon - Digital ID Look */}
      <User className="absolute -right-4 -bottom-6 h-20 w-20 text-primary/20 pointer-events-none select-none" />

      {/* Profile ID Badge Side Panel */}
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-heading font-semibold text-sm tracking-wider">
        {initials || <User className="h-4 w-4" />}
        
        {/* Guard rails for checking deactivated customer records */}
        {customer.deactivated && (
          <div className="absolute -top-1 -right-1 bg-destructive p-0.5 rounded-full text-destructive-foreground shadow-xs">
            <ShieldX className="h-2.5 w-2.5" />
          </div>
        )}
      </div>

      {/* Main Metadata Identifier Block */}
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="font-sans text-sm font-bold tracking-tight text-foreground truncate leading-none">
          {customer.fullname}
        </h4>
        
        {/* Quick Contact Rows Container */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground font-medium">
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <Mail className="h-3 w-3 text-primary/70 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Phone className="h-3 w-3 text-secondary shrink-0" />
            <span>{customer.phone}</span>
          </span>
        </div>
      </div>
    </div>
  );
}