CREATE TYPE public.verification_document_type AS ENUM ('identity_document','professional_certificate','business_registration','professional_licence');

CREATE TABLE public.verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
  document_type public.verification_document_type NOT NULL,
  file_path text NOT NULL,
  file_name text,
  notes text CHECK (length(notes) <= 1000),
  admin_note text CHECK (length(admin_note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_documents_provider_idx ON public.verification_documents(provider_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_documents TO authenticated;
GRANT ALL ON public.verification_documents TO service_role;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers view own documents" ON public.verification_documents FOR SELECT TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Providers add own documents" ON public.verification_documents FOR INSERT TO authenticated
  WITH CHECK (private.owns_provider(provider_id) AND admin_note IS NULL AND file_path LIKE auth.uid()::text || '/%');
CREATE POLICY "Providers remove own documents" ON public.verification_documents FOR DELETE TO authenticated USING (private.owns_provider(provider_id));
CREATE POLICY "Admins manage documents" ON public.verification_documents FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::public.app_role));

CREATE TRIGGER update_verification_documents_updated_at BEFORE UPDATE ON public.verification_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage: private, owner folder + admins only. No public read.
CREATE POLICY "Providers upload own verification files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Providers read own verification files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'verification-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR private.has_role(auth.uid(),'admin'::public.app_role)));
CREATE POLICY "Providers delete own verification files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Notify providers when an admin decides
CREATE OR REPLACE FUNCTION private.notify_verification_decision()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status AND NEW.verification_status IN ('verified','rejected') THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (NEW.user_id, 'verification_' || NEW.verification_status::text,
      CASE WHEN NEW.verification_status = 'verified' THEN 'You are verified' ELSE 'Verification not approved' END,
      CASE WHEN NEW.verification_status = 'verified' THEN 'Your profile now shows the verified badge.' ELSE 'Please review the admin notes and submit updated documents.' END,
      '/provider-dashboard?tab=verification');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER notify_verification_decision AFTER UPDATE ON public.provider_profiles
  FOR EACH ROW EXECUTE FUNCTION private.notify_verification_decision();