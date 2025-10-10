-- Document Storage Tables for Regulatory Data
-- Stores metadata for .docx files and other regulatory documents

-- Documents Table
CREATE TABLE IF NOT EXISTS public.regulatory_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Document identification
  document_name TEXT NOT NULL,
  document_type VARCHAR(50) NOT NULL, -- 'regulation', 'statute', 'case_law', 'policy', 'guideline'
  file_extension VARCHAR(10) NOT NULL DEFAULT '.docx',
  
  -- Storage information
  storage_bucket VARCHAR(100) NOT NULL DEFAULT 'regulatory-documents',
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  
  -- Document metadata
  title TEXT NOT NULL,
  description TEXT,
  jurisdiction VARCHAR(100), -- e.g., 'Federal', 'California', 'EU'
  effective_date DATE,
  expiration_date DATE,
  version VARCHAR(50),
  
  -- Classification
  category VARCHAR(100), -- e.g., 'Immigration', 'Criminal', 'Civil'
  tags TEXT[], -- Array of tags for searching
  
  -- Data integrity
  sha256_hash VARCHAR(64) NOT NULL,
  md5_hash VARCHAR(32) NOT NULL,
  
  -- Linking to identity records
  related_identity_ids UUID[], -- Array of identity record IDs this document relates to
  
  -- Access control
  access_level VARCHAR(20) NOT NULL DEFAULT 'internal', -- 'public', 'internal', 'restricted', 'confidential'
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  CONSTRAINT valid_document_type CHECK (document_type IN ('regulation', 'statute', 'case_law', 'policy', 'guideline', 'template', 'form', 'other')),
  CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'internal', 'restricted', 'confidential')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'superseded', 'draft'))
);

-- Document Versions Table (for version control)
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.regulatory_documents(id) ON DELETE CASCADE,
  
  -- Version information
  version_number VARCHAR(50) NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  
  -- Change tracking
  change_summary TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status
  is_current BOOLEAN NOT NULL DEFAULT false,
  
  UNIQUE(document_id, version_number)
);

-- Document Access Log (audit trail for document access)
CREATE TABLE IF NOT EXISTS public.document_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.regulatory_documents(id) ON DELETE CASCADE,
  
  -- Access details
  accessed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_type VARCHAR(20) NOT NULL, -- 'view', 'download', 'edit', 'delete'
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download', 'edit', 'delete', 'share'))
);

-- Document Annotations (for notes and highlights)
CREATE TABLE IF NOT EXISTS public.document_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.regulatory_documents(id) ON DELETE CASCADE,
  
  -- Annotation details
  annotation_type VARCHAR(20) NOT NULL, -- 'note', 'highlight', 'bookmark'
  content TEXT NOT NULL,
  page_number INTEGER,
  position_data JSONB, -- For storing exact position in document
  
  -- User tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_annotation_type CHECK (annotation_type IN ('note', 'highlight', 'bookmark', 'comment'))
);

-- Create indexes for performance
CREATE INDEX idx_documents_document_type ON public.regulatory_documents(document_type);
CREATE INDEX idx_documents_category ON public.regulatory_documents(category);
CREATE INDEX idx_documents_status ON public.regulatory_documents(status);
CREATE INDEX idx_documents_created_at ON public.regulatory_documents(created_at);
CREATE INDEX idx_documents_title ON public.regulatory_documents USING gin(to_tsvector('english', title));
CREATE INDEX idx_documents_description ON public.regulatory_documents USING gin(to_tsvector('english', description));
CREATE INDEX idx_documents_tags ON public.regulatory_documents USING gin(tags);
CREATE INDEX idx_documents_jurisdiction ON public.regulatory_documents(jurisdiction);

CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);
CREATE INDEX idx_document_versions_is_current ON public.document_versions(is_current);

CREATE INDEX idx_document_access_document_id ON public.document_access_log(document_id);
CREATE INDEX idx_document_access_accessed_at ON public.document_access_log(accessed_at);

CREATE INDEX idx_document_annotations_document_id ON public.document_annotations(document_id);

-- Enable Row Level Security
ALTER TABLE public.regulatory_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regulatory_documents
CREATE POLICY "Users can view documents based on access level"
  ON public.regulatory_documents FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      access_level = 'public' OR
      access_level = 'internal'
    )
  );

CREATE POLICY "Users can insert documents"
  ON public.regulatory_documents FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own documents"
  ON public.regulatory_documents FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = modified_by);

CREATE POLICY "Users can delete their own documents"
  ON public.regulatory_documents FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for document_versions
CREATE POLICY "Users can view document versions"
  ON public.document_versions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create document versions"
  ON public.document_versions FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

-- RLS Policies for document_access_log
CREATE POLICY "Users can view their own access logs"
  ON public.document_access_log FOR SELECT
  USING (auth.uid() = accessed_by);

CREATE POLICY "Users can log their access"
  ON public.document_access_log FOR INSERT
  WITH CHECK (auth.uid() = accessed_by);

-- RLS Policies for document_annotations
CREATE POLICY "Users can view all annotations"
  ON public.document_annotations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create annotations"
  ON public.document_annotations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own annotations"
  ON public.document_annotations FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own annotations"
  ON public.document_annotations FOR DELETE
  USING (auth.uid() = created_by);

-- Add trigger to regulatory_documents
CREATE TRIGGER update_regulatory_documents_timestamp
  BEFORE UPDATE ON public.regulatory_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.regulatory_documents IS 'Storage metadata for regulatory documents (.docx files and other formats)';
COMMENT ON TABLE public.document_versions IS 'Version history for regulatory documents';
COMMENT ON TABLE public.document_access_log IS 'Audit trail for document access and downloads';
COMMENT ON TABLE public.document_annotations IS 'User annotations, notes, and highlights on documents';

-- Create Supabase Storage bucket (this is a SQL comment, actual bucket creation happens via Supabase dashboard or API)
-- Bucket name: 'regulatory-documents'
-- Public: false (requires authentication)
-- File size limit: 50MB
-- Allowed MIME types: application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/pdf, text/plain
