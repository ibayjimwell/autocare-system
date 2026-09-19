'use client';

import {
  Estimate,
} from '@/hooks/payments/usePaymentsData';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Button,
} from '@/components/ui/button';

import EmptyState from '@/components/shared/empty-state';

import {
  formatCurrency,
} from '@/app-utils/payments/payments';

import {
  format,
} from 'date-fns';

import {
  Check,
  CheckCircle,
  Eye,
  FileText,
  MoreHorizontal,
  XCircle,
} from 'lucide-react';

/* ================================================================
   PROPS
================================================================ */

interface EstimatesListProps {
  estimates: Estimate[];

  statusFilter: string;

  onRequestSendForApproval: (
    estimate: Estimate,
  ) => void;

  onRequestApprove: (
    estimate: Estimate,
  ) => void;

  onRequestDecline: (
    estimate: Estimate,
  ) => void;

  onOpenDetail: (
    item: Estimate,
    type: 'estimate',
  ) => void;
}

/* ================================================================
   STATUS HELPERS
================================================================ */

function getEstimateStatusHighlight(
  status: string,
) {
  switch (
    status
  ) {
    case 'PENDING':
      return {
        wrapper:
          'border-red-200 bg-red-50 text-red-700',
        dot:
          'bg-red-500',
        row:
          'bg-red-50/70 hover:bg-red-100/80 border-l-2 border-l-red-400',
        pulse:
          'motion-safe:animate-pulse',
      };

    case 'WAITING_FOR_APPROVAL':
      return {
        wrapper:
          'border-blue-200 bg-blue-50 text-blue-700',
        dot:
          'bg-blue-500',
        row:
          'bg-blue-50/70 hover:bg-blue-100/80 border-l-2 border-l-blue-400',
        pulse:
          '',
      };

    case 'APPROVED':
      return {
        wrapper:
          'border-green-200 bg-green-50 text-green-700',
        dot:
          'bg-green-500',
        row:
          'bg-green-50/70 hover:bg-green-100/80 border-l-2 border-l-green-400',
        pulse:
          '',
      };

    case 'DECLINED':
      return {
        wrapper:
          'border-red-200 bg-red-50 text-red-700',
        dot:
          'bg-red-500',
        row:
          'bg-red-50/70 hover:bg-red-100/80 border-l-2 border-l-red-400',
        pulse:
          '',
      };

    default:
      return {
        wrapper:
          'border-border bg-muted/40 text-muted-foreground',
        dot:
          'bg-muted-foreground',
        row:
          'bg-muted/30 hover:bg-muted/50 border-l-2 border-l-muted-foreground/30',
        pulse:
          '',
      };
  }
}

/* ================================================================
   STATUS HIGHLIGHT
================================================================ */

function EstimateStatusHighlight({
  status,
}: {
  status: string;
}) {
  const styles =
    getEstimateStatusHighlight(
      status,
    );

  const labelMap: Record<
    string,
    string
  > = {
    PENDING:
      'Pending',
    WAITING_FOR_APPROVAL:
      'Waiting for Approval',
    APPROVED:
      'Approved',
    DECLINED:
      'Declined',
  };

  return (
    <div
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1

        text-[10px]
        font-semibold
        uppercase
        tracking-wide

        ${styles.wrapper}
        ${styles.pulse}
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          shrink-0
          rounded-full
          ${styles.dot}
        `}
      />

      {
        labelMap[
          status
        ] ||
        status
      }
    </div>
  );
}

/* ================================================================
   COMPONENT
================================================================ */

export default function EstimatesList({
  estimates,
  statusFilter,
  onRequestSendForApproval,
  onRequestApprove,
  onRequestDecline,
  onOpenDetail,
}: EstimatesListProps) {
  if (
    estimates.length ===
    0
  ) {
    return (
      <EmptyState
        icon={
          FileText
        }
        title="No estimates"
        description={
          statusFilter !==
          'ALL'
            ? 'No estimates with the selected filters.'
            : 'Create an estimate from a confirmed appointment.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* =========================================================
          MOBILE
      ========================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-3

          md:hidden
        "
      >
        {estimates.map(
          (
            est,
          ) => {
            const customer =
              est
                .appointment
                ?.customer
                ?.fullname ||
              'Customer';

            const plate =
              est
                .appointment
                ?.vehicle
                ?.plateNumber ||
              'N/A';

            const date =
              est
                .appointment
                ?.appointmentDate
                ? format(
                    new Date(
                      est
                        .appointment
                        .appointmentDate,
                    ),
                    'MMM dd, yyyy',
                  )
                : 'N/A';

            const statusStyles =
              getEstimateStatusHighlight(
                est.status,
              );

            return (
              <Card
                key={
                  est.id
                }
                className={`
                  overflow-hidden
                  rounded-xl
                  border
                  bg-card
                  shadow-sm
                  ${statusStyles.row}
                `}
              >
                <CardContent className="p-4">
                  <div
                    className="
                      flex
                      items-start
                      justify-between
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-border
                          bg-muted/40
                        "
                      >
                        <FileText
                          className="
                            h-4
                            w-4
                            text-muted-foreground
                          "
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            text-base
                            font-semibold
                            text-foreground
                          "
                        >
                          {
                            customer
                          }
                        </p>

                        <p
                          className="
                            truncate
                            font-mono
                            text-xs
                            text-muted-foreground
                          "
                        >
                          #
                          {est.id
                            .slice(
                              0,
                              8,
                            )
                            .toUpperCase()}
                          {' • '}
                          {
                            plate
                          }
                        </p>
                      </div>
                    </div>

                    <EstimateStatusHighlight
                      status={
                        est.status
                      }
                    />
                  </div>

                  <div
                    className="
                      my-4
                      grid
                      grid-cols-2
                      gap-3
                      rounded-lg
                      border
                      border-border
                      bg-muted/20
                      p-3
                    "
                  >
                    <div>
                      <p
                        className="
                          text-[11px]
                          uppercase
                          tracking-wide
                          text-muted-foreground
                        "
                      >
                        Estimate Date
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          font-medium
                          text-foreground
                        "
                      >
                        {
                          date
                        }
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className="
                          text-[11px]
                          uppercase
                          tracking-wide
                          text-muted-foreground
                        "
                      >
                        Total
                      </p>

                      <p
                        className="
                          mt-1
                          text-lg
                          font-semibold
                          tracking-tight
                          text-primary
                        "
                      >
                        ₱
                        {formatCurrency(
                          est.grandTotal,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {est.status ===
                      'PENDING' && (
                      <Button
                        type="button"
                        onClick={() =>
                          onRequestSendForApproval(
                            est,
                          )
                        }
                        className="
                          h-11
                          rounded-md
                          px-4
                          font-medium

                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-ring
                          focus-visible:ring-offset-2
                        "
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Send for Approval
                      </Button>
                    )}

                    {est.status ===
                      'WAITING_FOR_APPROVAL' && (
                      <>
                        <Button
                          type="button"
                          onClick={() =>
                            onRequestApprove(
                              est,
                            )
                          }
                          className="
                            h-11
                            rounded-md
                            bg-primary
                            px-4
                            text-primary-foreground
                            hover:bg-primary/90
                          "
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() =>
                            onRequestDecline(
                              est,
                            )
                          }
                          className="
                            h-11
                            rounded-md
                            px-4
                          "
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        onOpenDetail(
                          est,
                          'estimate',
                        )
                      }
                      className="h-11 rounded-md px-4"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* =========================================================
          DESKTOP
      ========================================================== */}

      <Card
        className="
          hidden
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
          shadow-sm

          md:block
        "
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="
                    h-11
                    px-4
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Estimate
                </TableHead>

                <TableHead
                  className="
                    h-11
                    px-4
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Date
                </TableHead>

                <TableHead
                  className="
                    h-11
                    px-4
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Customer
                </TableHead>

                <TableHead
                  className="
                    h-11
                    px-4
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Status
                </TableHead>

                <TableHead
                  className="
                    h-11
                    px-4
                    text-right
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Total
                </TableHead>

                <TableHead
                  className="
                    h-11
                    w-[210px]
                    px-4
                    text-right
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wider
                    text-muted-foreground
                  "
                >
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {estimates.map(
                (
                  est,
                ) => {
                  const statusStyles =
                    getEstimateStatusHighlight(
                      est.status,
                    );

                  return (
                    <TableRow
                      key={
                        est.id
                      }
                      className={`
                        group
                        transition-colors
                        ${statusStyles.row}
                      `}
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="
                              flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-md
                              border
                              border-border
                              bg-muted/40
                            "
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>

                          <div>
                            <p className="font-mono text-sm font-medium text-foreground">
                              #
                              {est.id
                                .slice(
                                  0,
                                  8,
                                )
                                .toUpperCase()}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {est
                                .appointment
                                ?.vehicle
                                ?.plateNumber ||
                                'N/A'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {est
                          .appointment
                          ?.appointmentDate
                          ? format(
                              new Date(
                                est
                                  .appointment
                                  .appointmentDate,
                              ),
                              'MMM dd, yyyy',
                            )
                          : 'N/A'}
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {est
                              .appointment
                              ?.customer
                              ?.fullname ||
                              'Customer'}
                          </p>

                          {est
                            .appointment
                            ?.trackingNumber && (
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {
                                est
                                  .appointment
                                  .trackingNumber
                              }
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <EstimateStatusHighlight
                          status={
                            est.status
                          }
                        />
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right">
                        <span className="font-semibold text-primary">
                          ₱
                          {formatCurrency(
                            est.grandTotal,
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {est.status ===
                            'PENDING' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onRequestSendForApproval(
                                  est,
                                )
                              }
                              className="
                                h-8
                                rounded-md
                                text-xs
                              "
                            >
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              Send
                            </Button>
                          )}

                          {est.status ===
                            'WAITING_FOR_APPROVAL' && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  onRequestApprove(
                                    est,
                                  )
                                }
                                className="
                                  h-8
                                  rounded-md
                                  bg-primary
                                  text-xs
                                  text-primary-foreground
                                  hover:bg-primary/90
                                "
                              >
                                <Check className="mr-1.5 h-3.5 w-3.5" />
                                Approve
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  onRequestDecline(
                                    est,
                                  )
                                }
                                className="
                                  h-8
                                  rounded-md
                                  text-xs
                                "
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
                            onClick={() =>
                              onOpenDetail(
                                est,
                                'estimate',
                              )
                            }
                            className="
                              h-8
                              w-8
                              rounded-md
                            "
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        </div>

        <div
          className="
            flex
            flex-col
            gap-1
            border-t
            border-border
            px-4
            py-3
            text-xs
            text-muted-foreground

            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <span>
            Showing{' '}
            <span className="font-medium text-foreground">
              {
                estimates.length
              }
            </span>{' '}
            estimate
            {estimates.length ===
            1
              ? ''
              : 's'}
          </span>

          <span>
            Status priority is always applied first.
          </span>
        </div>
      </Card>
    </div>
  );
}