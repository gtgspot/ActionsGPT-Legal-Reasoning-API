export interface RegulatoryDocument {
  id: string
  document_name: string
  document_type: "act" | "regulation" | "statute" | "case_law" | "policy" | "guideline" | "template" | "form" | "other"
  file_extension: string
  storage_bucket: string
  storage_path: string
  file_size_bytes: number
  mime_type: string
  title: string
  description?: string
  jurisdiction?: string
  effective_date?: string
  expiration_date?: string
  version?: string
  category?: string
  tags?: string[]
  sha256_hash: string
  md5_hash: string
  related_identity_ids?: string[]
  access_level: "public" | "internal" | "restricted" | "confidential"
  created_at: string
  created_by?: string
  last_modified: string
  modified_by?: string
  status: "active" | "archived" | "superseded" | "draft"
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: string
  storage_path: string
  file_size_bytes: number
  sha256_hash: string
  change_summary?: string
  changed_by?: string
  changed_at: string
  is_current: boolean
}

export interface DocumentAccessLog {
  id: string
  document_id: string
  accessed_by?: string
  accessed_at: string
  access_type: "view" | "download" | "edit" | "delete" | "share"
  ip_address?: string
  user_agent?: string
}

export interface DocumentAnnotation {
  id: string
  document_id: string
  annotation_type: "note" | "highlight" | "bookmark" | "comment"
  content: string
  page_number?: number
  position_data?: Record<string, any>
  created_by?: string
  created_at: string
}
