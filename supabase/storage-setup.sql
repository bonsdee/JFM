-- Run once in the Supabase SQL editor (Storage lives in Supabase's own `storage` schema,
-- so it is not part of the backend's Flyway migrations).
--
-- product-images  : public  (product photos shown in the dashboard / POS)
-- business-assets : public  (logo + landing page gallery)
-- job-files       : private (customer design files; downloaded via short-lived signed URLs)
--
-- Uploads use signed upload URLs issued by the backend with the service-role key, so no
-- storage RLS policies are needed for writes. Public buckets are readable by URL.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('product-images',  'product-images',  true,  5242880),
  ('business-assets', 'business-assets', true,  10485760),
  ('job-files',       'job-files',       false, 15728640)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;
