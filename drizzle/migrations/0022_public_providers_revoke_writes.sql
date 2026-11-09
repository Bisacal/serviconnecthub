SET ROLE public_provider_reader;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.public_providers FROM anon, authenticated;
RESET ROLE;