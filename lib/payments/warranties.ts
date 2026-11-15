import { eq, inArray } from 'drizzle-orm';
import { Database } from '@/lib/drizzle';
import { ServiceWarranties, ServiceWarrantyParts } from '@/database/models/payments/service-warranties.model';
import { FinalBill } from '@/database/models/payments/final-bill.model';
import { Inventory } from '@/database/models/inventory/inventory.model';

export type ServiceWarranty = {
  id: string;
  estimateId: string;
  title: string;
  coverageType: string;
  provider: string;
  startDate: string;
  endDate: string;
  coverage: string;
  terms: string;
  exclusions: string;
  claimInstructions: string;
  contact: string;
  parts: Array<{ inventoryId: string | null; partName: string }>;
};

/** Source of truth for estimate, final cost, shared document, and receipt. */
export async function loadEstimateWarranties(estimateId: string | null | undefined): Promise<ServiceWarranty[]> {
  if (!estimateId) return [];
  const warranties = await Database.select().from(ServiceWarranties).where(eq(ServiceWarranties.estimateId, estimateId));
  if (!warranties.length) return [];
  const parts = await Database.select().from(ServiceWarrantyParts).where(inArray(ServiceWarrantyParts.warrantyId, warranties.map(w => w.id)));
  return warranties.map(w => ({ ...w, parts: parts.filter(p => p.warrantyId === w.id).map(p => ({ inventoryId: p.inventoryId, partName: p.partName })) }));
}

export async function loadFinalBillWarranties(finalBillId: string): Promise<ServiceWarranty[]> {
  const [bill] = await Database.select({ estimateId: FinalBill.estimateId }).from(FinalBill).where(eq(FinalBill.id, finalBillId)).limit(1);
  return loadEstimateWarranties(bill?.estimateId);
}

export async function loadInventoryWarranties(inventoryId: string) {
  const linked = await Database.select({ warrantyId: ServiceWarrantyParts.warrantyId }).from(ServiceWarrantyParts).where(eq(ServiceWarrantyParts.inventoryId, inventoryId));
  if (!linked.length) return [];
  const all = await Database.select().from(ServiceWarranties).where(inArray(ServiceWarranties.id, linked.map(p => p.warrantyId)));
  return all.map(w => ({ id: w.id, title: w.title, estimateId: w.estimateId, startDate: w.startDate, endDate: w.endDate, coverageType: w.coverageType }));
}

export async function selectWarrantyInventory(ids: string[]) {
  if (!ids.length) return [];
  const unique = Array.from(new Set(ids));
  return Database.select({ id: Inventory.id, name: Inventory.name, active: Inventory.active }).from(Inventory).where(inArray(Inventory.id, unique));
}
