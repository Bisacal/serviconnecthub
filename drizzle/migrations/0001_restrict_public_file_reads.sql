CREATE OR REPLACE FUNCTION private.folder_owner_is_published_provider(_folder text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.provider_profiles
    WHERE user_id::text = _folder AND is_published = true
  )
$$;
REVOKE ALL ON FUNCTION private.folder_owner_is_published_provider(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.folder_owner_is_published_provider(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can read avatars and portfolio files" ON storage.objects;

CREATE POLICY "Users read own avatar and portfolio files" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','portfolio') AND (storage.foldername(name))[1] = (select auth.uid())::text);

CREATE POLICY "Public reads files of published providers" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id IN ('avatars','portfolio') AND private.folder_owner_is_published_provider((storage.foldername(name))[1]));