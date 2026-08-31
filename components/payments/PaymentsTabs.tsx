import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ReceiptText } from 'lucide-react';

interface PaymentsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function PaymentsTabs({
  activeTab,
  onTabChange,
}: PaymentsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList
        className="
          grid h-11 w-full grid-cols-2 rounded-md
          bg-muted/60 p-1 md:h-9 md:w-auto md:min-w-[280px]
        "
      >
        <TabsTrigger
          value="estimates"
          className="
            h-9 rounded-sm px-4 text-sm font-medium
            data-[state=active]:bg-card
            data-[state=active]:text-foreground
            data-[state=active]:shadow-sm
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            md:h-7
          "
        >
          <FileText className="mr-2 h-4 w-4" />
          Estimates
        </TabsTrigger>

        <TabsTrigger
          value="final-bills"
          className="
            h-9 rounded-sm px-4 text-sm font-medium
            data-[state=active]:bg-card
            data-[state=active]:text-foreground
            data-[state=active]:shadow-sm
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            md:h-7
          "
        >
          <ReceiptText className="mr-2 h-4 w-4" />
          Final Bills
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}