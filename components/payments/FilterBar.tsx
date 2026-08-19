import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface FilterBarProps {
  activeTab: 'estimates' | 'final-bills';
  statusFilter: string;
  onStatusChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function FilterBar({
  activeTab,
  statusFilter,
  onStatusChange,
  search,
  onSearchChange,
}: FilterBarProps) {
  // Status options based on active tab
  const statusOptions =
    activeTab === 'estimates'
      ? [
          { value: 'ALL', label: 'All Status' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'WAITING_FOR_APPROVAL', label: 'Waiting Approval' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'DECLINED', label: 'Declined' },
        ]
      : [
          { value: 'ALL', label: 'All Status' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'HOLD', label: 'On Hold' },
          { value: 'OFFICIAL', label: 'Official' },
          { value: 'PAID', label: 'Paid' },
        ];

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px] h-9 rounded-xl border-slate-200">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by plate, customer, or tracking..."
          className="pl-10 rounded-xl"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}