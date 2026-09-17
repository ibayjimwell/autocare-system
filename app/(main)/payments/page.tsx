'use client';

import React, {
  useCallback,
  useState,
} from 'react';

import {
  toast,
} from 'sonner';

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  FileCheck2,
  QrCode,
  ReceiptText,
  Search,
  WalletCards,
} from 'lucide-react';

import PageContainer from '@/components/shared/page-container';

import LoadingSpinner from '@/components/shared/loading-spinner';

import ErrorHandler from '@/components/shared/error-handler';

import {
  Button,
} from '@/components/ui/button';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Input,
} from '@/components/ui/input';

/* ================================================================
   HOOKS
================================================================ */

import {
  usePaymentsData,
} from '@/hooks/payments/usePaymentsData';

import {
  useEstimateActions,
} from '@/hooks/payments/useEstimateActions';

import {
  useFinalBillActions,
} from '@/hooks/payments/useFinalBillActions';

import {
  useDetailModal,
} from '@/hooks/payments/useDetailModal';

import {
  useAdjustments,
} from '@/hooks/payments/useAdjustments';

/* ================================================================
   COMPONENTS
================================================================ */

import FilterBar from '@/components/payments/FilterBar';

import PaymentsTabs from '@/components/payments/PaymentsTabs';

import EstimatesList from '@/components/payments/EstimatesList';

import FinalBillsList from '@/components/payments/FinalBillsList';

import DetailModal from '@/components/payments/DetailModal';

import FeeModal from '@/components/payments/FeeModal';

import DiscountModal from '@/components/payments/DiscountModal';

import EditPartModal from '@/components/payments/EditPartModal';

import DeleteConfirmationModal from '@/components/payments/DeleteConfirmationModal';

import CashierModal from '@/components/payments/cashier-modal';

import QRScannerModal from '@/components/payments/QRScannerModal';

import ReceiptModal from '@/components/payments/cashier-modal';

/* ================================================================
   CONFIRMATION MODALS
================================================================ */

import SendEstimateConfirmationModal from '@/components/payments/SendEstimateConfirmationModal';

import ApproveEstimateConfirmationModal from '@/components/payments/ApproveEstimateConfirmationModal';

import DeclineEstimateConfirmationModal from '@/components/payments/DeclineEstimateConfirmationModal';

/* ================================================================
   API
================================================================ */

import {
  finalBillsApi,
} from '@/lib/payments/final-bills';

import {
  estimatesApi,
} from '@/lib/payments/estimates';

import {
  appointmentsApi,
} from '@/lib/appointments/appointments';

/* ================================================================
   TYPES
================================================================ */

import type {
  Estimate,
} from '@/hooks/payments/usePaymentsData';

/* ================================================================
   PAGE
================================================================ */

export default function PaymentsPage() {
  /* ==============================================================
     FILTER / TAB STATE
  ============================================================== */

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<string>(
      'ALL',
    );

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      'estimates' | 'final-bills'
    >(
      'estimates',
    );

  const [
    search,
    setSearch,
  ] =
    useState(
      '',
    );

  /* ==============================================================
     PAYMENTS DATA
  ============================================================== */

  const {
    estimates,
    finalBills,
    loading,
    error,
    reload,
  } =
    usePaymentsData(
      statusFilter,
      search,
    );

  /* ==============================================================
     ESTIMATE ACTIONS
  ============================================================== */

  const estimateActions =
    useEstimateActions(
      reload,
    );

  /* ==============================================================
     FINAL BILL ACTIONS
  ============================================================== */

  const billActions =
    useFinalBillActions(
      reload,
    );

  /* ==============================================================
     DETAIL MODAL
  ============================================================== */

  const detail =
    useDetailModal(
      reload,
    );

  /* ==============================================================
     ADJUSTMENTS
  ============================================================== */

  const adjustments =
    useAdjustments({
      selectedItem:
        detail.selectedItem,

      detailType:
        detail.detailType,

      refreshDetail:
        detail.refreshDetail,

      reloadList:
        reload,
    });

  /* ==============================================================
     RECEIPT STATE
  ============================================================== */

  const [
    receiptModalOpen,
    setReceiptModalOpen,
  ] =
    useState(
      false,
    );

  const [
    receiptData,
    setReceiptData,
  ] =
    useState<any>(
      null,
    );

  const [
    receiptReference,
    setReceiptReference,
  ] =
    useState(
      '',
    );

  /* ==============================================================
     QR SCANNER STATE
  ============================================================== */

  const [
    qrScannerOpen,
    setQrScannerOpen,
  ] =
    useState(
      false,
    );

  /* ==============================================================
     ESTIMATE CONFIRMATION STATE

     The page owns the three consequential estimate
     confirmation flows:

       1. Send Pending estimate
       2. Approve estimate
       3. Decline estimate

     We keep ONE selected estimate so the confirmation components
     always operate on the exact estimate the staff selected.
  ============================================================== */

  const [
    confirmationEstimate,
    setConfirmationEstimate,
  ] =
    useState<Estimate | null>(
      null,
    );

  const [
    sendConfirmationOpen,
    setSendConfirmationOpen,
  ] =
    useState(
      false,
    );

  const [
    approveConfirmationOpen,
    setApproveConfirmationOpen,
  ] =
    useState(
      false,
    );

  const [
    declineConfirmationOpen,
    setDeclineConfirmationOpen,
  ] =
    useState(
      false,
    );

  /*
   * Loading while we fetch the full estimate + appointment details
   * before opening a confirmation modal.
   */
  const [
    confirmationLoading,
    setConfirmationLoading,
  ] =
    useState(
      false,
    );

  /*
   * Loading while the selected confirmation action is actually
   * being submitted.
   */
  const [
    confirmationActionLoading,
    setConfirmationActionLoading,
  ] =
    useState(
      false,
    );

  /* ==============================================================
     LOAD FULL ESTIMATE FOR CONFIRMATION

     EstimatesList normally receives the list representation.
     The detailed confirmation modal needs the full estimate:

       - services
       - findings
       - parts
       - tasks
       - fees
       - discounts
       - totals
       - appointment / customer / vehicle

     Therefore we explicitly refresh the estimate before displaying
     the confirmation UI.
  ============================================================== */

  const loadEstimateForConfirmation =
    useCallback(
      async (
        estimate: Estimate,
      ): Promise<Estimate | null> => {
        setConfirmationLoading(
          true,
        );

        try {
          const [
            estimateResponse,
            appointmentResponse,
          ] =
            await Promise.all([
              estimatesApi.get(
                estimate.id,
              ),

              appointmentsApi.get(
                estimate.appointmentId,
              ),
            ]);

          if (
            estimateResponse?.error ||
            !estimateResponse?.data
          ) {
            toast.error(
              estimateResponse?.errorMessage ||
                'Unable to load the complete estimate details.',
            );

            return null;
          }

          const fullEstimate =
            estimateResponse.data;

          /*
           * The estimate endpoint provides customer and vehicle
           * information, while the appointment endpoint provides
           * the complete appointment object including services.
           *
           * Merge both sources so the confirmation component gets
           * the most complete representation.
           */
          const appointmentData =
            appointmentResponse?.error
              ? {}
              : appointmentResponse?.data ||
                {};

          const mergedEstimate =
            {
              ...fullEstimate,

              appointment: {
                ...(fullEstimate?.appointment ||
                  {}),

                ...appointmentData,
              },
            };

          return mergedEstimate as Estimate;
        } catch (
          error: any
        ) {
          console.error(
            '[PaymentsPage] Failed to load confirmation estimate:',
            error,
          );

          toast.error(
            error?.message ||
              'Failed to load estimate details.',
          );

          return null;
        } finally {
          setConfirmationLoading(
            false,
          );
        }
      },
      [],
    );

  /* ==============================================================
     OPEN SEND CONFIRMATION

     Pending estimates must be explicitly reviewed before they are
     sent to the customer.
  ============================================================== */

  const handleRequestSendForApproval =
    useCallback(
      async (
        estimate: Estimate,
      ) => {
        if (
          estimate.status !==
          'PENDING'
        ) {
          toast.error(
            'Only pending estimates can be sent for approval.',
          );

          return;
        }

        const fullEstimate =
          await loadEstimateForConfirmation(
            estimate,
          );

        if (
          !fullEstimate
        ) {
          return;
        }

        setConfirmationEstimate(
          fullEstimate,
        );

        setSendConfirmationOpen(
          true,
        );
      },
      [
        loadEstimateForConfirmation,
      ],
    );

  /* ==============================================================
     OPEN APPROVE CONFIRMATION
  ============================================================== */

  const handleRequestApprove =
    useCallback(
      async (
        estimate: Estimate,
      ) => {
        if (
          estimate.status !==
          'WAITING_FOR_APPROVAL'
        ) {
          toast.error(
            'Only estimates waiting for approval can be approved.',
          );

          return;
        }

        const fullEstimate =
          await loadEstimateForConfirmation(
            estimate,
          );

        if (
          !fullEstimate
        ) {
          return;
        }

        setConfirmationEstimate(
          fullEstimate,
        );

        setApproveConfirmationOpen(
          true,
        );
      },
      [
        loadEstimateForConfirmation,
      ],
    );

  /* ==============================================================
     OPEN DECLINE CONFIRMATION
  ============================================================== */

  const handleRequestDecline =
    useCallback(
      async (
        estimate: Estimate,
      ) => {
        if (
          estimate.status !==
          'WAITING_FOR_APPROVAL'
        ) {
          toast.error(
            'Only estimates waiting for approval can be declined.',
          );

          return;
        }

        const fullEstimate =
          await loadEstimateForConfirmation(
            estimate,
          );

        if (
          !fullEstimate
        ) {
          return;
        }

        setConfirmationEstimate(
          fullEstimate,
        );

        setDeclineConfirmationOpen(
          true,
        );
      },
      [
        loadEstimateForConfirmation,
      ],
    );

  /* ==============================================================
     CLOSE ALL ESTIMATE CONFIRMATIONS
  ============================================================== */

  const closeEstimateConfirmations =
    useCallback(
      () => {
        if (
          confirmationActionLoading
        ) {
          return;
        }

        setSendConfirmationOpen(
          false,
        );

        setApproveConfirmationOpen(
          false,
        );

        setDeclineConfirmationOpen(
          false,
        );

        setConfirmationEstimate(
          null,
        );
      },
      [
        confirmationActionLoading,
      ],
    );

  /* ==============================================================
     CONFIRM SEND FOR APPROVAL
  ============================================================== */

  const handleConfirmSendForApproval =
    useCallback(
      async () => {
        if (
          !confirmationEstimate ||
          confirmationActionLoading
        ) {
          return;
        }

        setConfirmationActionLoading(
          true,
        );

        try {
          const success =
            await estimateActions.handleSendForApproval(
              confirmationEstimate.id,
            );

          if (
            success
          ) {
            setSendConfirmationOpen(
              false,
            );

            setConfirmationEstimate(
              null,
            );
          }
        } finally {
          setConfirmationActionLoading(
            false,
          );
        }
      },
      [
        confirmationEstimate,
        confirmationActionLoading,
        estimateActions,
      ],
    );

  /* ==============================================================
     CONFIRM APPROVE
  ============================================================== */

  const handleConfirmApprove =
    useCallback(
      async () => {
        if (
          !confirmationEstimate ||
          confirmationActionLoading
        ) {
          return;
        }

        setConfirmationActionLoading(
          true,
        );

        try {
          const success =
            await estimateActions.handleApproveEstimate(
              confirmationEstimate.id,
            );

          if (
            success
          ) {
            setApproveConfirmationOpen(
              false,
            );

            setConfirmationEstimate(
              null,
            );
          }
        } finally {
          setConfirmationActionLoading(
            false,
          );
        }
      },
      [
        confirmationEstimate,
        confirmationActionLoading,
        estimateActions,
      ],
    );

  /* ==============================================================
     CONFIRM DECLINE
  ============================================================== */

  const handleConfirmDecline =
    useCallback(
      async (
        reason: string,
      ) => {
        if (
          !confirmationEstimate ||
          confirmationActionLoading
        ) {
          return;
        }

        setConfirmationActionLoading(
          true,
        );

        try {
          const success =
            await estimateActions.handleDeclineEstimate(
              confirmationEstimate.id,
              reason,
            );

          if (
            success
          ) {
            setDeclineConfirmationOpen(
              false,
            );

            setConfirmationEstimate(
              null,
            );
          }
        } finally {
          setConfirmationActionLoading(
            false,
          );
        }
      },
      [
        confirmationEstimate,
        confirmationActionLoading,
        estimateActions,
      ],
    );

  /* ==============================================================
     HOLD
  ============================================================== */

  const handleHold =
    (
      id: string,
      rate: number,
      unit: string,
    ) => {
      billActions.updateStatus(
        id,
        'HOLD',
        rate,
        unit,
      );
    };

  /* ==============================================================
     MAKE OFFICIAL
  ============================================================== */

  const handleMakeOfficial =
    (
      id: string,
    ) => {
      billActions.updateStatus(
        id,
        'OFFICIAL',
      );
    };

  /* ==============================================================
     BACK TO PENDING
  ============================================================== */

  const handleBackToPending =
    (
      id: string,
    ) => {
      billActions.updateStatus(
        id,
        'PENDING',
      );
    };

  /* ==============================================================
     PAYMENT SUCCESS
  ============================================================== */

  const handlePaymentSuccess =
    (
      referenceNumber: string,
    ) => {
      toast.success(
        `Payment processed! Receipt ${referenceNumber} generated.`,
      );

      reload();
    };

  /* ==============================================================
     QR SCAN
  ============================================================== */

  const handleQrScan =
    async (
      billId: string,
    ) => {
      try {
        const res =
          await finalBillsApi.get(
            billId,
          );

        if (
          res.error ||
          !res.data
        ) {
          toast.error(
            res.errorMessage ||
              'Bill not found.',
          );

          return;
        }

        billActions.handleOpenCashier(
          res.data,
        );
      } catch (
        err: any
      ) {
        toast.error(
          err?.message ||
            'Failed to load bill.',
        );
      }
    };

  /* ==============================================================
     LOADING
  ============================================================== */

  if (
    loading &&
    estimates.length === 0 &&
    finalBills.length === 0
  ) {
    return (
      <LoadingSpinner />
    );
  }

  /* ==============================================================
     SUMMARY COUNTS
  ============================================================== */

  const totalRecords =
    estimates.length +
    finalBills.length;

  const currentRecords =
    activeTab ===
    'estimates'
      ? estimates.length
      : finalBills.length;

  /* ==============================================================
     RENDER
  ============================================================== */

  return (
    <PageContainer
      title="Payments & Billing"
      subtitle="Manage estimates, approvals, and final billing"
      actions={
        <div
          className="
            flex
            w-full
            flex-col
            gap-2
            sm:w-auto
            sm:flex-row
          "
        >
          <Button
            type="button"
            variant="outline"
            className="
              h-11
              w-full
              rounded-md
              px-4

              md:h-9
              md:w-auto
              md:px-3

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            <ArrowDownToLine
              className="
                mr-2
                h-4
                w-4
              "
            />

            Export
          </Button>

          <Button
            type="button"
            variant="outline"
            className="
              h-11
              w-full
              rounded-md
              px-4

              md:h-9
              md:w-auto
              md:px-3

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              focus-visible:ring-offset-2
            "
          >
            <ArrowUpFromLine
              className="
                mr-2
                h-4
                w-4
              "
            />

            Import
          </Button>
        </div>
      }
    >
      <div
        className="
          space-y-4
          md:space-y-5
          lg:space-y-6
        "
      >
        {/* ========================================================
            ERROR
        ========================================================= */}

        {error && (
          <Card
            className="
              border-destructive/20
              bg-card
              shadow-sm
            "
          >
            <CardContent
              className="
                p-0
              "
            >
              <ErrorHandler
                type={
                  error.type
                }
                title={
                  error.title
                }
                message={
                  error.message
                }
              />
            </CardContent>
          </Card>
        )}

        {/* ========================================================
            SUMMARY
        ========================================================= */}

        <section
          aria-label="Payments summary"
          className="
            overflow-hidden
            rounded-xl
            border
            border-border
            bg-card
            text-card-foreground
            shadow-sm
          "
        >
          <div
            className="
              grid
              grid-cols-1
              divide-y
              divide-border

              sm:grid-cols-2
              sm:divide-x
              sm:divide-y-0

              lg:grid-cols-4
            "
          >
            <SummaryMetric
              icon={
                WalletCards
              }
              label="Total Records"
              value={totalRecords.toLocaleString()}
              description="Current loaded records"
            />

            <SummaryMetric
              icon={
                ClipboardList
              }
              label="Estimates"
              value={estimates.length.toLocaleString()}
              description="Estimate records"
              active={
                activeTab ===
                'estimates'
              }
            />

            <SummaryMetric
              icon={
                FileCheck2
              }
              label="Final Bills"
              value={finalBills.length.toLocaleString()}
              description="Generated bills"
              active={
                activeTab ===
                'final-bills'
              }
            />

            <SummaryMetric
              icon={
                ReceiptText
              }
              label="Visible Records"
              value={currentRecords.toLocaleString()}
              description={
                statusFilter ===
                'ALL'
                  ? 'All statuses'
                  : `Filtered: ${statusFilter}`
              }
            />
          </div>
        </section>

        {/* ========================================================
            TOOLBAR
        ========================================================= */}

        <section
          className="
            rounded-xl
            border
            border-border
            bg-card
            p-3
            shadow-sm

            sm:p-4
          "
        >
          <div
            className="
              mb-4
            "
          >
            <PaymentsTabs
              activeTab={
                activeTab
              }
              onTabChange={(
                value,
              ) =>
                setActiveTab(
                  value as
                    | 'estimates'
                    | 'final-bills',
                )
              }
            />
          </div>

          <div
            className="
              flex
              flex-col
              gap-3

              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div
              className="
                w-full
                lg:w-auto
              "
            >
              <FilterBar
                activeTab={
                  activeTab
                }
                statusFilter={
                  statusFilter
                }
                onStatusChange={
                  setStatusFilter
                }
                search={
                  search
                }
                onSearchChange={
                  setSearch
                }
              />
            </div>

            <div
              className="
                flex
                w-full
                flex-col
                gap-2

                sm:flex-row

                lg:w-auto
                lg:min-w-[440px]
              "
            >
              <div
                className="
                  relative
                  min-w-0
                  flex-1
                "
              >
                <Search
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    text-muted-foreground
                  "
                />

                <Input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search by plate, customer, or tracking..."
                  className="
                    h-11
                    w-full
                    rounded-md
                    pl-9
                    text-base

                    md:h-9
                    md:text-sm

                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                    focus-visible:ring-offset-2
                  "
                />
              </div>

              <Button
                type="button"
                onClick={() =>
                  setQrScannerOpen(
                    true,
                  )
                }
                className="
                  h-11
                  w-full
                  shrink-0
                  rounded-md
                  bg-primary
                  px-4
                  text-primary-foreground
                  shadow-sm
                  transition-colors
                  hover:bg-primary/90

                  sm:w-auto

                  md:h-9
                  md:px-4

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  focus-visible:ring-offset-2
                "
              >
                <QrCode
                  className="
                    mr-2
                    h-4
                    w-4
                  "
                />

                Scan QR
              </Button>
            </div>
          </div>
        </section>

        {/* ========================================================
            CONTENT
        ========================================================= */}

        <section
          aria-label="Payment records"
        >
          {activeTab ===
          'estimates' ? (
            <EstimatesList
              estimates={
                estimates
              }

              statusFilter={
                statusFilter
              }

              onRequestSendForApproval={
                handleRequestSendForApproval
              }

              onRequestApprove={
                handleRequestApprove
              }

              onRequestDecline={
                handleRequestDecline
              }

              onOpenDetail={(
                item,
              ) =>
                detail.openDetail(
                  item,
                  'estimate',
                )
              }
            />
          ) : (
            <FinalBillsList
              bills={
                finalBills
              }

              statusFilter={
                statusFilter
              }

              onPay={
                billActions.handleOpenCashier
              }

              onOpenDetail={(
                item,
              ) =>
                detail.openDetail(
                  item,
                  'final-bill',
                )
              }

              onDelete={
                billActions.confirmDelete
              }

              onHold={
                handleHold
              }

              onMakeOfficial={
                handleMakeOfficial
              }

              onBackToPending={
                handleBackToPending
              }

              actionLoading={
                billActions.actionLoading
              }
            />
          )}
        </section>
      </div>

      {/* ==========================================================
          DETAIL MODAL
      =========================================================== */}

      <DetailModal
        open={
          detail.detailModalOpen
        }

        onOpenChange={
          detail.setDetailModalOpen
        }

        detailType={
          detail.detailType
        }

        selectedItem={
          detail.selectedItem
        }

        detailLoading={
          detail.detailLoading
        }

        onAddFee={
          adjustments.handleAddFee
        }

        onAddDiscount={
          adjustments.handleAddDiscount
        }

        onEditPart={
          adjustments.handleEditPartOpen
        }

        feeModalOpen={
          adjustments.feeModalOpen
        }

        setFeeModalOpen={
          adjustments.setFeeModalOpen
        }

        feeForm={
          adjustments.feeForm
        }

        setFeeForm={
          adjustments.setFeeForm
        }

        discountModalOpen={
          adjustments.discountModalOpen
        }

        setDiscountModalOpen={
          adjustments.setDiscountModalOpen
        }

        discountForm={
          adjustments.discountForm
        }

        setDiscountForm={
          adjustments.setDiscountForm
        }

        editPartModalOpen={
          adjustments.editPartModalOpen
        }

        setEditPartModalOpen={
          adjustments.setEditPartModalOpen
        }

        editingPart={
          adjustments.editingPart
        }

        editPartForm={
          adjustments.editPartForm
        }

        setEditPartForm={
          adjustments.setEditPartForm
        }

        submittingAdjustment={
          adjustments.submittingAdjustment
        }

        onSaveFee={
          adjustments.handleAddFee
        }

        onSaveDiscount={
          adjustments.handleAddDiscount
        }

        onSavePart={
          adjustments.handleEditPartSave
        }
      />

      {/* ==========================================================
          FEE MODAL
      =========================================================== */}

      <FeeModal
        open={
          adjustments.feeModalOpen
        }

        onOpenChange={
          adjustments.setFeeModalOpen
        }

        form={
          adjustments.feeForm
        }

        setForm={
          adjustments.setFeeForm
        }

        onSave={
          adjustments.handleAddFee
        }

        saving={
          adjustments.submittingAdjustment
        }

        findings={
          detail.selectedItem
            ?.findings
        }
      />

      {/* ==========================================================
          DISCOUNT MODAL
      =========================================================== */}

      <DiscountModal
        open={
          adjustments.discountModalOpen
        }

        onOpenChange={
          adjustments.setDiscountModalOpen
        }

        form={
          adjustments.discountForm
        }

        setForm={
          adjustments.setDiscountForm
        }

        onSave={
          adjustments.handleAddDiscount
        }

        saving={
          adjustments.submittingAdjustment
        }
      />

      {/* ==========================================================
          EDIT PART
      =========================================================== */}

      <EditPartModal
        open={
          adjustments.editPartModalOpen
        }

        onOpenChange={
          adjustments.setEditPartModalOpen
        }

        part={
          adjustments.editingPart
        }

        form={
          adjustments.editPartForm
        }

        setForm={
          adjustments.setEditPartForm
        }

        onSave={
          adjustments.handleEditPartSave
        }

        saving={
          adjustments.submittingAdjustment
        }
      />

      {/* ==========================================================
          DELETE CONFIRMATION
      =========================================================== */}

      <DeleteConfirmationModal
        open={
          billActions.deleteDialogOpen
        }

        onOpenChange={
          billActions.setDeleteDialogOpen
        }

        onConfirm={() =>
          billActions.handleDelete(
            activeTab,
          )
        }
      />

      {/* ==========================================================
          CASHIER
      =========================================================== */}

      <CashierModal
        open={
          billActions.cashierModalOpen
        }

        onOpenChange={
          billActions.setCashierModalOpen
        }

        bill={
          billActions.selectedBillForPayment
        }

        onPaid={
          handlePaymentSuccess
        }
      />

      {/* ==========================================================
          QR SCANNER
      =========================================================== */}

      <QRScannerModal
        open={
          qrScannerOpen
        }

        onOpenChange={
          setQrScannerOpen
        }

        onScan={
          handleQrScan
        }
      />

      {/* ==========================================================
          RECEIPT
      =========================================================== */}

      <ReceiptModal
        open={
          receiptModalOpen
        }

        onOpenChange={
          setReceiptModalOpen
        }

        receiptData={
          receiptData
        }

        referenceNumber={
          receiptReference
        }
      />

      {/* ==========================================================
          SEND ESTIMATE CONFIRMATION

          Pending estimate -> detailed review -> consent ->
          actual Send For Approval API call.
      =========================================================== */}

      <SendEstimateConfirmationModal
        open={
          sendConfirmationOpen
        }

        onOpenChange={(
          open,
        ) => {
          if (
            confirmationActionLoading
          ) {
            return;
          }

          setSendConfirmationOpen(
            open,
          );

          if (
            !open
          ) {
            setConfirmationEstimate(
              null,
            );
          }
        }}

        estimate={
          confirmationEstimate
        }

        onConfirm={
          handleConfirmSendForApproval
        }

        saving={
          confirmationActionLoading ||
          confirmationLoading
        }
      />

      {/* ==========================================================
          APPROVE ESTIMATE CONFIRMATION

          Includes explicit consent that the action cannot be
          undone and that the staff member is responsible.
      =========================================================== */}

      <ApproveEstimateConfirmationModal
        open={
          approveConfirmationOpen
        }

        onOpenChange={(
          open,
        ) => {
          if (
            confirmationActionLoading
          ) {
            return;
          }

          setApproveConfirmationOpen(
            open,
          );

          if (
            !open
          ) {
            setConfirmationEstimate(
              null,
            );
          }
        }}

        estimate={
          confirmationEstimate
        }

        onConfirm={
          handleConfirmApprove
        }

        saving={
          confirmationActionLoading ||
          confirmationLoading
        }
      />

      {/* ==========================================================
          DECLINE ESTIMATE CONFIRMATION

          Includes:
            - decline reason
            - irreversible-action warning
            - explicit responsibility consent
      =========================================================== */}

      <DeclineEstimateConfirmationModal
        open={
          declineConfirmationOpen
        }

        onOpenChange={(
          open,
        ) => {
          if (
            confirmationActionLoading
          ) {
            return;
          }

          setDeclineConfirmationOpen(
            open,
          );

          if (
            !open
          ) {
            setConfirmationEstimate(
              null,
            );
          }
        }}

        estimate={
          confirmationEstimate
        }

        onConfirm={
          handleConfirmDecline
        }

        saving={
          confirmationActionLoading ||
          confirmationLoading
        }
      />
    </PageContainer>
  );
}

/* ================================================================
   SUMMARY METRIC
================================================================ */

function SummaryMetric({
  icon: Icon,
  label,
  value,
  description,
  active = false,
}: {
  icon: React.ElementType;

  label: string;

  value: string;

  description: string;

  active?: boolean;
}) {
  return (
    <div
      className={`
        flex
        items-center
        gap-3
        px-4
        py-4

        sm:px-5

        ${
          active
            ? 'bg-primary/[0.035]'
            : ''
        }
      `}
    >
      <div
        className={`
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-md
          border

          ${
            active
              ? 'border-primary/20 bg-primary/10 text-primary'
              : 'border-border bg-muted/50 text-muted-foreground'
          }
        `}
      >
        <Icon
          className="
            h-4
            w-4
          "
        />
      </div>

      <div
        className="
          min-w-0
        "
      >
        <p
          className="
            truncate
            text-xs
            font-medium
            text-muted-foreground
          "
        >
          {
            label
          }
        </p>

        <p
          className="
            mt-0.5
            text-xl
            font-semibold
            tracking-tight
            text-foreground

            md:text-lg

            lg:text-xl
          "
        >
          {
            value
          }
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[11px]
            text-muted-foreground
          "
        >
          {
            description
          }
        </p>
      </div>
    </div>
  );
}