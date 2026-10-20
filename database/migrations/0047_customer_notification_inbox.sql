-- Run once in Supabase SQL Editor BEFORE deploying the updated Web backend.
-- Additive migration. Does not modify or delete appointments, SMS records,
-- existing notifications, push subscriptions, or local mobile SQLite data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  module text NOT NULL DEFAULT 'app',
  event text NOT NULL DEFAULT 'push',
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  read_at timestamp without time zone,
  deleted_at timestamp without time zone
);
CREATE INDEX IF NOT EXISTS customer_notifications_customer_created_idx
  ON public.customer_notifications(customer_id, created_at DESC, id DESC);
COMMIT;
