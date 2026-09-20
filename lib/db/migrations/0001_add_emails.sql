DO $$
BEGIN
  CREATE TYPE email_direction AS ENUM ('inbound', 'outbound');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  resend_email_id TEXT,
  direction email_direction NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  thread_id TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS emails_resend_email_id_idx
  ON emails (resend_email_id);
CREATE INDEX IF NOT EXISTS emails_thread_id_idx
  ON emails (thread_id);
CREATE INDEX IF NOT EXISTS emails_created_at_idx
  ON emails (created_at);