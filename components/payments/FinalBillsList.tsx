import { FinalBill } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/status-badge';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import { DollarSign, Eye, Trash2, PauseCircle, Send, Undo2 } from 'lucide-react';

interface FinalBillsListProps {
  bills: FinalBill[];
  statusFilter: string;
  onPay: (bill: FinalBill) => void;
  onOpenDetail: (item: FinalBill, type: 'final-bill') => void;
  onDelete: (id: string) => void;
  onHold: (id: string) => void;
  onMakeOfficial: (id: string) => void;
  onBackToPending: (id: string) => void;
  actionLoading: boolean;
}

export default function FinalBillsList({
  bills,
  statusFilter,
  onPay,
  onOpenDetail,
  onDelete,
  onHold,
  onMakeOfficial,
  onBackToPending,
  actionLoading,
}: FinalBillsListProps) {
  if (bills.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No final bills"
        description={
          statusFilter !== 'ALL'
            ? 'No final bills with the selected status.'
            : 'Final bills are generated from approved estimates.'
        }
      />
    );
  }

  const renderActions = (bill: FinalBill) => {
    const status = bill.status;
    const isLoading = actionLoading;

    switch (status) {
      case 'PENDING':
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onHold(bill.id)}
              disabled={isLoading}
              className="h-8 text-xs font-bold border-amber-500 text-amber-600 hover:bg-amber-50"
            >
              <PauseCircle className="w-3.5 h-3.5 mr-1" /> Hold
            </Button>
            <Button
              size="sm"
              onClick={() => onMakeOfficial(bill.id)}
              disabled={isLoading}
              className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </div>
        );
      case 'HOLD':
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBackToPending(bill.id)}
              disabled={isLoading}
              className="h-8 text-xs font-bold border-slate-400 text-slate-600 hover:bg-slate-50"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
            <Button
              size="sm"
              onClick={() => onMakeOfficial(bill.id)}
              disabled={isLoading}
              className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </div>
        );
      case 'OFFICIAL':
        return (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={() => onPay(bill)}
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" /> Pay
            </Button>
          </div>
        );
      case 'PAID':
        return (
          <span className="text-xs font-bold text-green-600">Paid</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {bills.map((bill) => (
          <Card key={bill.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">Final Bill</p>
                  <p className="text-xs text-muted-foreground">#{bill.id.slice(0, 8)}</p>
                </div>
                <StatusBadge status={bill.status} className="text-[10px]" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-black text-primary">₱{formatCurrency(bill.grandTotal)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {renderActions(bill)}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenDetail(bill, 'final-bill')}
                  className="h-8 text-xs font-bold"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
                {bill.status !== 'PAID' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-red-500"
                    onClick={() => onDelete(bill.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block border-none shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Bill ID
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                Total
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm">{bill.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell>
                  <StatusBadge status={bill.status} className="text-[10px]" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(bill.createdAt), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right font-bold text-primary">
                  ₱{formatCurrency(bill.grandTotal)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {renderActions(bill)}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenDetail(bill, 'final-bill')}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {bill.status !== 'PAID' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => onDelete(bill.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}