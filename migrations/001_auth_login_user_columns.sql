-- Login flow schema migration.
-- SQLite users table columns required by /api/auth/login:
--   role, user_id, account_status, display_name_changed
--
-- The Flask startup migration in app.py applies these idempotently because
-- SQLite does not consistently support IF NOT EXISTS for ADD COLUMN across
-- deployed versions. Keep this file as the schema record for manual reviews.

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD COLUMN user_id TEXT NULL;
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN display_name_changed INTEGER NOT NULL DEFAULT 0;

UPDATE users
SET user_id = 'USR-' || printf('%05d', id)
WHERE user_id IS NULL;
