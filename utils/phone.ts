// utils/phone.ts

/**
 * Default country for AutoCare customer phone numbers.
 */
export const DEFAULT_PHONE_COUNTRY_CODE = '+63';

/**
 * Normalize a Philippine mobile number into:
 *
 * +639XXXXXXXXX
 *
 * Accepted examples:
 * 09157803417
 * 9157803417
 * 639157803417
 * +639157803417
 * +63 915 780 3417
 * 09 157 803 417
 */
export function normalizePhilippinePhone(
  value: unknown
): string {
  if (typeof value !== 'string') {
    return '';
  }

  let phone = value.trim();

  if (!phone) {
    return '';
  }

  // Keep digits only.
  let digits = phone.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  /*
   * Philippine local format:
   * 09XXXXXXXXX
   *
   * Convert:
   * 09XXXXXXXXX
   *      ↓
   * 9XXXXXXXXX
   */
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  /*
   * International format without +:
   * 639XXXXXXXXX
   *
   * Remove country code before rebuilding the canonical value.
   */
  if (digits.startsWith('63')) {
    digits = digits.slice(2);
  }

  /*
   * At this point we expect:
   *
   * 9XXXXXXXXX
   */
  if (digits.startsWith('9')) {
    return `${DEFAULT_PHONE_COUNTRY_CODE}${digits}`;
  }

  return '';
}

/**
 * Return true only when the normalized number is
 * a valid Philippine mobile number.
 *
 * Canonical format:
 * +639XXXXXXXXX
 */
export function isValidPhilippinePhone(
  value: unknown
): boolean {
  const normalized =
    normalizePhilippinePhone(value);

  return /^\+639\d{9}$/.test(
    normalized
  );
}

/**
 * Format a phone number for display.
 *
 * Canonical:
 * +639157803417
 *
 * Display:
 * +63 915 780 3417
 */
export function formatPhilippinePhoneDisplay(
  value: unknown
): string {
  const normalized =
    normalizePhilippinePhone(value);

  if (!normalized) {
    return '';
  }

  const localNumber =
    normalized.slice(3);

  const first =
    localNumber.slice(0, 3);

  const second =
    localNumber.slice(3, 6);

  const third =
    localNumber.slice(6, 10);

  return `+63 ${first} ${second} ${third}`;
}

/**
 * Convert a canonical phone number to the
 * local Philippine format.
 *
 * +639157803417
 *       ↓
 * 09157803417
 */
export function formatPhilippinePhoneLocal(
  value: unknown
): string {
  const normalized =
    normalizePhilippinePhone(value);

  if (!normalized) {
    return '';
  }

  return `0${normalized.slice(3)}`;
}