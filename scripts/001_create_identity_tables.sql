-- Legal Identity Management System Database Schema
-- Version 1.0 - Implements Minimal Legal Operational Playbook

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Identity Records Table (Core dual-field structure)
CREATE TABLE IF NOT EXISTS public.identity_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  
  -- Dual-field identity (REQUIRED)
  original_script TEXT NOT NULL,
  canonical_ascii TEXT NOT NULL,
  
  -- Supporting metadata
  script_code VARCHAR(4) NOT NULL, -- ISO 15924
  language_code VARCHAR(10) NOT NULL, -- ISO 639
  encoding_used VARCHAR(20) NOT NULL DEFAULT 'UTF-8',
  
  -- Technical specifications
  icu_version VARCHAR(20) NOT NULL DEFAULT '73.1',
  unicode_version VARCHAR(20) NOT NULL DEFAULT '15.0',
  normalization_form VARCHAR(10) NOT NULL DEFAULT 'NFC',
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_modified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  modified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Data integrity
  original_hash VARCHAR(64) NOT NULL, -- SHA-256 of original_script
  byte_sequence BYTEA NOT NULL, -- Raw bytes of original_script
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived', 'merged'))
);

-- Observed Variants Table (Alias Register)
CREATE TABLE IF NOT EXISTS public.identity_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_id UUID NOT NULL REFERENCES public.identity_records(canonical_id) ON DELETE CASCADE,
  
  -- Variant details
  variant_type VARCHAR(50) NOT NULL, -- 'MRZ', 'native_alternate', 'ascii_alternate', 'transliteration'
  representation TEXT NOT NULL,
  script_code VARCHAR(4),
  language_code VARCHAR(10),
  
  -- Source tracking
  source_document TEXT NOT NULL,
  source_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence_score DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_confidence CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
  CONSTRAINT valid_variant_type CHECK (variant_type IN ('MRZ', 'native_alternate', 'ascii_alternate', 'transliteration', 'phonetic', 'other'))
);

-- Round-Trip Test Results Table
CREATE TABLE IF NOT EXISTS public.roundtrip_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES public.identity_records(id) ON DELETE CASCADE,
  
  -- Test details
  test_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_type VARCHAR(50) NOT NULL, -- 'storage', 'export', 'presentation'
  
  -- Results
  passed BOOLEAN NOT NULL,
  original_input TEXT NOT NULL,
  final_output TEXT NOT NULL,
  
  -- Loss metrics
  character_loss_rate DECIMAL(5,2) DEFAULT 0.00,
  diacritic_loss_rate DECIMAL(5,2) DEFAULT 0.00,
  script_conversion_errors INTEGER DEFAULT 0,
  byte_differences INTEGER DEFAULT 0,
  
  -- Technical details
  discrepancy_details JSONB,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_test_type CHECK (test_type IN ('storage', 'export', 'presentation', 'full_cycle'))
);

-- Search Operations Log Table
CREATE TABLE IF NOT EXISTS public.search_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Search details
  search_query TEXT NOT NULL,
  search_mode VARCHAR(20) NOT NULL, -- 'strict', 'standard', 'fuzzy'
  search_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Configuration
  accent_sensitive BOOLEAN NOT NULL DEFAULT false,
  case_sensitive BOOLEAN NOT NULL DEFAULT false,
  diacritic_sensitive BOOLEAN NOT NULL DEFAULT true,
  max_edit_distance INTEGER DEFAULT 2,
  
  -- Results
  results_count INTEGER NOT NULL DEFAULT 0,
  match_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.95,
  
  -- Performance metrics
  execution_time_ms INTEGER,
  false_positives INTEGER DEFAULT 0,
  false_negatives INTEGER DEFAULT 0,
  manual_review_required BOOLEAN DEFAULT false,
  
  -- User tracking
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_search_mode CHECK (search_mode IN ('strict', 'standard', 'fuzzy'))
);

-- Court Exhibits Table
CREATE TABLE IF NOT EXISTS public.court_exhibits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identity_id UUID NOT NULL REFERENCES public.identity_records(id) ON DELETE CASCADE,
  
  -- Exhibit details
  exhibit_number VARCHAR(50) NOT NULL,
  case_number VARCHAR(100),
  
  -- Visual proof
  screenshot_url TEXT,
  font_information JSONB,
  rendering_environment JSONB,
  
  -- Technical proof
  byte_sequence BYTEA NOT NULL,
  hex_dump TEXT NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  encoding VARCHAR(20) NOT NULL,
  
  -- Metadata
  source_system VARCHAR(100),
  extraction_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  chain_of_custody TEXT,
  validation_checksums JSONB,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  CONSTRAINT valid_exhibit_status CHECK (status IN ('draft', 'pending_review', 'approved', 'filed'))
);

-- Search Performance Metrics Table (Aggregated)
CREATE TABLE IF NOT EXISTS public.search_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Metrics
  total_searches INTEGER NOT NULL DEFAULT 0,
  true_positives INTEGER NOT NULL DEFAULT 0,
  false_positives INTEGER NOT NULL DEFAULT 0,
  true_negatives INTEGER NOT NULL DEFAULT 0,
  false_negatives INTEGER NOT NULL DEFAULT 0,
  
  -- Calculated rates
  false_positive_rate DECIMAL(5,2),
  false_negative_rate DECIMAL(5,2),
  precision_score DECIMAL(5,2),
  recall_score DECIMAL(5,2),
  
  -- Recommendations
  recommended_threshold DECIMAL(3,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Create indexes for performance
CREATE INDEX idx_identity_canonical_id ON public.identity_records(canonical_id);
CREATE INDEX idx_identity_original_script ON public.identity_records USING gin(to_tsvector('simple', original_script));
CREATE INDEX idx_identity_canonical_ascii ON public.identity_records USING gin(to_tsvector('simple', canonical_ascii));
CREATE INDEX idx_identity_status ON public.identity_records(status);
CREATE INDEX idx_identity_created_at ON public.identity_records(created_at);

CREATE INDEX idx_variants_canonical_id ON public.identity_variants(canonical_id);
CREATE INDEX idx_variants_representation ON public.identity_variants USING gin(to_tsvector('simple', representation));
CREATE INDEX idx_variants_confidence ON public.identity_variants(confidence_score);

CREATE INDEX idx_roundtrip_identity_id ON public.roundtrip_tests(identity_id);
CREATE INDEX idx_roundtrip_passed ON public.roundtrip_tests(passed);
CREATE INDEX idx_roundtrip_timestamp ON public.roundtrip_tests(test_timestamp);

CREATE INDEX idx_search_timestamp ON public.search_operations(search_timestamp);
CREATE INDEX idx_search_mode ON public.search_operations(search_mode);

CREATE INDEX idx_exhibits_identity_id ON public.court_exhibits(identity_id);
CREATE INDEX idx_exhibits_status ON public.court_exhibits(status);
CREATE INDEX idx_exhibits_case_number ON public.court_exhibits(case_number);

-- Enable Row Level Security
ALTER TABLE public.identity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roundtrip_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_exhibits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for identity_records
CREATE POLICY "Users can view all identity records"
  ON public.identity_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert identity records"
  ON public.identity_records FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own identity records"
  ON public.identity_records FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = modified_by);

-- RLS Policies for identity_variants
CREATE POLICY "Users can view all variants"
  ON public.identity_variants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert variants"
  ON public.identity_variants FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for roundtrip_tests
CREATE POLICY "Users can view all test results"
  ON public.roundtrip_tests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert test results"
  ON public.roundtrip_tests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policies for search_operations
CREATE POLICY "Users can view their own searches"
  ON public.search_operations FOR SELECT
  USING (auth.uid() = performed_by);

CREATE POLICY "Users can log their searches"
  ON public.search_operations FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

-- RLS Policies for court_exhibits
CREATE POLICY "Users can view all exhibits"
  ON public.court_exhibits FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create exhibits"
  ON public.court_exhibits FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their exhibits"
  ON public.court_exhibits FOR UPDATE
  USING (auth.uid() = created_by);

-- RLS Policies for search_metrics
CREATE POLICY "Users can view search metrics"
  ON public.search_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to identity_records
CREATE TRIGGER update_identity_records_timestamp
  BEFORE UPDATE ON public.identity_records
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();

-- Comments for documentation
COMMENT ON TABLE public.identity_records IS 'Core identity records with dual-field structure (original script + canonical ASCII)';
COMMENT ON TABLE public.identity_variants IS 'Alias register containing all observed variants of identities';
COMMENT ON TABLE public.roundtrip_tests IS 'Round-trip test results for data integrity validation';
COMMENT ON TABLE public.search_operations IS 'Log of all search operations with performance metrics';
COMMENT ON TABLE public.court_exhibits IS 'Court exhibits with visual and technical proof';
COMMENT ON TABLE public.search_metrics IS 'Aggregated search performance metrics for reporting';
