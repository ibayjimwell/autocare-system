'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { QrCode } from 'lucide-react';
import PageContainer from '@/components/shared/page-container';
import LoadingSpinner from '@/components/shared/loading-spinner';
import ErrorHandler from '@/components/shared/error-handler';
import { Button } from '@/components/ui/button';

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

  const { estimates, finalBills, loading, error, reload } = usePaymentsData(statusFilter, search);
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

  // ✅ Corrected: handleHold now expects rate and unit
  const handleHold = (id: string, rate: number, unit: string) => {
    billActions.updateStatus(id, 'HOLD', rate, unit);
  };

  const handleMakeOfficial = (id: string) => billActions.updateStatus(id, 'OFFICIAL');
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

  if (loading && estimates.length === 0 && finalBills.length === 0) return <LoadingSpinner />;

  return (
    <PageContainer
      title="Payments & Billing"
      subtitle="Manage estimates, approvals, and final billing"
      actions={
        <Button
          onClick={() => setQrScannerOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 px-6 active:scale-95 transition-all"
        >
          <QrCode className="w-5 h-5 mr-2" /> Scan QR
        </Button>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorHandler type={error.type} title={error.title} message={error.message} />
        </div>
      )}

      <FilterBar
        activeTab={activeTab}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        search={search}
        onSearchChange={setSearch}
      />

      <PaymentsTabs activeTab={activeTab} onTabChange={(v) => setActiveTab(v as 'estimates' | 'final-bills')} />

      <div className="mt-6">
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