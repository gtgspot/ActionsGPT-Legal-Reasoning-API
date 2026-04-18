-- Auth permissions table for registration/login gates.
-- Credentials are stored in Supabase's managed auth.users table.

CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  can_register BOOLEAN NOT NULL DEFAULT true,
  can_login BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.update_user_permissions_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_permissions_timestamp();
