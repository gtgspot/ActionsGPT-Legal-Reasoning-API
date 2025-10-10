export interface IdentityRecord {
  id: string
  canonical_id: string
  original_script: string
  canonical_ascii: string
  script_code: string
  language_code: string
  encoding_used: string
  icu_version: string
  unicode_version: string
  normalization_form: string
  created_at: string
  last_modified: string
  created_by: string | null
  modified_by: string | null
  original_hash: string
  byte_sequence: string
  status: "active" | "archived" | "merged"
}

export interface IdentityVariant {
  id: string
  canonical_id: string
  variant_type: "MRZ" | "native_alternate" | "ascii_alternate" | "transliteration" | "phonetic" | "other"
  representation: string
  script_code: string | null
  language_code: string | null
  source_document: string
  source_timestamp: string
  confidence_score: number
  created_at: string
  created_by: string | null
}

export interface RoundtripTest {
  id: string
  identity_id: string
  test_timestamp: string
  test_type: "storage" | "export" | "presentation" | "full_cycle"
  passed: boolean
  original_input: string
  final_output: string
  character_loss_rate: number
  diacritic_loss_rate: number
  script_conversion_errors: number
  byte_differences: number
  discrepancy_details: Record<string, unknown> | null
  created_by: string | null
}

export interface SearchOperation {
  id: string
  search_query: string
  search_mode: "strict" | "standard" | "fuzzy"
  search_timestamp: string
  accent_sensitive: boolean
  case_sensitive: boolean
  diacritic_sensitive: boolean
  max_edit_distance: number
  results_count: number
  match_threshold: number
  execution_time_ms: number | null
  false_positives: number
  false_negatives: number
  manual_review_required: boolean
  performed_by: string | null
}

export interface CourtExhibit {
  id: string
  identity_id: string
  exhibit_number: string
  case_number: string | null
  screenshot_url: string | null
  font_information: Record<string, unknown> | null
  rendering_environment: Record<string, unknown> | null
  byte_sequence: string
  hex_dump: string
  sha256_hash: string
  encoding: string
  source_system: string | null
  extraction_timestamp: string
  chain_of_custody: string | null
  validation_checksums: Record<string, unknown> | null
  status: "draft" | "pending_review" | "approved" | "filed"
  approved_by: string | null
  approved_at: string | null
  created_at: string
  created_by: string | null
}

export interface SearchMetrics {
  id: string
  period_start: string
  period_end: string
  total_searches: number
  true_positives: number
  false_positives: number
  true_negatives: number
  false_negatives: number
  false_positive_rate: number | null
  false_negative_rate: number | null
  precision_score: number | null
  recall_score: number | null
  recommended_threshold: number | null
  created_at: string
}
