-- ============================================================
-- Seed Profiles & Create Auth Trigger
-- ============================================================
-- This script must be run ONCE via the Supabase SQL Editor or psql.
-- It performs three tasks:
--   1. Backfills the `profiles` table from existing `auth.users`.
--   2. Creates a trigger function to auto-insert a profile on signup.
--   3. Attaches the trigger to the `auth.users` table.
-- ============================================================

-- 1. Backfill existing auth users into the profiles table
INSERT INTO public.profiles (id, email, created_at)
SELECT id, email, created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NEW.created_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger (drop first to make idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
