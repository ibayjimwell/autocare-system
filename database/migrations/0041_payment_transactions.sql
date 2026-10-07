CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type varchar(32) NOT NULL,
  entity_id uuid NULL,
  appointment_id uuid NULL REFERENCES appointments(id) ON DELETE SET NULL,
  event_type varchar(64) NOT NULL,
  from_status varchar(32) NULL,
  to_status varchar(32) NULL,
  amount numeric(12,2) NULL,
  payment_method varchar(40) NULL,
  reference_number varchar(80) NULL,
  actor_staff_id uuid NULL REFERENCES staffs(id) ON DELETE SET NULL,
  details jsonb NULL,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_transactions_entity_idx ON payment_transactions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS payment_transactions_appointment_idx ON payment_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS payment_transactions_created_idx ON payment_transactions(created_at DESC);
