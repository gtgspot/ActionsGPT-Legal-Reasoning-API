/**
 * Video Processing Module - Constants and Configuration
 * Optimized for handling large video files (2GB+)
 */

// File size constants
export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;
export const BYTES_PER_GB = 1024 * 1024 * 1024;

// Default chunk size for processing large files (64MB)
// This balances memory usage with processing efficiency
export const DEFAULT_CHUNK_SIZE = 64 * BYTES_PER_MB;

// Maximum file size supported (10GB)
export const MAX_FILE_SIZE = 10 * BYTES_PER_GB;

// Recommended file size for chunked upload (files > 100MB)
export const CHUNKED_UPLOAD_THRESHOLD = 100 * BYTES_PER_MB;

// Default buffer sizes for streaming
export const DEFAULT_STREAM_BUFFER_SIZE = 64 * BYTES_PER_MB;
export const DEFAULT_HIGH_WATER_MARK = 16 * BYTES_PER_MB;

// Processing timeouts (in milliseconds)
export const METADATA_EXTRACTION_TIMEOUT = 30000; // 30 seconds
export const THUMBNAIL_GENERATION_TIMEOUT = 60000; // 1 minute
export const DEFAULT_PROCESSING_TIMEOUT = 3600000; // 1 hour
export const LARGE_FILE_PROCESSING_TIMEOUT = 7200000; // 2 hours (for files > 2GB)

// Upload configuration
export const DEFAULT_UPLOAD_CHUNK_SIZE = 10 * BYTES_PER_MB; // 10MB chunks for upload
export const MAX_CONCURRENT_UPLOADS = 3;
export const UPLOAD_RETRY_ATTEMPTS = 3;
export const UPLOAD_RETRY_DELAY_MS = 2000;

// Video format support
export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'mkv',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'm4v',
  'mpeg',
  'mpg',
  '3gp',
  'ts',
  'mts',
  'm2ts',
] as const;

export const SUPPORTED_VIDEO_CODECS = [
  'h264',
  'h265',
  'hevc',
  'vp8',
  'vp9',
  'av1',
  'mpeg4',
  'mpeg2video',
  'prores',
] as const;

export const SUPPORTED_AUDIO_CODECS = [
  'aac',
  'mp3',
  'opus',
  'vorbis',
  'ac3',
  'eac3',
  'flac',
  'pcm_s16le',
  'pcm_s24le',
] as const;

// MIME type mappings
export const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  webm: 'video/webm',
  m4v: 'video/x-m4v',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  '3gp': 'video/3gpp',
  ts: 'video/mp2t',
  mts: 'video/mp2t',
  m2ts: 'video/mp2t',
};

// FFmpeg preset configurations
export const FFMPEG_PRESETS = {
  // Hardware acceleration detection order
  hwaccel_priority: ['cuda', 'qsv', 'vaapi', 'videotoolbox'],

  // Quality presets for CRF encoding
  quality: {
    lossless: 0,
    very_high: 15,
    high: 18,
    medium: 23,
    low: 28,
    very_low: 35,
  },

  // Speed presets
  speed: {
    ultrafast: { preset: 'ultrafast', description: 'Fastest encoding, largest file' },
    superfast: { preset: 'superfast', description: 'Very fast encoding' },
    veryfast: { preset: 'veryfast', description: 'Fast encoding' },
    faster: { preset: 'faster', description: 'Faster than default' },
    fast: { preset: 'fast', description: 'Fast encoding' },
    medium: { preset: 'medium', description: 'Default balance' },
    slow: { preset: 'slow', description: 'Better compression' },
    slower: { preset: 'slower', description: 'Even better compression' },
    veryslow: { preset: 'veryslow', description: 'Best compression, slowest' },
  },
} as const;

// Common video resolutions
export const VIDEO_RESOLUTIONS = {
  '4k': { width: 3840, height: 2160 },
  '1440p': { width: 2560, height: 1440 },
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
  '240p': { width: 426, height: 240 },
} as const;

// Bitrate recommendations based on resolution
export const RECOMMENDED_BITRATES: Record<string, { video: string; audio: string }> = {
  '4k': { video: '35M', audio: '384k' },
  '1440p': { video: '16M', audio: '256k' },
  '1080p': { video: '8M', audio: '192k' },
  '720p': { video: '5M', audio: '128k' },
  '480p': { video: '2.5M', audio: '128k' },
  '360p': { video: '1M', audio: '96k' },
  '240p': { video: '500k', audio: '64k' },
};

// Memory management for large files
export const MEMORY_LIMITS = {
  // Maximum heap size to use for video processing
  maxHeapUsage: 0.8, // 80% of available heap

  // Trigger garbage collection threshold
  gcThreshold: 0.7, // 70% heap usage

  // Minimum free memory required to start processing (512MB)
  minFreeMemory: 512 * BYTES_PER_MB,
};

// Error messages
export const ERROR_MESSAGES: Record<string, string> = {
  FILE_NOT_FOUND: 'The specified video file could not be found',
  INVALID_FORMAT: 'The file format is not supported or the file is corrupted',
  CODEC_NOT_SUPPORTED: 'The video codec is not supported for this operation',
  INSUFFICIENT_DISK_SPACE: 'Not enough disk space to complete the operation',
  FFMPEG_NOT_FOUND: 'FFmpeg is not installed or not found in system PATH',
  PROCESSING_FAILED: 'Video processing failed unexpectedly',
  MEMORY_EXCEEDED: 'Memory limit exceeded during processing',
  TIMEOUT: 'Processing timed out',
  CANCELLED: 'Processing was cancelled by user',
  UPLOAD_FAILED: 'Failed to upload video file',
  CHUNK_CORRUPTED: 'Uploaded chunk failed integrity check',
  UNKNOWN: 'An unknown error occurred',
};
