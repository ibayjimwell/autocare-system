import { pgTable, uuid, text, timestamp, uniqueIndex, index, check, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { Appointments } from '../appointments/appointments.model';
import { DefaultFindings } from '../service-tracking/default-findings.model';
import { InspectionFindings } from '../service-tracking/inspection-findings.model';

/** One diagnostic checklist per appointment, with an appointment FK. */
export const DiagnosticChecklists = pgTable('diagnostic_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  appointmentId: uuid('appointment_id').notNull().references(() => Appointments.id, { onDelete: 'cascade' }),
  engineType: text('engine_type'), // GAS or DIESEL on the paper form
  transmissionType: text('transmission_type'), // MT or AT
  timeOut: text('time_out'), // optional HH:MM
  dentsMarks: jsonb('dents_marks').$type<Array<{ x: number; y: number }>>().default([]).notNull(),
  remarks: text('remarks'),
  dentsNotes: text('dents_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, t => ({ appointmentUnique: uniqueIndex('diag_checklists_appointment_uidx').on(t.appointmentId) }));

/** Only checked rows are stored; unchecked template rows stay in the catalog. */
export const DiagnosticChecklistEntries = pgTable('diagnostic_checklist_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  checklistId: uuid('checklist_id').notNull().references(() => DiagnosticChecklists.id, { onDelete: 'cascade' }),
  itemKey: text('item_key').notNull(),
  status: text('status').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, t => ({
  checklistItemUnique: uniqueIndex('diag_checklist_item_uidx').on(t.checklistId, t.itemKey),
  validStatus: check('diag_checklist_status_chk', sql`${t.status} IN ('GOOD','WARNING','REPLACE')`),
}));

/** A default finding can be suggested by several checklist items. */
export const DiagnosticFindingLinks = pgTable('diagnostic_finding_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  itemKey: text('item_key').notNull(),
  defaultFindingId: uuid('default_finding_id').notNull().references(() => DefaultFindings.id, { onDelete: 'cascade' }),
}, t => ({
  itemFindingUnique: uniqueIndex('diag_finding_link_uidx').on(t.itemKey, t.defaultFindingId),
  findingIdx: index('diag_finding_link_finding_idx').on(t.defaultFindingId),
}));

/** A link to an actual appointment finding enforces exactly-once Add. */
export const DiagnosticAddedFindings = pgTable('diagnostic_added_findings', {
  id: uuid('id').defaultRandom().primaryKey(),
  checklistId: uuid('checklist_id').notNull().references(() => DiagnosticChecklists.id, { onDelete: 'cascade' }),
  itemKey: text('item_key').notNull(),
  defaultFindingId: uuid('default_finding_id').references(() => DefaultFindings.id, { onDelete: 'set null' }),
  sourceDefaultFindingId: uuid('source_default_finding_id').notNull(),
  findingId: uuid('finding_id').notNull().references(() => InspectionFindings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, t => ({
  onePerSuggestion: uniqueIndex('diag_added_finding_uidx').on(t.checklistId, t.sourceDefaultFindingId),
  findingIdx: index('diag_added_finding_finding_idx').on(t.findingId),
}));
