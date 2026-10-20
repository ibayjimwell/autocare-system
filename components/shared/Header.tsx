'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  cn,
} from '@/lib/utils';

import {
  useAuth,
} from '@/hooks/use-auth';

import {
  usePathname,
} from 'next/navigation';

import {
  Badge,
} from '@/components/ui/badge';

import {
  Button,
} from '@/components/ui/button';

import {
  Menu,
  ChevronRight,
  KeyRound,
} from 'lucide-react';

import NotificationBell from './NotificationBell';

/* ================================================================
   PAGE INFORMATION
================================================================ */

function getPageInfo(
  pathname: string,
): {
  title: string;
  subtitle: string;
} {
  const path =
    pathname
      .replace(
        /^\/+/,
        '',
      )
      .replace(
        /\/+$/,
        '',
      );

  const segments =
    path.split('/');

  /* ==============================================================
     DASHBOARD
  ============================================================== */

  if (
    path === '' ||
    path === 'dashboard'
  ) {
    return {
      title:
        'Dashboard',

      subtitle:
        'Overview of your AutoCare system',
    };
  }

  /* ==============================================================
     PAGE MAP
  ============================================================== */

  const pageMap: Record<
    string,
    {
      title: string;
      subtitle: string;
    }
  > = {
    customers: {
      title:
        'Customers',

      subtitle:
        'Manage your customer base',
    },

    appointments: {
      title:
        'Appointments',

      subtitle:
        'View and schedule appointments',
    },

    services: {
      title:
        'Services',

      subtitle:
        'Manage service offerings',
    },

    staffs: {
      title:
        'Staffs',

      subtitle:
        'Manage staff members',
    },

    'service-tracking': {
      title:
        'Service Tracking',

      subtitle:
        'Monitor service progress',
    },

    payments: {
      title:
        'Payments',

      subtitle:
        'Manage payments and invoices',
    },

    inventory: {
      title:
        'Inventory',

      subtitle:
        'Track parts and supplies',
    },
  };

  /* ==============================================================
     MATCH PAGE
  ============================================================== */

  if (
    segments[0] &&
    pageMap[
      segments[0]
    ]
  ) {
    return pageMap[
      segments[0]
    ];
  }

  /* ==============================================================
     FALLBACK
  ============================================================== */

  const fallbackTitle =
    segments[0]
      ? segments[0]
          .charAt(0)
          .toUpperCase() +
        segments[0]
          .slice(1)
          .replace(
            /-/g,
            ' ',
          )
      : 'Page';

  return {
    title:
      fallbackTitle,

    subtitle:
      '',
  };
}

/* ================================================================
   HEADER PROPS
================================================================ */

interface HeaderProps {
  /**
   * Opens the sidebar drawer on screens below lg.
   * Supplied by MainLayout.
   */
  onMenuOpen?: () => void;
}

/* ================================================================
   HEADER
================================================================ */

export function Header({
  onMenuOpen,
}: HeaderProps) {
  const {
    user,
  } = useAuth();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setPasswordSaving(true);
    try {
      const res = await fetch('/api/staffs/profile/change-password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.errorMessage || 'Unable to change password.');
      toast.success('Your password was changed.');
      setPasswordModalOpen(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (error: any) { toast.error(error?.message || 'Unable to change password.'); }
    finally { setPasswordSaving(false); }
  };

  const pathname =
    usePathname();

  const {
    title,
    subtitle,
  } =
    getPageInfo(
      pathname,
    );

  return (
    <header
      className={cn(
        /*
         * IMPORTANT:
         *
         * Keep the application navbar BELOW dialog/modal layers.
         *
         * Radix/shadcn Dialog normally uses z-50.
         *
         * Therefore:
         *
         *   App shell  = z-40
         *   Dialog     = z-50+
         *
         * This prevents the fixed navbar from appearing above
         * appointment/reschedule/confirmation modals.
         */
        'relative z-40',

        /*
         * Prevent shrinking.
         */
        'flex shrink-0',

        /*
         * Layout.
         */
        'items-center justify-between gap-3',

        /*
         * Height.
         */
        'h-16 md:h-[72px]',

        /*
         * Surface.
         */
        'border-b border-border',

        'bg-card text-card-foreground',

        /*
         * Elevation.
         */
        'shadow-sm',

        /*
         * Horizontal spacing.
         */
        'px-4 md:px-6 lg:px-8',

        /*
         * Prevent horizontal overflow.
         */
        'min-w-0',
      )}
    >
      {/* ==========================================================
          LEFT SIDE
      =========================================================== */}

      <div
        className="
          flex
          min-w-0
          flex-1
          items-center
          gap-1
          md:gap-2
        "
      >
        {/* ========================================================
            MOBILE MENU
        ========================================================= */}

        {onMenuOpen && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={
              onMenuOpen
            }
            aria-label="Open navigation menu"
            aria-haspopup="dialog"
            className={cn(
              /*
               * Minimum comfortable touch target.
               */
              '-ml-2 h-11 w-11 shrink-0 rounded-xl',

              'text-foreground',

              'hover:bg-accent hover:text-accent-foreground',

              'focus-visible:outline-none',

              'focus-visible:ring-2',

              'focus-visible:ring-ring',

              'focus-visible:ring-offset-2',

              'md:-ml-1 md:h-10 md:w-10',

              'lg:hidden',
            )}
          >
            <Menu
              className="
                h-6
                w-6
                md:h-5
                md:w-5
              "
            />
          </Button>
        )}

        {/* ========================================================
            PAGE CONTEXT
        ========================================================= */}

        <div
          className="
            flex
            min-w-0
            flex-1
            flex-col
            justify-center
            md:ml-10
          "
        >
          <h2
            className="
              truncate
              text-2xl
              font-semibold
              leading-tight
              tracking-tight
              text-foreground

              md:text-xl

              lg:text-2xl
            "
          >
            {title}
          </h2>

          {subtitle && (
            <p
              className="
                mt-0.5
                truncate
                text-sm
                text-muted-foreground
              "
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* ==========================================================
          RIGHT SIDE
      =========================================================== */}

      <div
        className="
          flex
          shrink-0
          items-center
          gap-1.5
          md:gap-3
        "
      >
        {/* ========================================================
            NOTIFICATIONS
        ========================================================= */}

        <NotificationBell />

        {/* ========================================================
            ACCOUNT
        ========================================================= */}

        <div
          role="button"
          tabIndex={0}
          aria-expanded={accountMenuOpen}
          aria-label="Open account options"
          onClick={() => setAccountMenuOpen(value => !value)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setAccountMenuOpen(value => !value); } }}
          className="
            group
            flex
            cursor-pointer
            select-none
            items-center
            gap-2
            rounded-xl
            px-1.5
            py-1
            transition-colors
            hover:bg-accent/60

            md:gap-3

            md:px-2
          "
        >
          {/* ======================================================
              USER DETAILS
          ======================================================= */}

          <div
            className="
              hidden
              flex-col
              items-end
              text-right

              sm:flex
            "
          >
            <div
              className="
                flex
                max-w-[190px]
                items-center
                gap-1
              "
            >
              <span
                className="
                  truncate
                  text-sm
                  font-semibold
                  leading-none
                  text-foreground
                  transition-colors
                  group-hover:text-primary
                "
              >
                {user?.name ||
                  'Guest Account'}
              </span>

              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 rotate-90',

                  'text-muted-foreground',

                  'transition-transform duration-200',

                  'group-hover:translate-y-0.5',
                )}
              />
            </div>

            <Badge
              variant="secondary"
              className={cn(
                'mt-1 h-5 max-w-[140px] truncate rounded-md',

                'border border-primary/20',

                'bg-primary/10',

                'px-1.5 text-[10px] font-semibold uppercase tracking-wider',

                'text-primary',
              )}
            >
              {user?.role ||
                'GUEST'}
            </Badge>
          </div>

          {/* ======================================================
              AVATAR
          ======================================================= */}

          <div
            className="
              relative
              shrink-0
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-primary
                text-sm
                font-semibold
                text-primary-foreground
                shadow-sm
                transition-transform
                duration-200
                group-hover:scale-[1.03]
              "
            >
              {user?.name
                ?.charAt(
                  0,
                )
                .toUpperCase() ||
                'U'}
            </div>

            <span
              className="
                absolute
                -bottom-0.5
                -right-0.5
                h-3
                w-3
                rounded-full
                border-2
                border-card
                bg-emerald-500
              "
            />
          </div>
        </div>
      </div>
      {accountMenuOpen && (
        <div className="absolute right-4 top-[calc(100%-2px)] z-50 w-56 rounded-lg border border-border bg-card p-1 shadow-xl">
          <Button variant="ghost" className="h-10 w-full justify-start gap-2" onClick={() => { setAccountMenuOpen(false); setPasswordModalOpen(true); }}>
            <KeyRound className="h-4 w-4" /> Change Password
          </Button>
        </div>
      )}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>Current password</Label><Input autoComplete="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>New password</Label><Input autoComplete="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Confirm new password</Label><Input autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPasswordModalOpen(false)} disabled={passwordSaving}>Cancel</Button><Button disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} onClick={() => void handleChangePassword()}>{passwordSaving ? 'Saving...' : 'Change Password'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}