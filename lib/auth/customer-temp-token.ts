import { SignJWT, jwtVerify } from 'jose';

/**
 * Token used ONLY between the first successful credential check and
 * replacement of an administrator-issued temporary customer password.
 *
 * IMPORTANT: This uses a different signing key from the regular login JWT.
 * Even if a different API route does not inspect JWT `purpose`, it cannot
 * mistake this credential for a normal customer session token.
 */
const tempTokenSecret = new TextEncoder().encode(
  `${process.env.JWT_SECRET || 'fallback-secret-change-me'}:autocare:customer-temp-password:v1`,
);

const PURPOSE = 'customer-temporary-password-change';
const ISSUER = 'autocare-customer-auth';

export async function createCustomerTempPasswordToken(customerId: string) {
  return new SignJWT({ id: customerId, purpose: PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(PURPOSE)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(tempTokenSecret);
}

export async function verifyCustomerTempPasswordToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, tempTokenSecret, {
      issuer: ISSUER,
      audience: PURPOSE,
    });

    if (
      payload.purpose !== PURPOSE ||
      typeof payload.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id)
    ) {
      return null;
    }

    return { customerId: payload.id };
  } catch {
    return null;
  }
}
