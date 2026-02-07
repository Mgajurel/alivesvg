-- AliveSVG initial schema
-- Tables: users, purchases, studio_usage, processed_events

CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'lifetime');

-- Users table (linked to Clerk via clerk_id)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT,
  plan plan_tier NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase records from Stripe
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  plan plan_tier NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Studio export usage tracking (count per user = free limit check)
CREATE TABLE studio_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL DEFAULT 'export',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stripe webhook idempotency
CREATE TABLE processed_events (
  event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_studio_usage_user_id ON studio_usage(user_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
