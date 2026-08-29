import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { DefaultTaskGroups } from './default-task-groups.model';

export const DefaultTasks = pgTable(
  'default_tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .references(() => DefaultTaskGroups.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title').notNull(),
    durationMinutes: integer('duration_minutes'), // optional estimated duration
    taskType: text('task_type').default('INSPECTION').notNull(), // 'INSPECTION' or 'WORK'
    order: integer('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    groupIdx: index('default_tasks_group_idx').on(table.groupId),
    typeIdx: index('default_tasks_type_idx').on(table.taskType),
  })
);