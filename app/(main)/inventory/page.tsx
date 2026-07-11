import PageContainer from '@/components/shared/page-container';
import InventoryList from '@/components/inventory/inventory-list';

export default function InventoryPage() {
  return (
    <PageContainer title="Inventory Management" subtitle="Manage parts, supplies, and consumables">
      <InventoryList />
    </PageContainer>
  );
}