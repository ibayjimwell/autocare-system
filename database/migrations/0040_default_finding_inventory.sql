-- Allow reusable/default findings to reference a live inventory item.
ALTER TABLE default_finding_parts
  ADD COLUMN IF NOT EXISTS inventory_item_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'default_finding_parts_inventory_item_id_inventory_id_fk'
  ) THEN
    ALTER TABLE default_finding_parts
      ADD CONSTRAINT default_finding_parts_inventory_item_id_inventory_id_fk
      FOREIGN KEY (inventory_item_id) REFERENCES inventory(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS default_finding_parts_inventory_item_idx
  ON default_finding_parts(inventory_item_id);
