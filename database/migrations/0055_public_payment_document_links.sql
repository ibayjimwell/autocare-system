-- Staff-issued, time-limited bearer document links. The raw tokens are never stored.
CREATE TABLE IF NOT EXISTS payment_document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  document_type text NOT NULL CHECK (document_type IN ('estimate', 'final-bill')),
  document_id uuid NOT NULL,
  created_by text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_document_links_document_idx ON payment_document_links(document_type, document_id);
