export interface WarrantyInput {
  title: string; coverageType: 'SERVICE'|'PARTS'|'BOTH'; provider: string;
  startDate: string; endDate: string; coverage: string; terms: string;
  exclusions: string; claimInstructions: string; contact: string; inventoryIds: string[];
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = /^\d{4}-\d{2}-\d{2}$/;
function str(v: unknown, max: number) { return typeof v === 'string' ? v.trim().slice(0, max + 1) : ''; }
export function parseWarrantyInput(raw: unknown): WarrantyInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid warranty form.');
  const v = raw as Record<string, unknown>;
  const title = str(v.title, 160), provider = str(v.provider, 160), coverage = str(v.coverage, 5000),
    terms = str(v.terms, 5000), exclusions = str(v.exclusions, 5000), claimInstructions = str(v.claimInstructions, 3000),
    contact = str(v.contact, 255), startDate = str(v.startDate, 10), endDate = str(v.endDate, 10);
  const coverageType = v.coverageType;
  if (!title || title.length > 160 || !provider || provider.length > 160 || !coverage || coverage.length > 5000 ||
    !terms || terms.length > 5000 || !claimInstructions || claimInstructions.length > 3000 ||
    exclusions.length > 5000 || contact.length > 255) throw new Error('Complete the required warranty fields within their length limits.');
  if (coverageType !== 'SERVICE' && coverageType !== 'PARTS' && coverageType !== 'BOTH') throw new Error('Choose a valid coverage type.');
  if (!date.test(startDate) || !date.test(endDate) || !Number.isFinite(Date.parse(startDate+'T00:00:00Z')) ||
    !Number.isFinite(Date.parse(endDate+'T00:00:00Z')) ||
    new Date(startDate).toISOString().slice(0,10)!==startDate || new Date(endDate).toISOString().slice(0,10)!==endDate || endDate < startDate)
    throw new Error('Enter valid coverage start and end dates (end must not precede start).');
  const ids = v.inventoryIds;
  if (!Array.isArray(ids) || ids.length > 100 || !ids.every(x => typeof x === 'string' && uuid.test(x))) throw new Error('Invalid inventory parts selection.');
  const inventoryIds = [...new Set(ids)];
  if ((coverageType === 'PARTS' || coverageType === 'BOTH') && !inventoryIds.length) throw new Error('Parts coverage requires at least one linked inventory item.');
  return { title, coverageType, provider, startDate, endDate, coverage, terms, exclusions, claimInstructions, contact, inventoryIds };
}
