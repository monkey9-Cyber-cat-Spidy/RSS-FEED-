-- Fix RLS for subscriptions to allow authenticated users to insert/update their own row
-- Run this in Supabase SQL Editor

-- Drop the overly broad FOR ALL policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'subscriptions' 
      AND policyname = 'Users can manage own subscriptions'
  ) THEN
    EXECUTE 'DROP POLICY "Users can manage own subscriptions" ON public.subscriptions';
  END IF;
END $$;

-- Explicit, safe policies per command
CREATE POLICY "Users can select own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON public.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscription" ON public.subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Optional: verify
-- SELECT pol.polname, pol.cmd, pol.qual, pol.with_check
-- FROM pg_policies pol
-- WHERE pol.schemaname = 'public' AND pol.tablename = 'subscriptions';
