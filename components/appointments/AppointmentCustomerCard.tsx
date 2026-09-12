'use client';

import React from 'react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

export default function AppointmentCustomerCard({
  customer,
}: {
  customer: any;
}) {
  if (!customer) {
    return (
      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground">
            Customer information is unavailable.
          </p>
        </CardContent>
      </Card>
    );
  }

  const initials =
    String(
      customer?.fullname ||
        'Customer'
    )
      .trim()
      .split(/\s+/)
      .map(
        (
          part: string
        ) =>
          part[0]
      )
      .join('')
      .slice(
        0,
        2
      )
      .toUpperCase();

  return (
    <Card className="rounded-xl border-border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tracking-wide text-primary ring-1 ring-primary/10">
              {initials || (
                <UserRound className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold text-foreground">
                  {
                    customer.fullname
                  }
                </h4>

                {customer.isPhoneVerified && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/20 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary"
                  >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}

                {customer.deactivated && (
                  <Badge
                    variant="destructive"
                    className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                  >
                    Deactivated
                  </Badge>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {customer.email && (
                  <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />

                    <span className="truncate">
                      {
                        customer.email
                      }
                    </span>
                  </div>
                )}

                {customer.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />

                    <span>
                      {
                        customer.phone
                      }
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}