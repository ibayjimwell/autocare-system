import { pgTable, uuid, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';

/** Bearer links are stored by hash only; document records remain the source of truth. */
export const PaymentDocumentLinks = pgTable('payment_document_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  tokenHash: text('token_hash').notNull(),
  documentType: text('document_type').notNull(), // estimate | final-bill
  documentId: uuid('document_id').notNull(),
  createdBy: text('created_by').notNull(),
  expiresAt: timestamp('expires_at', {withTimezone:true}).notNull(),
  revokedAt: timestamp('revoked_at', {withTimezone:true}),
  createdAt: timestamp('created_at', {withTimezone:true}).defaultNow().notNull(),
}, table => ({
  tokenUnique: uniqueIndex('payment_document_links_token_uidx').on(table.tokenHash),
  documentIdx: index('payment_document_links_document_idx').on(table.documentType, table.documentId),
}));
