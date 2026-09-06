import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  boolean,
} from 'drizzle-orm/pg-core';

export const Customers = pgTable(
  'customers',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    fullname: varchar('full_name', {
      length: 255,
    }).notNull(),

    email: varchar('email', {
      length: 255,
    })
      .unique()
      .notNull(),

    phone: varchar('phone', {
      length: 20,
    })
      .unique()
      .notNull(),

    password: varchar('password', {
      length: 255,
    }).notNull(),

    deactivated: boolean('deactivated')
      .default(false)
      .notNull(),

    tempPassword: boolean('temp_password')
      .default(true)
      .notNull(),

    isPhoneVerified: boolean('is_phone_verified')
      .default(false)
      .notNull(),

    /*
     * Customer mobile-app presence.
     *
     * isOnline:
     * true  = mobile app is currently active
     * false = mobile app is not active
     *
     * lastSeenAt:
     * last successful presence heartbeat from the mobile app.
     */
    isOnline: boolean('is_online')
      .default(false)
      .notNull(),

    lastSeenAt: timestamp('last_seen_at'),

    createdAt: timestamp('created_at')
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at')
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index('customers_email_idx').on(
      table.email
    ),

    phoneIdx: index('customers_phone_idx').on(
      table.phone
    ),

    isOnlineIdx: index('customers_is_online_idx').on(
      table.isOnline
    ),

    lastSeenIdx: index('customers_last_seen_idx').on(
      table.lastSeenAt
    ),
  })
);