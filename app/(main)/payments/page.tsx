'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  FileCheck2,
  FileText,
  QrCode,
  ReceiptText,
  Search,
  WalletCards,
} from 'lucide-react';

import PageContainer from '@/components/shared/page-container';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ErrorHandler from '@/components/shared/error-handler';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Hooks
import { usePaymentsData } from '@/hooks/payments/usePaymentsData';
import { useEstimateActions } from '@/hooks/payments/useEstimateActions';
import { useFinalBillActions } from '@/hooks/payments/useFinalBillActions';
import { useDetailModal } from '@/hooks/payments/useDetailModal';
import { useAdjustments } from '@/hooks/payments/useAdjustments';

// Components
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

import { finalBillsApi } from '@/lib/payments/final-bills';

export default function PaymentsPage() {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'estimates' | 'final-bills'>('estimates');
  const [search, setSearch] = useState('');

  const { estimates, finalBills, loading, error, reload } = usePaymentsData(
    statusFilter,
    search
  );

  const estimateActions = useEstimateActions(reload);
  const billActions = useFinalBillActions(reload);
  const detail = useDetailModal(reload);

  const adjustments = useAdjustments({
    selectedItem: detail.selectedItem,
    detailType: detail.detailType,
    refreshDetail: detail.refreshDetail,
    reloadList: reload,
  });

  // Cashier & Receipt
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptReference, setReceiptReference] = useState('');

  // QR Scanner
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const handleHold = (id: string, rate: number, unit: string) => {
    billActions.updateStatus(id, 'HOLD', rate, unit);
  };

  const handleMakeOfficial = (id: string) => {
    billActions.updateStatus(id, 'OFFICIAL');
  };

  const handleBackToPending = (id: string) => {
    billActions.updateStatus(id, 'PENDING');
  };

  const handlePaymentSuccess = (referenceNumber: string) => {
    toast.success(`Payment processed! Receipt ${referenceNumber} generated.`);
    reload();
  };

  const handleQrScan = async (billId: string) => {
    try {
      const res = await finalBillsApi.get(billId);

      if (res.error || !res.data) {
        toast.error(res.errorMessage || 'Bill not found.');
        return;
      }

      billActions.handleOpenCashier(res.data);
    } catch (err: any) {
      toast.error('Failed to load bill.');
    }
  };

  if (loading && estimates.length === 0 && finalBills.length === 0) {
    return <LoadingSpinner />;
  }

  const totalRecords = estimates.length + finalBills.length;
  const currentRecords =
    activeTab === 'estimates' ? estimates.length : finalBills.length;

  return (
    <PageContainer
      title="Payments & Billing"
      subtitle="Manage estimates, approvals, and final billing"
      actions={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="
              h-11 w-full rounded-md px-4 md:h-9 md:w-auto md:px-3
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            type="button"
            variant="outline"
            className="
              h-11 w-full rounded-md px-4 md:h-9 md:w-auto md:px-3
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <ArrowUpFromLine className="mr-2 h-4 w-4" />
            Import
          </Button>

          <Button
            type="button"
            onClick={() => setQrScannerOpen(true)}
            className="
              h-11 w-full rounded-md bg-primary px-4
              text-primary-foreground shadow-sm
              transition-colors hover:bg-primary/90
              md:h-9 md:w-auto md:px-3
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <QrCode className="mr-2 h-4 w-4" />
            Scan QR
          </Button>
        </div>
      }
    >
      <div className="space-y-4 md:space-y-5 lg:space-y-6">
        {error && (
          <Card className="border-destructive/20 bg-card shadow-sm">
            <CardContent className="p-0">
              <ErrorHandler
                type={error.type}
                title={error.title}
                message={error.message}
              />
            </CardContent>
          </Card>
        )}

        {/* KPI STRIP */}
        <section
          aria-label="Payments summary"
          className="
            overflow-hidden rounded-xl border border-border
            bg-card text-card-foreground shadow-sm
          "
        >
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            <SummaryMetric
              icon={WalletCards}
              label="Total Records"
              value={totalRecords.toLocaleString()}
              description="Current loaded records"
            />

            <SummaryMetric
              icon={ClipboardList}
              label="Estimates"
              value={estimates.length.toLocaleString()}
              description="Estimate records"
              active={activeTab === 'estimates'}
            />

            <SummaryMetric
              icon={FileCheck2}
              label="Final Bills"
              value={finalBills.length.toLocaleString()}
              description="Generated bills"
              active={activeTab === 'final-bills'}
            />

            <SummaryMetric
              icon={ReceiptText}
              label="Visible Records"
              value={currentRecords.toLocaleString()}
              description={
                statusFilter === 'ALL'
                  ? 'All statuses'
                  : `Filtered: ${statusFilter}`
              }
            />
          </div>
        </section>

        {/* TOOLBAR */}
        <section
          className="
            rounded-xl border border-border bg-card
            p-3 shadow-sm sm:p-4
          "
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <PaymentsTabs
                activeTab={activeTab}
                onTabChange={(value) =>
                  setActiveTab(value as 'estimates' | 'final-bills')
                }
              />
            </div>

            <div className="w-full lg:max-w-sm">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="
                    pointer-events-none absolute left-3 top-1/2
                    h-4 w-4 -translate-y-1/2 text-muted-foreground
                  "
                />

                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by plate, customer, or tracking..."
                  className="
                    h-11 rounded-md pl-9 text-base
                    md:h-9 md:text-sm
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-ring focus-visible:ring-offset-2
                  "
                />
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <FilterBar
              activeTab={activeTab}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              search={search}
              onSearchChange={setSearch}
            />
          </div>
        </section>

        {/* CONTENT */}
        <section aria-label="Payment records">
          {activeTab === 'estimates' ? (
            <EstimatesList
              estimates={estimates}
              statusFilter={statusFilter}
              onSendForApproval={estimateActions.handleSendForApproval}
              onApprove={estimateActions.handleApproveEstimate}
              onDecline={estimateActions.handleDeclineEstimate}
              onOpenDetail={(item) => detail.openDetail(item, 'estimate')}
            />
          ) : (
            <FinalBillsList
              bills={finalBills}
              statusFilter={statusFilter}
              onPay={billActions.handleOpenCashier}
              onOpenDetail={(item) => detail.openDetail(item, 'final-bill')}
              onDelete={billActions.confirmDelete}
              onHold={handleHold}
              onMakeOfficial={handleMakeOfficial}
              onBackToPending={handleBackToPending}
              actionLoading={billActions.actionLoading}
            />
          )}
        </section>
      </div>

      <DetailModal
        open={detail.detailModalOpen}
        onOpenChange={detail.setDetailModalOpen}
        detailType={detail.detailType}
        selectedItem={detail.selectedItem}
        detailLoading={detail.detailLoading}
        onAddFee={adjustments.handleAddFee}
        onAddDiscount={adjustments.handleAddDiscount}
        onEditPart={adjustments.handleEditPartOpen}
        feeModalOpen={adjustments.feeModalOpen}
        setFeeModalOpen={adjustments.setFeeModalOpen}
        feeForm={adjustments.feeForm}
        setFeeForm={adjustments.setFeeForm}
        discountModalOpen={adjustments.discountModalOpen}
        setDiscountModalOpen={adjustments.setDiscountModalOpen}
        discountForm={adjustments.discountForm}
        setDiscountForm={adjustments.setDiscountForm}
        editPartModalOpen={adjustments.editPartModalOpen}
        setEditPartModalOpen={adjustments.setEditPartModalOpen}
        editingPart={adjustments.editingPart}
        editPartForm={adjustments.editPartForm}
        setEditPartForm={adjustments.setEditPartForm}
        submittingAdjustment={adjustments.submittingAdjustment}
        onSaveFee={adjustments.handleAddFee}
        onSaveDiscount={adjustments.handleAddDiscount}
        onSavePart={adjustments.handleEditPartSave}
      />

      <FeeModal
        open={adjustments.feeModalOpen}
        onOpenChange={adjustments.setFeeModalOpen}
        form={adjustments.feeForm}
        setForm={adjustments.setFeeForm}
        onSave={adjustments.handleAddFee}
        saving={adjustments.submittingAdjustment}
        findings={detail.selectedItem?.findings}
      />

      <DiscountModal
        open={adjustments.discountModalOpen}
        onOpenChange={adjustments.setDiscountModalOpen}
        form={adjustments.discountForm}
        setForm={adjustments.setDiscountForm}
        onSave={adjustments.handleAddDiscount}
        saving={adjustments.submittingAdjustment}
      />

      <EditPartModal
        open={adjustments.editPartModalOpen}
        onOpenChange={adjustments.setEditPartModalOpen}
        part={adjustments.editingPart}
        form={adjustments.editPartForm}
        setForm={adjustments.setEditPartForm}
        onSave={adjustments.handleEditPartSave}
        saving={adjustments.submittingAdjustment}
      />

      <DeleteConfirmationModal
        open={billActions.deleteDialogOpen}
        onOpenChange={billActions.setDeleteDialogOpen}
        onConfirm={() => billActions.handleDelete(activeTab)}
      />

      <CashierModal
        open={billActions.cashierModalOpen}
        onOpenChange={billActions.setCashierModalOpen}
        bill={billActions.selectedBillForPayment}
        onPaid={handlePaymentSuccess}
      />

      <QRScannerModal
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQrScan}
      />

      <ReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        receiptData={receiptData}
        referenceNumber={receiptReference}
      />
    </PageContainer>
  );
}

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
        flex items-center gap-3 px-4 py-4
        sm:px-5
        ${active ? 'bg-primary/[0.035]' : ''}
      `}
    >
      <div
        className={`
          flex h-9 w-9 shrink-0 items-center justify-center rounded-md
          border
          ${active ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}
        `}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">
          {label}
        </p>

        <p className="mt-0.5 text-xl font-semibold tracking-tight text-foreground md:text-lg lg:text-xl">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}