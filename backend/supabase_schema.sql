-- ============================================================
-- XRayVision AI — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'Medical Student',
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scans (core diagnostic records)
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('chest', 'fracture', 'wound')),
  session_label TEXT,
  notes TEXT,
  image_url TEXT NOT NULL DEFAULT '',
  urgency TEXT CHECK (urgency IN ('critical', 'high', 'medium', 'low', 'clear')),
  findings JSONB NOT NULL DEFAULT '[]',
  agent_synthesis TEXT,
  agent_actions JSONB DEFAULT '[]',
  model_results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));

-- Scans
CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own scans"
  ON scans FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own scans"
  ON scans FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- Chat sessions
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own chat sessions"
  ON chat_sessions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- Chat messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (session_id IN (SELECT id FROM chat_sessions WHERE user_id = (SELECT auth.uid())));

-- New Supabase projects may not grant Data API access automatically.
-- The browser calls FastAPI; privileged keys remain on the server.
REVOKE ALL ON profiles, scans, chat_sessions, chat_messages FROM anon;
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON scans TO authenticated;
GRANT SELECT, INSERT ON chat_sessions, chat_messages TO authenticated;
GRANT ALL ON profiles, scans, chat_sessions, chat_messages TO service_role;

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ============================================================
-- Profile creation
-- ============================================================

-- FastAPI /auth/register already inserts profiles after Supabase signup.
-- Do not add a second automatic insert trigger: that produces duplicate-key
-- errors in the existing registration route. Admin-created demo users need
-- an explicit matching profile as part of their provisioning step.

-- Supabase may provision this event-trigger function in new projects.
-- It is infrastructure, not a callable application RPC.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;
