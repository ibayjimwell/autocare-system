import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
}: FilterBarProps) {
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Status
        </span>

        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger
            className="
              h-11 w-full rounded-md text-base sm:w-[190px]
              md:h-9 md:text-sm
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring focus-visible:ring-offset-2
            "
          >
            <SelectValue placeholder="All Status" />
          </SelectTrigger>

          <SelectContent className="rounded-lg">
            {statusOptions.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-ring focus-visible:ring-offset-2
                "
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-muted-foreground">
        Use the search field above to quickly locate a record.
      </div>
    </div>
  );
}