ALTER TABLE staffs
ADD COLUMN IF NOT EXISTS last_active_at timestamp;

-- Existing persisted online flags can be stale after browser/app crashes.
UPDATE staffs
SET is_online = false, current_module = NULL, last_active_at = NULL
WHERE is_online = true;
