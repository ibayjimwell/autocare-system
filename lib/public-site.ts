/**
 * Public-facing business details for the AutoCare website.
 *
 * Defaults below are transcribed from the business's BIR Form 2303,
 * DTI registration and supplied PayMongo business profile (November 2026).
 * They are PUBLIC contact/registration facts, not payment credentials.
 * Every field can be overridden in Vercel without changing application code.
 * Do not place TINs, document photographs or other private identifiers here.
 */
export type PublicSiteConfig = {
  /** Public-facing product / application brand, not necessarily the DTI trade name. */
  name: string;
  /** Exact DTI/BIR-registered trade name. */
  tradeName: string;
  /** Sole proprietor's registered legal name from BIR Form 2303. */
  legalName: string;
  /** Registered address as printed on BIR Form 2303. */
  address: string;
  /** Physical location / directions from the supplied merchant profile. */
  visitAddress: string;
  email: string;
  phone: string;
  phoneHref: string;
  directionsUrl: string;
  appUrl: string;
  androidApkUrl: string;
  isReviewReady: boolean;
};

const REGISTERED_BUSINESS = {
  brand: 'AutoCare',
  tradeName: 'AUTO-PROTECH AUTO CARE SERVICES',
  legalName: 'Michael Denesse Calara Mallari',
  registeredAddress: 'Crossing 1, Sulipan, Apalit, Pampanga 2016, Philippines',
  visitAddress: 'MacArthur Highway, Sulipan, Apalit, Pampanga 2016, Philippines',
  supportEmail: 'ibayjimwell@gmail.com',
  supportPhone: '09463838304',
} as const;

function httpsUrlOrEmpty(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

export function getPublicSiteConfig(): PublicSiteConfig {
  const configured = (key: string) => (process.env[key] ?? '').trim();
  const getOrDefault = (key: string, fallback: string) => configured(key) || fallback;

  const name = getOrDefault('AUTOCARE_PUBLIC_BUSINESS_NAME', REGISTERED_BUSINESS.brand);
  const tradeName = getOrDefault('AUTOCARE_PUBLIC_REGISTERED_TRADE_NAME', REGISTERED_BUSINESS.tradeName);
  const legalName = getOrDefault('AUTOCARE_PUBLIC_LEGAL_NAME', REGISTERED_BUSINESS.legalName);
  const address = getOrDefault('AUTOCARE_PUBLIC_BUSINESS_ADDRESS', REGISTERED_BUSINESS.registeredAddress);
  const visitAddress = getOrDefault('AUTOCARE_PUBLIC_VISIT_ADDRESS', REGISTERED_BUSINESS.visitAddress);
  const email = getOrDefault('AUTOCARE_PUBLIC_CONTACT_EMAIL', REGISTERED_BUSINESS.supportEmail);
  const phone = getOrDefault('AUTOCARE_PUBLIC_CONTACT_PHONE', REGISTERED_BUSINESS.supportPhone);

  const phoneHref = `tel:${phone.replace(/[^+\d]/g, '')}`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visitAddress)}`;

  return {
    name,
    tradeName,
    legalName,
    address,
    visitAddress,
    email,
    phone,
    phoneHref,
    directionsUrl,
    appUrl: httpsUrlOrEmpty(configured('AUTOCARE_PUBLIC_MOBILE_APP_URL')),
    androidApkUrl: httpsUrlOrEmpty(configured('AUTOCARE_PUBLIC_ANDROID_APK_URL')),
    isReviewReady: Boolean(name && tradeName && legalName && address && email && phone),
  };
}
