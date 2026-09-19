/**
 * Philippine peso denominations used to generate practical cashier payment
 * choices for a final bill.
 *
 * The exact bill amount is always returned as the first choice. The remaining
 * choices are the smallest rounded-up amounts that can be formed using the
 * configured PHP denominations.
 */
export const PH_PESO_DENOMINATIONS = [
  1,
  5,
  10,
  20,
  50,
  100,
  200,
  500,
  1000,
] as const;

export interface CashierPaymentChoice {
  amount: number;
  change: number;
  isExact: boolean;

  /**
   * A compact denomination breakdown. This is informational only; the
   * cashier may still enter any amount manually through the input.
   */
  breakdown: string;
}

function toSafeAmount(value: unknown): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function roundUpToDenomination(
  total: number,
  denomination: number,
): number {
  if (denomination <= 0) {
    return total;
  }

  return (
    Math.ceil(
      (total - Number.EPSILON) / denomination,
    ) * denomination
  );
}

/**
 * Builds a denomination breakdown using the largest available denomination
 * first. The 1-peso denomination guarantees that every whole-peso amount can
 * be represented.
 */
export function getPesoDenominationBreakdown(
  amount: number,
  denominations: readonly number[] =
    PH_PESO_DENOMINATIONS,
): string {
  const safeAmount = Math.max(
    0,
    Math.floor(toSafeAmount(amount)),
  );

  if (safeAmount === 0) {
    return '₱0';
  }

  const sorted = [...denominations]
    .filter(
      (denomination) =>
        Number.isFinite(denomination) &&
        denomination > 0,
    )
    .sort((a, b) => b - a);

  let remaining = safeAmount;
  const parts: string[] = [];

  for (const denomination of sorted) {
    const count = Math.floor(
      remaining / denomination,
    );

    if (count > 0) {
      parts.push(
        count === 1
          ? `₱${denomination.toLocaleString(
              'en-PH',
            )}`
          : `${count}×₱${denomination.toLocaleString(
              'en-PH',
            )}`,
      );

      remaining -= count * denomination;
    }

    if (remaining === 0) {
      break;
    }
  }

  return parts.length > 0
    ? parts.join(' + ')
    : '₱0';
}

/**
 * Returns a practical list of payment amounts for the cashier.
 *
 * Example:
 *   getCashierPaymentChoices(10376)
 *   => 10,376, 10,380, 10,400, 10,500, 11,000
 *
 * Why these values?
 * - The exact amount is always included.
 * - Each Philippine peso denomination produces the next payable amount at
 *   or above the bill total.
 * - Duplicate values are removed.
 * - The result is sorted from the smallest payment to the largest payment.
 *
 * There are infinitely many amounts a customer could pay, so this function
 * intentionally returns the useful denomination-based cashier choices rather
 * than every amount above the bill.
 */
export function getCashierPaymentChoices(
  billTotal: unknown,
  denominations: readonly number[] =
    PH_PESO_DENOMINATIONS,
): CashierPaymentChoice[] {
  const total = toSafeAmount(billTotal);

  if (total <= 0) {
    return [];
  }

  const values = new Set<number>();

  // Always include the exact bill amount.
  values.add(total);

  for (const denomination of denominations) {
    if (
      !Number.isFinite(denomination) ||
      denomination <= 0
    ) {
      continue;
    }

    values.add(
      roundUpToDenomination(
        total,
        denomination,
      ),
    );
  }

  return [...values]
    .filter(
      (amount) => amount >= total,
    )
    .sort((a, b) => a - b)
    .map((amount) => ({
      amount:
        Math.round(amount * 100) / 100,

      change: Math.max(
        0,
        Math.round(
          (amount - total) * 100,
        ) / 100,
      ),

      isExact:
        Math.abs(
          amount - total,
        ) < 0.005,

      breakdown:
        getPesoDenominationBreakdown(
          amount,
          denominations,
        ),
    }));
}

export function formatCashierAmount(
  amount: unknown,
): string {
  const safeAmount =
    toSafeAmount(amount);

  return safeAmount.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:
        Number.isInteger(
          safeAmount,
        )
          ? 0
          : 2,
      maximumFractionDigits: 2,
    },
  );
}

export function parseCashierPaymentInput(
  value: string,
): number {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : 0;
}