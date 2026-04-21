/**
 * Video Processing Module - Type Definitions
 * Optimized for handling large video files (2GB+)
 */

export interface VideoMetadata {
  // Basic info
  filename: string;
  filepath: string;
  fileSize: number;
  fileSizeFormatted: string;

  // Video stream
  duration: number;
  durationFormatted: string;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate: number;
  bitrate: number;
  codec: string;
  codecLongName: string;
  pixelFormat: string;
  colorSpace?: string;

  // Audio stream (if present)
  hasAudio: boolean;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  audioBitrate?: number;

  // Container info
  format: string;
  formatLongName: string;
  containerBitrate: number;

  // Timestamps
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface VideoStreamInfo {
  index: number;
  codecName: string;
  codecLongName: string;
  codecType: 'video' | 'audio' | 'subtitle' | 'data';
  profile?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  channels?: number;
  sampleRate?: number;
  duration?: number;
}

export interface ProcessingProgress {
  percent: number;
  currentTime: number;
  totalTime: number;
  fps: number;
  speed: number;
  bitrate: number;
  size: number;
  eta: number; // seconds remaining
  stage: ProcessingStage;
}

export type ProcessingStage =
  | 'initializing'
  | 'analyzing'
  | 'processing'
  | 'encoding'
  | 'finalizing'
  | 'complete'
  | 'error';

export interface TranscodeOptions {
  // Output settings
  outputPath: string;

  // Video settings
  videoCodec?: 'h264' | 'h265' | 'vp9' | 'av1' | 'copy';
  videoBitrate?: string; // e.g., '5M', '2500k'
  maxBitrate?: string;
  bufferSize?: string;
  crf?: number; // Constant Rate Factor (0-51, lower = better quality)
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';

  // Resolution
  width?: number;
  height?: number;
  scale?: 'fit' | 'fill' | 'stretch';

  // Frame rate
  frameRate?: number;

  // Audio settings
  audioCodec?: 'aac' | 'mp3' | 'opus' | 'copy' | 'none';
  audioBitrate?: string; // e.g., '128k', '256k'
  audioSampleRate?: number;
  audioChannels?: number;

  // Processing options
  startTime?: number; // seconds
  endTime?: number; // seconds
  duration?: number; // seconds

  // Hardware acceleration
  hwAccel?: 'auto' | 'cuda' | 'vaapi' | 'qsv' | 'videotoolbox' | 'none';

  // Advanced
  twoPass?: boolean;
  fastStart?: boolean; // Move moov atom for web streaming
  threads?: number;

  // Progress callback
  onProgress?: (progress: ProcessingProgress) => void;
}

export interface ThumbnailOptions {
  outputPath: string;
  timestamp?: number; // seconds, default: 10% of duration
  width?: number;
  height?: number;
  quality?: number; // 1-31 for JPEG, lower = better
  format?: 'jpg' | 'png' | 'webp';
}

export interface ThumbnailGridOptions {
  outputPath: string;
  columns?: number;
  rows?: number;
  width?: number;
  height?: number;
  interval?: number; // seconds between thumbnails
  quality?: number;
}

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  size: number;
  hash?: string;
}

export interface ChunkedUploadConfig {
  chunkSize: number; // bytes
  maxConcurrentUploads: number;
  retryAttempts: number;
  retryDelayMs: number;
  onChunkComplete?: (chunk: ChunkInfo, totalChunks: number) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percent: number;
  chunksComplete: number;
  totalChunks: number;
  speed: number; // bytes per second
  eta: number; // seconds remaining
}

export interface StreamProcessorOptions {
  bufferSize?: number; // bytes, default: 64MB
  highWaterMark?: number; // for streams
  onData?: (chunk: Buffer, bytesProcessed: number, totalBytes: number) => void;
}

export interface VideoProcessingError {
  code: VideoErrorCode;
  message: string;
  details?: string;
  ffmpegOutput?: string;
}

export type VideoErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'CODEC_NOT_SUPPORTED'
  | 'INSUFFICIENT_DISK_SPACE'
  | 'FFMPEG_NOT_FOUND'
  | 'PROCESSING_FAILED'
  | 'MEMORY_EXCEEDED'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'UPLOAD_FAILED'
  | 'CHUNK_CORRUPTED'
  | 'UNKNOWN';

export interface CompressionPreset {
  name: string;
  description: string;
  targetSize?: string; // e.g., '500MB', '1GB'
  videoCodec: TranscodeOptions['videoCodec'];
  videoBitrate?: string;
  crf?: number;
  preset: TranscodeOptions['preset'];
  audioCodec: TranscodeOptions['audioCodec'];
  audioBitrate?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export const COMPRESSION_PRESETS: Record<string, CompressionPreset> = {
  web_optimal: {
    name: 'Web Optimal',
    description: 'Balanced quality for web streaming',
    videoCodec: 'h264',
    crf: 23,
    preset: 'medium',
    audioCodec: 'aac',
    audioBitrate: '128k',
    maxWidth: 1920,
    maxHeight: 1080,
  },
  web_small: {
    name: 'Web Small',
    description: 'Smaller file size for faster loading',
    videoCodec: 'h264',
    crf: 28,
    preset: 'fast',
    audioCodec: 'aac',
    audioBitrate: '96k',
    maxWidth: 1280,
    maxHeight: 720,
  },
  archive_high: {
    name: 'Archive High Quality',
    description: 'High quality for archival purposes',
    videoCodec: 'h265',
    crf: 18,
    preset: 'slow',
    audioCodec: 'aac',
    audioBitrate: '256k',
  },
  mobile: {
    name: 'Mobile Optimized',
    description: 'Optimized for mobile devices',
    videoCodec: 'h264',
    crf: 26,
    preset: 'fast',
    audioCodec: 'aac',
    audioBitrate: '96k',
    maxWidth: 854,
    maxHeight: 480,
  },
  fast_preview: {
    name: 'Fast Preview',
    description: 'Quick encode for preview purposes',
    videoCodec: 'h264',
    crf: 30,
    preset: 'ultrafast',
    audioCodec: 'aac',
    audioBitrate: '64k',
    maxWidth: 640,
    maxHeight: 360,
  },
};
