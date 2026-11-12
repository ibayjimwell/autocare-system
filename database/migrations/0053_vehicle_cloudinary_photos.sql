-- Optional vehicle photos; existing rows remain valid without an image.
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "image_url" varchar(1000);
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "image_public_id" varchar(255);
