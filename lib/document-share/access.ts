import {createHash, randomBytes} from 'node:crypto';
import {and, eq, gt, isNull} from 'drizzle-orm';
import {Database} from '@/lib/drizzle';
import {PaymentDocumentLinks} from '@/database/models/payments/payment-document-links.model';
import {paypalSiteOrigin} from '@/lib/payments/paypal-sandbox';

export type DocumentKind = 'estimate' | 'final-bill';
export const validKind = (kind:unknown):kind is DocumentKind => kind==='estimate' || kind==='final-bill';
export const validUuid = (id:unknown):id is string => typeof id==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const validToken = (token:unknown):token is string => typeof token==='string' && /^[a-f0-9]{64}$/.test(token);
const hash = (token:string) => createHash('sha256').update(token).digest('hex');
export function shareUrl(token:string) {return `${paypalSiteOrigin()}/share/${token}`;}
export async function newShareLink(kind:DocumentKind, documentId:string, staffId:string) {
  const token=randomBytes(32).toString('hex');
  const expiresAt=new Date(Date.now()+7*24*60*60*1000);
  const [row]=await Database.insert(PaymentDocumentLinks).values({
    tokenHash:hash(token), documentType:kind, documentId, createdBy:staffId, expiresAt,
  }).returning({id:PaymentDocumentLinks.id});
  return { id:row.id,url:shareUrl(token),expiresAt:expiresAt.toISOString() };
}
export async function resolveShare(token:string) {
  if(!validToken(token)) return null;
  const [row]=await Database.select().from(PaymentDocumentLinks).where(and(
    eq(PaymentDocumentLinks.tokenHash,hash(token)),gt(PaymentDocumentLinks.expiresAt,new Date()),isNull(PaymentDocumentLinks.revokedAt),
  )).limit(1);
  return row && validKind(row.documentType) ? row as typeof row & {documentType:DocumentKind} : null;
}
