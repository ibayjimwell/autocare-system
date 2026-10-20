-- Staff-only durable notification inbox; separate from customer notifications.
-- No changes to appointment/payment/customer notification records.
BEGIN;
CREATE TABLE IF NOT EXISTS public.staff_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staffs(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  url text,
  module text NOT NULL DEFAULT 'app',
  event text NOT NULL DEFAULT 'push',
  read_at timestamp without time zone,
  dismissed_at timestamp without time zone,
  created_at timestamp without time zone NOT NULL DEFAULT now()
);
-- Staff inbox is only accessible via NextAuth-protected server routes.
-- Direct Supabase client roles must not read staff messages.
ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.staff_notifications FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS staff_notifications_staff_created_idx
  ON public.staff_notifications(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS staff_notifications_unread_idx
  ON public.staff_notifications(staff_id, created_at DESC)
  WHERE read_at IS NULL AND dismissed_at IS NULL;
-- On browsers shared by staff accounts, an endpoint must belong to only one account.
-- Preserve the newest subscription per endpoint before enforcing uniqueness.
DELETE FROM public.push_subscriptions p USING public.push_subscriptions newer
WHERE p.endpoint = newer.endpoint AND (
  p.created_at < newer.created_at OR
  (p.created_at = newer.created_at AND p.id::text < newer.id::text)
);
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_uidx
  ON public.push_subscriptions(endpoint);
COMMIT;
