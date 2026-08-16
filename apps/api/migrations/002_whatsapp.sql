CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT,
  display_phone TEXT,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone_number_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_org ON whatsapp_connections(organization_id);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  external_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  waiting_room BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_external ON conversations(organization_id, channel, external_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_inbox ON conversations(organization_id, channel, status, last_message_at DESC);
