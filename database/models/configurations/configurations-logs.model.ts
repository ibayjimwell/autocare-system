import { pgTable, uuid, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { Configurations } from './configurations.model';
import { Staffs } from '../staffs/staffs.model';

export const ConfigurationsLogs = pgTable('configurations_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  configurationId: uuid('configuration_id')
    .references(() => Configurations.id)
    .notNull(),
  changedBy: uuid('changed_by')
    .references(() => Staffs.id)
    .notNull(),
  previousConfig: jsonb('previous_config').notNull(),
  updatedConfig: jsonb('updated_config').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});