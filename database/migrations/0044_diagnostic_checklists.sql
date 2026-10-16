-- AutoCare diagnostic checklist: run AFTER existing migration 0043.
-- One appointment has at most one checklist; results and suggestions are stored separately.
CREATE TABLE IF NOT EXISTS diagnostic_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  engine_type text,
  transmission_type text,
  time_out text,
  dents_marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  remarks text,
  dents_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diag_checklists_appointment_uidx ON diagnostic_checklists (appointment_id);

CREATE TABLE IF NOT EXISTS diagnostic_checklist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES diagnostic_checklists(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  status text NOT NULL CHECK (status IN ('GOOD','WARNING','REPLACE')),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diag_checklist_item_uidx ON diagnostic_checklist_entries (checklist_id, item_key);

CREATE TABLE IF NOT EXISTS diagnostic_finding_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL,
  default_finding_id uuid NOT NULL REFERENCES default_findings(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS diag_finding_link_uidx ON diagnostic_finding_links (item_key, default_finding_id);
CREATE INDEX IF NOT EXISTS diag_finding_link_finding_idx ON diagnostic_finding_links (default_finding_id);

CREATE TABLE IF NOT EXISTS diagnostic_added_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES diagnostic_checklists(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  default_finding_id uuid REFERENCES default_findings(id) ON DELETE SET NULL,
  source_default_finding_id uuid NOT NULL,
  finding_id uuid NOT NULL REFERENCES inspection_findings(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS diag_added_finding_uidx ON diagnostic_added_findings (checklist_id, source_default_finding_id);
CREATE INDEX IF NOT EXISTS diag_added_finding_finding_idx ON diagnostic_added_findings (finding_id);
