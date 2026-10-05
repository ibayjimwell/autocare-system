'use client';

import Link from 'next/link';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Package,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react';

import type { DashboardData } from '@/database/models/dashboard/dashboard.model';
import {
  formatCurrency,
  formatDateTime,
  formatDurationMinutes,
  formatNumber,
  formatPercent,
  formatRelativeAge,
} from '@/app-utils/dashboard/helpers';
import {
  DashboardCard,
  DashboardSection,
  HorizontalMeter,
  MiniBarChart,
  MetricCard,
  SignalCard,
  StatusPill,
} from './dashboard-ui';

export function DashboardOverviewSection({
  data,
}: {
  data: DashboardData;
}) {
  const signals = data.overview.signals;

  return (
    <DashboardSection
      title="Operational Pulse"
      description="The most important signals for keeping vehicles moving through the shop without avoidable delays."
      icon={Activity}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {data.access.appointments ? (
          <MetricCard
            label="Today's appointments"
            value={formatNumber(data.overview.todayAppointments ?? 0)}
            helper="Booked and not cancelled"
            icon={CalendarDays}
            tone="primary"
          />
        ) : null}

        {data.access.serviceTracking ? (
          <MetricCard
            label="Active service jobs"
            value={formatNumber(data.overview.activeServiceJobs ?? 0)}
            helper="Inspection, approval, and work stages"
            icon={Wrench}
            tone={
              (data.overview.activeServiceJobs ?? 0) > 0
                ? 'primary'
                : 'neutral'
            }
          />
        ) : null}

        {data.access.payments ? (
          <MetricCard
            label="Collected today"
            value={formatCurrency(data.overview.todayPaidAmount ?? 0)}
            helper={`${formatNumber(data.overview.unpaidFinalBills ?? 0)} official bill(s) unpaid`}
            icon={CircleDollarSign}
            tone="success"
          />
        ) : null}

        {data.access.inventory ? (
          <MetricCard
            label="Stock attention"
            value={formatNumber(data.overview.lowStockItems ?? 0)}
            helper="At or below reorder level"
            icon={Package}
            tone={
              (data.overview.lowStockItems ?? 0) > 0
                ? 'warning'
                : 'success'
            }
          />
        ) : null}

        {data.access.staffs ? (
          <MetricCard
            label="Staff online"
            value={formatNumber(data.overview.onlineStaff ?? 0)}
            helper="Boarded staff currently online"
            icon={UserCheck}
            tone="primary"
          />
        ) : null}
      </div>

      {signals.length > 0 ? (
        <DashboardCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Priority signals
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Operational issues surfaced from the modules you can access.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {signals.map((signal, index) => (
              <SignalCard key={`${signal.module}-${signal.title}-${index}`} {...signal} />
            ))}
          </div>
        </DashboardCard>
      ) : (
        <DashboardCard className="border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                No immediate dashboard alerts
              </p>
              <p className="mt-1 text-sm text-emerald-700/80">
                The currently accessible modules are not reporting a priority
                operational exception.
              </p>
            </div>
          </div>
        </DashboardCard>
      )}
    </DashboardSection>
  );
}

export function CustomersDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.customers) return null;

  const customer = data.customers;

  return (
    <DashboardSection
      title="Customers"
      description="Monitor active customer demand and whether customers are returning for additional service."
      icon={Users}
      href="/customers"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active customers"
          value={formatNumber(customer.activeCustomers)}
          helper="Customer accounts not deactivated"
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="New in 30 days"
          value={formatNumber(customer.newCustomers30d)}
          helper="Recently created active accounts"
          icon={UserCheck}
        />
        <MetricCard
          label="Repeat rate"
          value={formatPercent(customer.repeatCustomerRate90d)}
          helper={`Customers with 2+ visits in the last 90 days`}
          icon={CheckCircle2}
          tone={customer.repeatCustomerRate90d >= 40 ? 'success' : 'warning'}
        />
        <MetricCard
          label="App users online"
          value={formatNumber(customer.onlineCustomers)}
          helper="Customers currently online in the app"
          icon={Activity}
          tone="primary"
        />
      </div>

      <DashboardCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Retention signal
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.customersWithVisits90d === 0
                ? 'There are not enough completed visit records yet to measure return behavior.'
                : `${formatPercent(customer.repeatCustomerRate90d)} of customers who visited in the last 90 days had more than one non-cancelled appointment.`}
            </p>
          </div>
          <StatusPill
            label={
              customer.repeatCustomerRate90d >= 40
                ? 'Healthy return signal'
                : 'Retention opportunity'
            }
            tone={customer.repeatCustomerRate90d >= 40 ? 'success' : 'warning'}
          />
        </div>
      </DashboardCard>
    </DashboardSection>
  );
}

export function AppointmentsDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.appointments) return null;

  const appointment = data.appointments;

  return (
    <DashboardSection
      title="Appointments"
      description="See demand before it becomes a scheduling bottleneck, with today's status and the next seven days of load."
      icon={CalendarDays}
      href="/appointments"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Today's bookings"
          value={formatNumber(appointment.todayTotal)}
          helper={`${formatNumber(appointment.todayConfirmed)} confirmed`}
          icon={CalendarDays}
          tone="primary"
        />
        <MetricCard
          label="Pending today"
          value={formatNumber(appointment.todayPending)}
          helper="Still needs confirmation"
          icon={Clock3}
          tone={appointment.todayPending > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Next 7 days"
          value={formatNumber(appointment.next7DaysTotal)}
          helper={
            appointment.busiestDay
              ? `${appointment.busiestDay.label} is the busiest day`
              : 'No future load recorded'
          }
          icon={CalendarDays}
          tone="primary"
        />
        <MetricCard
          label="Cancellation rate"
          value={formatPercent(appointment.cancellationRate30d)}
          helper={`${formatNumber(appointment.pendingConfirmation7d)} pending confirmations in 7 days`}
          icon={XCircle}
          tone={appointment.cancellationRate30d >= 15 ? 'warning' : 'neutral'}
        />
      </div>

      <DashboardCard>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Appointment demand forecast
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Non-cancelled bookings by appointment date.
            </p>
          </div>
          {appointment.busiestDay ? (
            <StatusPill
              label={`Peak: ${appointment.busiestDay.label}`}
              tone="primary"
            />
          ) : null}
        </div>
        <MiniBarChart
          items={appointment.dailyLoad.map((item) => ({
            label: item.label,
            value: item.count,
            emphasis:
              appointment.busiestDay?.date === item.date,
          }))}
          valueFormatter={(value) => formatNumber(value)}
          emptyLabel="No upcoming appointment load was found."
        />
      </DashboardCard>
    </DashboardSection>
  );
}

export function ServicesDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.services) return null;

  const services = data.services;
  const maxDemand = Math.max(1, ...services.topServices90d.map((item) => item.count));

  return (
    <DashboardSection
      title="Services"
      description="Identify which service offerings drive the most demand and how your catalog is structured."
      icon={Wrench}
      href="/services"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active services"
          value={formatNumber(services.activeServices)}
          helper="Services currently offered"
          icon={Wrench}
          tone="primary"
        />
        <MetricCard
          label="Average duration"
          value={formatDurationMinutes(services.averageDurationMinutes)}
          helper="Estimated duration across active services"
          icon={Clock3}
        />
        <MetricCard
          label="Demand leaders"
          value={formatNumber(services.topServices90d.length)}
          helper="Top services tracked over 90 days"
          icon={Activity}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <DashboardCard>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              Most requested services
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Service IDs attached to non-cancelled appointments in the last 90 days.
            </p>
          </div>
          <div className="space-y-4">
            {services.topServices90d.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No service demand has been recorded yet.
              </p>
            ) : (
              services.topServices90d.map((item, index) => (
                <HorizontalMeter
                  key={item.id}
                  label={`${index + 1}. ${item.name}`}
                  value={item.count}
                  max={maxDemand}
                  helper={`${formatNumber(item.count)} appointment${item.count === 1 ? '' : 's'}`}
                />
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <h3 className="text-sm font-semibold text-foreground">
            Service catalog mix
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Active catalog entries by service type.
          </p>
          <div className="mt-5 space-y-4">
            {services.serviceTypeMix.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service type data.</p>
            ) : (
              services.serviceTypeMix.map((item) => (
                <HorizontalMeter
                  key={item.type}
                  label={item.type}
                  value={item.count}
                  max={Math.max(1, services.activeServices)}
                />
              ))
            )}
          </div>
        </DashboardCard>
      </div>
    </DashboardSection>
  );
}

export function StaffsDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.staffs) return null;

  const staffs = data.staffs;
  const maxRole = Math.max(1, ...staffs.roleMix.map((item) => item.count));

  return (
    <DashboardSection
      title="Staffs"
      description="Monitor staff presence and where online team members are currently operating in the system."
      icon={Users}
      href="/staffs"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Boarded staff"
          value={formatNumber(staffs.totalStaff)}
          helper="Active staff accounts"
          icon={Users}
          tone="primary"
        />
        <MetricCard
          label="Online"
          value={formatNumber(staffs.onlineStaff)}
          helper="Currently online"
          icon={UserCheck}
          tone="success"
        />
        <MetricCard
          label="Offline"
          value={formatNumber(staffs.offlineStaff)}
          helper="Boarded but not online"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCard>
          <h3 className="text-sm font-semibold text-foreground">
            Online module presence
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Current module values reported by online staff accounts.
          </p>
          <div className="mt-5 space-y-4">
            {staffs.modulePresence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No online staff presence is currently reported.
              </p>
            ) : (
              staffs.modulePresence.map((item) => (
                <HorizontalMeter
                  key={item.module}
                  label={item.module}
                  value={item.count}
                  max={Math.max(1, staffs.onlineStaff)}
                />
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <h3 className="text-sm font-semibold text-foreground">Role mix</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Boarded staff by configured role.
          </p>
          <div className="mt-5 space-y-4">
            {staffs.roleMix.map((item) => (
              <HorizontalMeter
                key={item.role}
                label={item.role}
                value={item.count}
                max={maxRole}
              />
            ))}
          </div>
        </DashboardCard>
      </div>
    </DashboardSection>
  );
}

export function ServiceTrackingDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.serviceTracking) return null;

  const tracking = data.serviceTracking;
  const totalQueue = tracking.queueToday.reduce((sum, item) => sum + item.count, 0);
  const maxQueue = Math.max(1, ...tracking.queueToday.map((item) => item.count));

  return (
    <DashboardSection
      title="Service Tracking"
      description="Find where vehicles are waiting, how much active work is aging, and where today's queue is accumulating."
      icon={Activity}
      href="/service-tracking"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active jobs"
          value={formatNumber(tracking.activeJobs)}
          helper={`${formatNumber(tracking.jobsInProgress)} in progress`}
          icon={Wrench}
          tone="primary"
        />
        <MetricCard
          label="Waiting approval"
          value={formatNumber(tracking.jobsWaitingApproval)}
          helper="Customer authorization is the current gate"
          icon={Clock3}
          tone={tracking.jobsWaitingApproval > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Inspection"
          value={formatNumber(tracking.jobsUnderInspection)}
          helper="Vehicles currently in inspection stage"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Stalled > 24h"
          value={formatNumber(tracking.jobsOlderThan24h)}
          helper="Active jobs without a recent update"
          icon={Clock3}
          tone={tracking.jobsOlderThan24h > 0 ? 'critical' : 'success'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <DashboardCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Today's service queue
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Queue records grouped by current queue status.
              </p>
            </div>
            <StatusPill label={`${formatNumber(totalQueue)} queued`} tone="primary" />
          </div>
          <div className="space-y-4">
            {tracking.queueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No queue records are present for today.
              </p>
            ) : (
              tracking.queueToday.map((item) => (
                <HorizontalMeter
                  key={item.status}
                  label={item.status}
                  value={item.count}
                  max={maxQueue}
                />
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <h3 className="text-sm font-semibold text-foreground">
            Task backlog
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Inspection and work task states across the shop.
          </p>

          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Inspection tasks</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(tracking.inspectionTasks.done)} done
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatusPill label={`Pending ${tracking.inspectionTasks.pending}`} tone="warning" />
                <StatusPill label={`Active ${tracking.inspectionTasks.inProgress}`} tone="primary" />
                <StatusPill label={`Done ${tracking.inspectionTasks.done}`} tone="success" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Work tasks</span>
                <span className="text-xs text-muted-foreground">
                  {formatNumber(tracking.workTasks.done)} done
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatusPill label={`Pending ${tracking.workTasks.pending}`} tone="warning" />
                <StatusPill label={`Active ${tracking.workTasks.inProgress}`} tone="primary" />
                <StatusPill label={`Done ${tracking.workTasks.done}`} tone="success" />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Oldest active jobs
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Useful for spotting vehicles that may be waiting on a workflow step.
            </p>
          </div>
          <Link
            href="/service-tracking"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Open tracking
          </Link>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {tracking.oldestJobs.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              No active jobs are currently waiting.
            </div>
          ) : (
            tracking.oldestJobs.map((job) => (
              <div
                key={`${job.trackingNumber}-${job.updatedAt}`}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    #{job.trackingNumber}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {job.customerName} · Last update {formatDateTime(job.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill label={job.status} tone={job.status === 'WAITING_FOR_APPROVAL' ? 'warning' : 'primary'} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatRelativeAge(job.ageHours)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DashboardCard>
    </DashboardSection>
  );
}

export function PaymentsDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.payments) return null;

  const payments = data.payments;

  return (
    <DashboardSection
      title="Payments"
      description="Expose the cash-collection pipeline so completed work does not quietly remain unpaid."
      icon={CircleDollarSign}
      href="/payments"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Awaiting estimate approval"
          value={formatNumber(payments.pendingEstimates)}
          helper={formatCurrency(payments.pendingEstimateValue)}
          icon={Clock3}
          tone={payments.pendingEstimates > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Official final bills"
          value={formatNumber(payments.officialFinalBills)}
          helper={`${formatCurrency(payments.officialFinalBillValue)} waiting to collect`}
          icon={ReceiptText}
          tone={payments.officialFinalBills > 0 ? 'warning' : 'success'}
        />
        <MetricCard
          label="Collected in 30 days"
          value={formatCurrency(payments.paidAmount30d)}
          helper={`${formatNumber(payments.paidBills30d)} paid final bills`}
          icon={CircleDollarSign}
          tone="success"
        />
        <MetricCard
          label="30-day collection rate"
          value={formatPercent(payments.collectionRate30d)}
          helper="Paid value ÷ paid + official value"
          icon={CheckCircle2}
          tone={payments.collectionRate30d >= 80 ? 'success' : 'warning'}
        />
      </div>

      <DashboardCard>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Payment collection trend
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Paid final-bill value by day for the last 14 days.
            </p>
          </div>
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <MiniBarChart
          items={payments.paymentTrend14d.map((point) => ({
            label: point.label,
            value: point.amount,
            emphasis: point.amount > 0,
          }))}
          valueFormatter={(value) =>
            value >= 1000
              ? `₱${Math.round(value / 1000)}k`
              : `₱${Math.round(value)}`
          }
          emptyLabel="No paid final-bill activity was recorded in this period."
        />
      </DashboardCard>
    </DashboardSection>
  );
}

export function InventoryDashboardSection({
  data,
}: {
  data: DashboardData;
}) {
  if (!data.inventory) return null;

  const inventory = data.inventory;

  return (
    <DashboardSection
      title="Inventory"
      description="Surface stockout risk and reserved parts before parts availability becomes a service bottleneck."
      icon={Package}
      href="/inventory"
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active items"
          value={formatNumber(inventory.activeItems)}
          helper={`${formatNumber(inventory.lowStockItems)} low-stock`}
          icon={Package}
          tone="primary"
        />
        <MetricCard
          label="Out of stock"
          value={formatNumber(inventory.outOfStockItems)}
          helper="Active items at zero or below"
          icon={XCircle}
          tone={inventory.outOfStockItems > 0 ? 'critical' : 'success'}
        />
        <MetricCard
          label="Stock value"
          value={formatCurrency(inventory.stockValue)}
          helper="Active quantity × cost price"
          icon={CircleDollarSign}
        />
        <MetricCard
          label="Reserved KEEP value"
          value={formatCurrency(inventory.reservedKeepValue)}
          helper="Parts reserved against current jobs"
          icon={ReceiptText}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <DashboardCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Low-stock watchlist
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Items at or below their configured reorder level.
              </p>
            </div>
            <StatusPill
              label={`${formatNumber(inventory.lowStockItems)} flagged`}
              tone={inventory.lowStockItems > 0 ? 'warning' : 'success'}
            />
          </div>

          <div className="divide-y divide-border rounded-lg border border-border">
            {inventory.lowStockList.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">
                Inventory is currently above all configured reorder levels.
              </div>
            ) : (
              inventory.lowStockList.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reorder level: {formatNumber(item.reorderLevel)}
                    </p>
                  </div>
                  <StatusPill
                    label={`${formatNumber(item.quantity)} left`}
                    tone={item.quantity <= 0 ? 'critical' : 'warning'}
                  />
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        <DashboardCard>
          <h3 className="text-sm font-semibold text-foreground">
            Inventory flow
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Inventory allocations connected to service work.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Used in 30 days
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {formatNumber(inventory.usedQuantity30d)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(inventory.usedValue30d)} at recorded use prices
              </p>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Why this matters
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800/80">
                Low stock and reserved parts are early warnings that a repair
                can lose productive time while staff wait for parts.
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </DashboardSection>
  );
}
