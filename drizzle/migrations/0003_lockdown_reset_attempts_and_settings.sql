-- security_reset_attempts: server-only audit log written by the SECURITY DEFINER reset function.
-- Enable RLS with no policies (default deny) and drop Data API privileges entirely.
ALTER TABLE public.security_reset_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_reset_attempts FROM anon, authenticated, PUBLIC;

-- app_settings: signed-in users only ever need the public payment wallet number.
-- Replace the blanket USING (true) policy with a row-scoped one and close anon access.
REVOKE ALL ON public.app_settings FROM anon, PUBLIC;
GRANT SELECT ON public.app_settings TO authenticated;
DROP POLICY settings_read ON public.app_settings;
CREATE POLICY settings_read ON public.app_settings
  FOR SELECT TO authenticated
  USING (key = 'wallet_number');