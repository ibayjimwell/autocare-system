import { Estimate } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/status-badge';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import {
  Check,
  CheckCircle,
  Eye,
  FileText,
  MoreHorizontal,
  XCircle,
} from 'lucide-react';

interface EstimatesListProps {
  estimates: Estimate[];
  statusFilter: string;
  onSendForApproval: (id: string) => void;
  onApprove: (id: string) => void;
  onDecline: (id: string, reason: string) => void;
  onOpenDetail: (item: Estimate, type: 'estimate') => void;
}

export default function EstimatesList({
  estimates,
  statusFilter,
  onSendForApproval,
  onApprove,
  onDecline,
  onOpenDetail,
}: EstimatesListProps) {
  if (estimates.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No estimates"
        description={
          statusFilter !== 'ALL'
            ? 'No estimates with the selected status.'
            : 'Create an estimate from a confirmed appointment.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* MOBILE */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {estimates.map((est) => {
          const customer =
            est.appointment?.customer?.fullname || 'Customer';
          const plate = est.appointment?.vehicle?.plateNumber || 'N/A';
          const date = est.appointment?.appointmentDate
            ? format(
                new Date(est.appointment.appointmentDate),
                'MMM dd, yyyy'
              )
            : 'N/A';

          return (
            <Card
              key={est.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">
                          {customer}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {plate}
                        </p>
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    status={est.status}
                    className="shrink-0 text-[10px]"
                  />
                </div>

                <div className="my-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Estimate Date
                    </p>
                    <p className="mt-1 text-sm font-medium">{date}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Total
                    </p>
                    <p className="mt-1 text-lg font-semibold tracking-tight text-primary">
                      ₱{formatCurrency(est.grandTotal)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {est.status === 'PENDING' && (
                    <Button
                      type="button"
                      onClick={() => onSendForApproval(est.id)}
                      className="
                        h-11 rounded-md px-4 font-medium
                        focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2
                      "
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Send for Approval
                    </Button>
                  )}

                  {est.status === 'WAITING_FOR_APPROVAL' && (
                    <>
                      <Button
                        type="button"
                        onClick={() => onApprove(est.id)}
                        className="
                          h-11 rounded-md bg-green-600 px-4
                          text-white hover:bg-green-700
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-ring focus-visible:ring-offset-2
                        "
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        className="
                          h-11 rounded-md px-4
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-ring focus-visible:ring-offset-2
                        "
                        onClick={() => {
                          const reason = prompt('Reason for declining:');
                          if (reason) {
                            onDecline(est.id, reason);
                          }
                        }}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenDetail(est, 'estimate')}
                    className="
                      h-11 rounded-md px-4
                      focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2
                    "
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* DESKTOP */}
      <Card className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimate
                </TableHead>

                <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </TableHead>

                <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </TableHead>

                <TableHead className="h-11 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </TableHead>

                <TableHead className="h-11 px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </TableHead>

                <TableHead className="h-11 w-[170px] px-4 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {estimates.map((est) => (
                <TableRow
                  key={est.id}
                  className="group border-border hover:bg-muted/20"
                >
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div>
                        <p className="font-medium">
                          #{est.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {est.appointment?.vehicle?.plateNumber || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {est.appointment?.appointmentDate
                      ? format(
                          new Date(est.appointment.appointmentDate),
                          'MMM dd, yyyy'
                        )
                      : 'N/A'}
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <p className="font-medium">
                      {est.appointment?.customer?.fullname || 'Customer'}
                    </p>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <StatusBadge
                      status={est.status}
                      className="text-[10px]"
                    />
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right">
                    <span className="font-semibold text-primary">
                      ₱{formatCurrency(est.grandTotal)}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {est.status === 'PENDING' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onSendForApproval(est.id)}
                          className="
                            h-8 rounded-md text-xs
                            focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-ring focus-visible:ring-offset-2
                          "
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Send
                        </Button>
                      )}

                      {est.status === 'WAITING_FOR_APPROVAL' && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onApprove(est.id)}
                            className="
                              h-8 rounded-md bg-green-600 text-xs text-white
                              hover:bg-green-700
                              focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-ring focus-visible:ring-offset-2
                            "
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Approve
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="
                              h-8 rounded-md text-xs
                              focus-visible:outline-none focus-visible:ring-2
                              focus-visible:ring-ring focus-visible:ring-offset-2
                            "
                            onClick={() => {
                              const reason = prompt('Reason for declining:');
                              if (reason) {
                                onDecline(est.id, reason);
                              }
                            }}
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Decline
                          </Button>
                        </>
                      )}

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`View estimate ${est.id}`}
                        onClick={() => onOpenDetail(est, 'estimate')}
                        className="
                          h-8 w-8 rounded-md
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-ring focus-visible:ring-offset-2
                        "
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="More actions"
                        className="
                          h-8 w-8 rounded-md
                          focus-visible:outline-none focus-visible:ring-2
                          focus-visible:ring-ring focus-visible:ring-offset-2
                        "
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing <span className="font-medium text-foreground">{estimates.length}</span>{' '}
            estimate{estimates.length === 1 ? '' : 's'}
          </span>

          <span>Updated from current payment data</span>
        </div>
      </Card>
    </div>
  );
}