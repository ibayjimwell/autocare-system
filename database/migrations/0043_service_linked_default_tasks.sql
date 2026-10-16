-- Apply ONCE after 0042_service_catalog_labor_and_repair_categories.sql.
-- Task provenance preserves copied appointment tasks if templates are deleted.
CREATE TABLE IF NOT EXISTS service_default_task_groups (
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES default_task_groups(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT service_default_task_groups_pk PRIMARY KEY (service_id, group_id)
);
CREATE INDEX IF NOT EXISTS service_default_task_groups_group_idx
  ON service_default_task_groups (group_id);
ALTER TABLE inspection_tasks ADD COLUMN IF NOT EXISTS default_task_id uuid;
ALTER TABLE work_tasks ADD COLUMN IF NOT EXISTS default_task_id uuid;
DO $$ BEGIN
  ALTER TABLE inspection_tasks ADD CONSTRAINT inspection_tasks_default_task_id_fkey
    FOREIGN KEY (default_task_id) REFERENCES default_tasks(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE work_tasks ADD CONSTRAINT work_tasks_default_task_id_fkey
    FOREIGN KEY (default_task_id) REFERENCES default_tasks(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS inspection_tasks_appointment_template_uidx
  ON inspection_tasks (appointment_id, default_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS work_tasks_appointment_template_uidx
  ON work_tasks (appointment_id, default_task_id);
