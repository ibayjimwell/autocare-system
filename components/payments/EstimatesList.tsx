// components/payments/EstimatesList.tsx
import { Estimate } from '@/hooks/payments/usePaymentsData';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/shared/status-badge';
import EmptyState from '@/components/shared/empty-state';
import { formatCurrency } from '@/app-utils/payments/payments';
import { format } from 'date-fns';
import { FileText, CheckCircle, Check, XCircle, Eye } from 'lucide-react';

interface EstimatesListProps {
  estimates: Estimate[];
  statusFilter: string;
  onSendForApproval: (id: string) => void;
  onApprove: (id: string) => void;
  onDecline: (id: string, reason: string) => void;
  onOpenDetail: (item: Estimate, type: 'estimate') => void;
}

export default function EstimatesList({
  estimates, statusFilter,
  onSendForApproval, onApprove, onDecline, onOpenDetail,
}: EstimatesListProps) {
  if (estimates.length === 0) {
    return <EmptyState icon={FileText} title="No estimates" description={statusFilter !== 'ALL' ? 'No estimates with the selected status.' : 'Create an estimate from a confirmed appointment.'} />;
  }
  return (
    <div className="space-y-4">
      {/* Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {estimates.map((est) => (
          <Card key={est.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{est.appointment?.customer?.fullname || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground">{est.appointment?.vehicle?.plateNumber || 'N/A'}</p>
                </div>
                <StatusBadge status={est.status} className="text-[10px]" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-black text-primary">₱{formatCurrency(est.grandTotal)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {est.status === 'PENDING' && (
                  <Button size="sm" onClick={() => onSendForApproval(est.id)} className="h-8 text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Send for Approval
                  </Button>
                )}
                {est.status === 'WAITING_FOR_APPROVAL' && (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => onApprove(est.id)} className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold">
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" onClick={() => {
                      const reason = prompt('Reason for declining:');
                      if (reason) onDecline(est.id, reason);
                    }}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => onOpenDetail(est, 'estimate')} className="h-8 text-xs font-bold">
                  <Eye className="w-3.5 h-3.5 mr-1" /> View
                </Button>
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
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Customer / Vehicle</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Total</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.map((est) => (
              <TableRow key={est.id} className="hover:bg-muted/30">
                <TableCell>
                  <div>
                    <p className="font-bold">{est.appointment?.customer?.fullname || 'Customer'}</p>
                    <p className="text-xs text-muted-foreground">{est.appointment?.vehicle?.plateNumber || 'N/A'}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {est.appointment?.appointmentDate ? format(new Date(est.appointment.appointmentDate), 'MMM dd, yyyy') : 'N/A'}
                </TableCell>
                <TableCell><StatusBadge status={est.status} className="text-[10px]" /></TableCell>
                <TableCell className="text-right font-bold text-primary">₱{formatCurrency(est.grandTotal)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {est.status === 'PENDING' && (
                      <Button size="sm" variant="outline" onClick={() => onSendForApproval(est.id)} className="h-8 text-xs font-bold">
                        <CheckCircle className="w-3.5 h-3.5" /> Send
                      </Button>
                    )}
                    {est.status === 'WAITING_FOR_APPROVAL' && (
                      <>
                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-bold" onClick={() => onApprove(est.id)}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-8 text-xs font-bold" onClick={() => {
                          const reason = prompt('Reason for declining:');
                          if (reason) onDecline(est.id, reason);
                        }}>
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onOpenDetail(est, 'estimate')} className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
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