import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/staffs/auth';
import { Database } from '@/lib/drizzle';
import { Inventory } from '@/database/models/inventory/inventory.model';
import { PosTransaction } from '@/database/models/payments/pos-transaction.model';
import { inventoryTriggers } from '@/triggers/inventory';
import { recordPaymentTransaction } from '@/utils/payments/payment-transactions';

// The saved POS transaction is the source of truth for the receipt and history.
// Both the stock deduction and the receipt's immutable item/price snapshots are
// committed in one database transaction.
class PosCheckoutError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = 'PosCheckoutError';
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cents(value: number | string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new PosCheckoutError('Invalid monetary amount.');
  }
  return Math.round(number * 100);
}

function money(valueInCents: number): string {
  return (valueInCents / 100).toFixed(2);
}

type CartLine = { id: string; quantity: number };

function normalizedItems(raw: unknown): CartLine[] {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 100) {
    throw new PosCheckoutError('Add between 1 and 100 inventory items to the cart.');
  }
  const grouped = new Map<string, number>();
  for (const item of raw) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    const quantity = Number(item?.quantity);
    if (!UUID_RE.test(id) || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100000) {
      throw new PosCheckoutError('Each POS line must contain a valid inventory ID and a positive whole-number quantity.');
    }
    const next = (grouped.get(id) || 0) + quantity;
    if (!Number.isSafeInteger(next) || next > 100000) {
      throw new PosCheckoutError('The requested item quantity is too large.');
    }
    grouped.set(id, next);
  }
  return [...grouped.entries()]
    .map(([id, quantity]) => ({ id, quantity }))
    .sort((left, right) => left.id.localeCompare(right.id)); // stable lock order
}

function sameCheckout(existing: typeof PosTransaction.$inferSelect, lines: CartLine[], receivedCents: number): boolean {
  if (cents(existing.paymentReceived) !== receivedCents) return false;
  const saved = Array.isArray(existing.items) ? existing.items as any[] : [];
  if (saved.length !== lines.length) return false;
  const actual = new Map(saved.map((item) => [String(item?.id), Number(item?.quantity)]));
  return lines.every((line) => actual.get(line.id) === line.quantity);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: true, errorMessage: 'Unauthorized.' }, { status: 401 });
  }
  if (session.user.access?.payments !== true) {
    return NextResponse.json({ error: true, errorMessage: 'Payments access is required.' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: true, errorMessage: 'Invalid JSON.' }, { status: 400 });
  }

  const staffId = session.user.id;
  let lines: CartLine[];
  let receivedCents: number;
  let checkoutId: string;
  try {
    lines = normalizedItems(body?.items);
    if (typeof body?.paymentReceived !== 'number') {
      throw new PosCheckoutError('Payment amount must be a number.');
    }
    receivedCents = cents(body.paymentReceived);
    if (receivedCents <= 0 || receivedCents > 9999999999) {
      throw new PosCheckoutError('Payment amount is outside the supported range.');
    }
    checkoutId = body.transactionId == null ? randomUUID() : String(body.transactionId);
    if (!UUID_RE.test(checkoutId)) {
      throw new PosCheckoutError('Invalid transaction ID.');
    }
  } catch (error) {
    return NextResponse.json(
      { error: true, errorMessage: error instanceof Error ? error.message : 'Invalid sale details.' },
      { status: 422 },
    );
  }

  // A browser can retry after a lost response. The same transaction UUID must
  // return the saved receipt without charging or decrementing stock twice.
  const findExisting = async () => {
    const [existing] = await Database.select().from(PosTransaction).where(eq(PosTransaction.id, checkoutId));
    if (!existing) return null;
    if (existing.staffId !== staffId || !sameCheckout(existing, lines, receivedCents)) {
      throw new PosCheckoutError('This transaction ID belongs to another or changed checkout.', 409);
    }
    return existing;
  };

  try {
    const previous = await findExisting();
    if (previous) {
      return NextResponse.json(
        { error: false, message: 'Sale already recorded. Here is its saved receipt.', data: previous, alreadyRecorded: true },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    }

    const result = await Database.transaction(async (tx) => {
      const inventoryItems = await tx.select().from(Inventory).where(inArray(Inventory.id, lines.map((line) => line.id)));
      const inventoryMap = new Map(inventoryItems.map((item) => [item.id, item]));
      let totalCents = 0;
      const items: Array<{
        id: string; name: string; barcode: string | null; unit: string;
        quantity: number; sellingPrice: string; lineTotal: string;
      }> = [];

      for (const line of lines) {
        const inv = inventoryMap.get(line.id);
        if (!inv) throw new PosCheckoutError(`Inventory item ${line.id} was not found.`, 409);
        if (inv.quantity < line.quantity) {
          throw new PosCheckoutError(`Only ${inv.quantity} ${inv.unit} of "${inv.name}" are currently available.`, 409);
        }
        const priceCents = cents(inv.sellingPrice);
        const lineCents = priceCents * line.quantity;
        if (!Number.isSafeInteger(lineCents)) throw new PosCheckoutError('Line amount exceeds supported limits.');
        totalCents += lineCents;
        items.push({
          id: inv.id, name: inv.name, barcode: inv.barcode, unit: inv.unit,
          quantity: line.quantity, sellingPrice: money(priceCents), lineTotal: money(lineCents),
        });
      }

      if (totalCents <= 0 || totalCents > 9999999999) {
        throw new PosCheckoutError('Sale total must be greater than zero and within the supported range.');
      }
      if (receivedCents < totalCents) {
        throw new PosCheckoutError(`Insufficient payment. Amount remaining: ₱${money(totalCents - receivedCents)}.`, 422);
      }

      // A guarded SQL decrement prevents competing cashiers from overselling.
      // The database locks the row during UPDATE and re-evaluates the WHERE.
      for (const line of lines) {
        const updated = await tx.update(Inventory)
          .set({
            quantity: sql`${Inventory.quantity} - ${line.quantity}`,
            updatedAt: new Date(),
          })
          .where(and(eq(Inventory.id, line.id), gte(Inventory.quantity, line.quantity)))
          .returning({ id: Inventory.id });
        if (updated.length !== 1) {
          const name = inventoryMap.get(line.id)?.name || line.id;
          throw new PosCheckoutError(`Insufficient stock for "${name}". Inventory may have changed during checkout.`, 409);
        }
      }

      const [transaction] = await tx.insert(PosTransaction).values({
        id: checkoutId,
        items,
        totalAmount: money(totalCents),
        paymentReceived: money(receivedCents),
        changeGiven: money(receivedCents - totalCents),
        staffId,
      }).returning();

      return { transaction, totalCents, items };
    });

    // Existing secondary payment-audit and trigger behavior is preserved.
    // The POS transaction/receipt and stock deduction are already committed.
    await recordPaymentTransaction({
      entityType: 'POS',
      entityId: result.transaction.id,
      eventType: 'POS_SALE',
      amount: result.totalCents / 100,
      paymentMethod: 'CASH',
      actorStaffId: staffId,
      details: {
        items: result.items,
        paymentReceived: result.transaction.paymentReceived,
        changeGiven: result.transaction.changeGiven,
      },
    });

    inventoryTriggers.onPosSale({
      itemName: `${result.items.length} item(s)`,
      transactionTotal: `₱${money(result.totalCents)}`,
      transactionId: result.transaction.id,
    }).catch(console.error);

    return NextResponse.json(
      { error: false, message: 'Sale completed and saved. Receipt is ready.', data: result.transaction },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error: any) {
    // A second submission with the same ID may race the first submission.
    // If the first committed, return its receipt without another deduction.
    try {
      const existing = await findExisting();
      if (existing) {
        return NextResponse.json(
          { error: false, message: 'Sale already recorded. Here is its saved receipt.', data: existing, alreadyRecorded: true },
          { headers: { 'Cache-Control': 'private, no-store' } },
        );
      }
    } catch (lookupError) {
      if (lookupError instanceof PosCheckoutError) {
        return NextResponse.json({ error: true, errorMessage: lookupError.message }, { status: lookupError.status });
      }
      console.error('[POST /api/payments/pos] Retry lookup error:', lookupError);
    }
    console.error('[POST /api/payments/pos] Error:', error);
    return NextResponse.json(
      { error: true, errorMessage: error?.message || 'Transaction failed.' },
      { status: error instanceof PosCheckoutError ? error.status : 500 },
    );
  }
}
