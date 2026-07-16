// components/payments/PaymentsTabs.tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, DollarSign } from 'lucide-react';

interface PaymentsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export default function PaymentsTabs({ activeTab, onTabChange }: PaymentsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="bg-muted/30 p-1 rounded-2xl h-12 w-full sm:w-auto grid grid-cols-2">
        <TabsTrigger value="estimates" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
          <Receipt className="w-4 h-4 mr-2" /> Estimates
        </TabsTrigger>
        <TabsTrigger value="final-bills" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold">
          <DollarSign className="w-4 h-4 mr-2" /> Final Bills
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}