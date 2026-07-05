// database/models/payments/receipts.model.ts
import { pgTable, uuid, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { FinalBill } from './final-bill.model';
import { EstimatedCosts } from './estimated-costs.model';
import { Appointments } from '../appointments/appointments.model';

export const Receipts = pgTable(
  'receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    referenceNumber: varchar('reference_number', { length: 20 }).notNull().unique(),
    finalBillId: uuid('final_bill_id')
      .references(() => FinalBill.id, { onDelete: 'restrict' })
      .notNull(),
    estimateId: uuid('estimate_id')
      .references(() => EstimatedCosts.id, { onDelete: 'set null' }),
    appointmentId: uuid('appointment_id')
      .references(() => Appointments.id, { onDelete: 'restrict' })
      .notNull(),
    data: jsonb('data').notNull(),          // all receipt details
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    refIdx: index('receipts_ref_idx').on(table.referenceNumber),
    finalBillIdx: index('receipts_final_bill_idx').on(table.finalBillId),
  })
);