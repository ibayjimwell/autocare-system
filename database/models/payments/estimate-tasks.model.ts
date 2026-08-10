import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { EstimatedCosts } from './estimated-costs.model';
import { InspectionTasks } from '../service-tracking/inspection-tasks.model';

export const EstimateTasks = pgTable(
  'estimate_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    estimateId: uuid('estimate_id')
      .references(() => EstimatedCosts.id, { onDelete: 'cascade' })
      .notNull(),
    taskId: uuid('task_id')
      .references(() => InspectionTasks.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    durationMinutes: integer('duration_minutes'),
    status: text('status').default('DONE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    estimateIdx: index('estimate_tasks_estimate_idx').on(table.estimateId),
  })
);