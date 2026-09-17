export type DiscountPresetType =
  | 'fixed'
  | 'percentage';

export interface LaborPreset {
  id: string;
  title: string;
  amount: number;
}

export interface DiscountPreset {
  id: string;
  title: string;
  type: DiscountPresetType;
  value: number;
}

/*
 * ================================================================
 * DEFAULT LABOR PRESETS
 *
 * These are starter values for the Automotive Service Center.
 *
 * IMPORTANT:
 * Replace these amounts with the actual rates approved by
 * AutoProTech Service Center.
 * ================================================================
 */

export const DEFAULT_LABOR_PRESETS: LaborPreset[] = [
  {
    id: 'diagnostic-inspection',
    title: 'Diagnostic / Inspection Labor',
    amount: 300,
  },
  {
    id: 'preventive-maintenance',
    title: 'Preventive Maintenance Labor',
    amount: 500,
  },
  {
    id: 'minor-repair',
    title: 'Minor Repair Labor',
    amount: 800,
  },
  {
    id: 'standard-repair',
    title: 'Standard Repair Labor',
    amount: 1200,
  },
  {
    id: 'major-repair',
    title: 'Major Repair Labor',
    amount: 2000,
  },
];

/*
 * ================================================================
 * DEFAULT DISCOUNT PRESETS
 *
 * These are starter values.
 *
 * Replace these with the discount programs actually approved
 * by AutoProTech Service Center.
 * ================================================================
 */

export const DEFAULT_DISCOUNT_PRESETS: DiscountPreset[] = [
  {
    id: 'courtesy-100',
    title: 'Courtesy Discount',
    type: 'fixed',
    value: 100,
  },
  {
    id: 'service-200',
    title: 'Service Discount',
    type: 'fixed',
    value: 200,
  },
  {
    id: 'loyalty-5',
    title: 'Loyalty Discount',
    type: 'percentage',
    value: 5,
  },
  {
    id: 'loyalty-10',
    title: 'Loyalty Discount',
    type: 'percentage',
    value: 10,
  },
];