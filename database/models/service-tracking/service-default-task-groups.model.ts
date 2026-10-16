import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { Services } from '../services/services.model';
import { DefaultTaskGroups } from './default-task-groups.model';

// A template group can be attached to any number of catalog services, and
// each catalog service can have multiple task groups.
export const ServiceDefaultTaskGroups = pgTable(
  'service_default_task_groups',
  {
    serviceId: uuid('service_id').notNull().references(() => Services.id, { onDelete: 'cascade' }),
    groupId: uuid('group_id').notNull().references(() => DefaultTaskGroups.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.serviceId, table.groupId] }),
    groupIdx: index('service_default_task_groups_group_idx').on(table.groupId),
  }),
);
