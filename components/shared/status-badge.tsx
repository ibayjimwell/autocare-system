import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  PENDING: { color: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20', label: 'Pending' },
  CONFIRMED: { color: 'bg-red-600/10 text-red-700 border-red-600/20 hover:bg-red-600/20', label: 'Confirmed' },
  UNDER_INSPECTION: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20', label: 'Under Inspection' },
  WAITING_FOR_APPROVAL: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20', label: 'Awaiting Approval' },
  WAITING_APPROVAL: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20', label: 'Awaiting Approval' },
  PENDING_APPROVAL: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20', label: 'Pending Approval' },
  IN_PROGRESS: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20', label: 'In Progress' },
  COMPLETED: { color: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20', label: 'Completed' },
  CANCELLED: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20 hover:bg-gray-500/20', label: 'Cancelled' },
  APPROVED: { color: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20', label: 'Approved' },
  PAID: { color: 'bg-green-500/10 text-green-700 border-green-500/20 hover:bg-green-500/20', label: 'Paid' },
  ESTIMATE: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20', label: 'Estimate' },
  FINAL: { color: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20', label: 'Final' },
};

export default function StatusBadge({ status, className }) {
  const config = STATUS_CONFIG[status] || { color: 'bg-muted text-muted-foreground', label: status };
  return (
    <Badge variant="outline" className={cn('text-xs font-semibold border', config.color, className)}>
      {config.label}
    </Badge>
  );
}