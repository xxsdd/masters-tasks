-- Vercel / PostgreSQL schema. Local Cloudflare data was QA-only; this creates an empty production space.
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, username text NOT NULL UNIQUE, password_hash text NOT NULL,
 display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_attempts (key text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS rooms (
 id text PRIMARY KEY, owner text NOT NULL REFERENCES users(id), partner text REFERENCES users(id),
 code text NOT NULL UNIQUE, state text NOT NULL, version integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS members (user_id text PRIMARY KEY REFERENCES users(id), room_id text NOT NULL REFERENCES rooms(id));
CREATE INDEX IF NOT EXISTS members_room ON members(room_id);
CREATE TABLE IF NOT EXISTS uploads (
 id text PRIMARY KEY, room_id text NOT NULL REFERENCES rooms(id), user_id text NOT NULL REFERENCES users(id),
 name text NOT NULL, type text NOT NULL, blob_url text NOT NULL, created timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS operations (
 id text PRIMARY KEY, room_id text NOT NULL REFERENCES rooms(id), user_id text NOT NULL REFERENCES users(id), result text NOT NULL
);
