-- Storage policies for 'acts' bucket (assuming bucket already exists)
-- Allow authenticated users to upload files to acts bucket
CREATE POLICY "Users can upload to acts bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'acts'
);

-- Allow users to read files from acts bucket
CREATE POLICY "Users can read from acts bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'acts'
);

-- Allow users to update files in acts bucket
CREATE POLICY "Users can update in acts bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'acts'
);

-- Allow users to delete files from acts bucket
CREATE POLICY "Users can delete from acts bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'acts'
);

-- Storage policies for 'regulations' bucket (assuming bucket already exists)
-- Allow authenticated users to upload files to regulations bucket
CREATE POLICY "Users can upload to regulations bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'regulations'
);

-- Allow users to read files from regulations bucket
CREATE POLICY "Users can read from regulations bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'regulations'
);

-- Allow users to update files in regulations bucket
CREATE POLICY "Users can update in regulations bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'regulations'
);

-- Allow users to delete files from regulations bucket
CREATE POLICY "Users can delete from regulations bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'regulations'
);
