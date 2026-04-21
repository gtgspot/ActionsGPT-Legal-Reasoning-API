/**
 * Video Upload and Processing Types
 * Database types for video ingestion and processing tracking
 */

export type VideoStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'transcoding'
  | 'generating_thumbnails'
  | 'extracting_metadata'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type VideoCategory =
  | 'evidence'
  | 'deposition'
  | 'testimony'
  | 'exhibit'
  | 'surveillance'
  | 'interview'
  | 'presentation'
  | 'training'
  | 'other';

export type VideoAccessLevel =
  | 'public'
  | 'internal'
  | 'restricted'
  | 'confidential'
  | 'privileged';

export interface VideoUpload {
  id: string;
  // File information
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  file_extension: string;

  // Storage paths
  storage_bucket: string;
  original_path: string;
  processed_path?: string;
  thumbnail_path?: string;
  thumbnail_grid_path?: string;

  // Video metadata
  duration_seconds?: number;
  width?: number;
  height?: number;
  frame_rate?: number;
  video_codec?: string;
  audio_codec?: string;
  bitrate?: number;
  has_audio?: boolean;

  // Processing status
  status: VideoStatus;
  processing_progress?: number;
  processing_stage?: string;
  error_message?: string;
  error_code?: string;

  // Integrity verification
  sha256_hash?: string;
  md5_hash?: string;

  // Metadata
  title: string;
  description?: string;
  category: VideoCategory;
  tags?: string[];
  case_number?: string;
  jurisdiction?: string;
  access_level: VideoAccessLevel;

  // Timestamps
  recorded_at?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;

  // User tracking
  uploaded_by?: string;
  modified_by?: string;
}

export interface VideoChunk {
  id: string;
  video_id: string;
  chunk_index: number;
  chunk_size: number;
  chunk_hash: string;
  storage_path: string;
  uploaded: boolean;
  created_at: string;
}

export interface VideoProcessingJob {
  id: string;
  video_id: string;
  job_type: 'transcode' | 'thumbnail' | 'metadata' | 'audio_extract';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: number;
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  output_path?: string;
  options?: Record<string, unknown>;
  created_at: string;
}

export interface VideoTranscodeProfile {
  id: string;
  name: string;
  description: string;
  video_codec: 'h264' | 'h265' | 'vp9';
  audio_codec: 'aac' | 'mp3' | 'opus';
  max_width?: number;
  max_height?: number;
  video_bitrate?: string;
  audio_bitrate?: string;
  crf?: number;
  preset: 'ultrafast' | 'fast' | 'medium' | 'slow';
  is_default: boolean;
}

export interface VideoAccessLog {
  id: string;
  video_id: string;
  accessed_by?: string;
  access_type: 'view' | 'download' | 'stream' | 'share' | 'edit' | 'delete';
  ip_address?: string;
  user_agent?: string;
  accessed_at: string;
}

// Request/Response types for API routes

export interface InitiateUploadRequest {
  filename: string;
  file_size: number;
  mime_type: string;
  title: string;
  description?: string;
  category: VideoCategory;
  tags?: string[];
  case_number?: string;
  jurisdiction?: string;
  access_level: VideoAccessLevel;
  recorded_at?: string;
}

export interface InitiateUploadResponse {
  upload_id: string;
  video_id: string;
  chunks: {
    index: number;
    upload_url: string;
    start: number;
    end: number;
    size: number;
  }[];
  total_chunks: number;
  chunk_size: number;
  expires_at: string;
}

export interface UploadChunkRequest {
  upload_id: string;
  chunk_index: number;
  chunk_hash: string;
}

export interface UploadChunkResponse {
  success: boolean;
  chunks_completed: number;
  total_chunks: number;
  progress: number;
}

export interface CompleteUploadRequest {
  upload_id: string;
  file_hash: string;
}

export interface CompleteUploadResponse {
  video_id: string;
  status: VideoStatus;
  processing_job_id?: string;
}

export interface VideoProcessingOptions {
  generate_thumbnail?: boolean;
  generate_thumbnail_grid?: boolean;
  transcode?: boolean;
  transcode_profile?: string;
  extract_audio?: boolean;
  extract_metadata?: boolean;
}

export interface VideoListFilters {
  status?: VideoStatus[];
  category?: VideoCategory[];
  access_level?: VideoAccessLevel[];
  uploaded_by?: string;
  case_number?: string;
  jurisdiction?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface VideoListResponse {
  videos: VideoUpload[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
