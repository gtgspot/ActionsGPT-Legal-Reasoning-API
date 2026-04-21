/**
 * Video Processing Module
 * Optimized for handling large video files (2GB+)
 *
 * Features:
 * - Memory-efficient streaming for large files
 * - FFmpeg integration for transcoding and manipulation
 * - Chunked uploads with progress tracking and resumption
 * - Metadata extraction without loading entire file
 * - Progress callbacks for all operations
 *
 * @example
 * ```typescript
 * import {
 *   extractMetadata,
 *   transcode,
 *   transcodeWithPreset,
 *   generateThumbnail,
 *   uploadFileInChunks,
 * } from '@/lib/video';
 *
 * // Extract metadata (memory efficient)
 * const metadata = await extractMetadata('/path/to/large-video.mp4');
 * console.log(`Duration: ${metadata.durationFormatted}`);
 * console.log(`Size: ${metadata.fileSizeFormatted}`);
 *
 * // Transcode with progress
 * await transcode('/path/to/input.mp4', {
 *   outputPath: '/path/to/output.mp4',
 *   videoCodec: 'h264',
 *   crf: 23,
 *   preset: 'medium',
 *   audioCodec: 'aac',
 *   audioBitrate: '128k',
 *   fastStart: true,
 *   onProgress: (progress) => {
 *     console.log(`${progress.percent}% complete, ETA: ${progress.eta}s`);
 *   },
 * });
 *
 * // Use compression preset
 * await transcodeWithPreset(
 *   '/path/to/input.mp4',
 *   '/path/to/output.mp4',
 *   'web_optimal',
 *   (progress) => console.log(`${progress.percent}%`)
 * );
 *
 * // Generate thumbnail
 * await generateThumbnail('/path/to/video.mp4', {
 *   outputPath: '/path/to/thumb.jpg',
 *   timestamp: 30, // 30 seconds in
 *   width: 320,
 * });
 *
 * // Upload large file in chunks
 * const { fileId, fileHash } = await uploadFileInChunks(
 *   '/path/to/large-video.mp4',
 *   async (fileId, chunkIndex, chunkData, chunkHash) => {
 *     // Upload chunk to your storage backend
 *     await uploadToStorage(fileId, chunkIndex, chunkData);
 *   },
 *   {
 *     chunkSize: 10 * 1024 * 1024, // 10MB chunks
 *     onProgress: (progress) => {
 *       console.log(`Uploaded: ${progress.percent}%, Speed: ${progress.speed} bytes/s`);
 *     },
 *   }
 * );
 * ```
 */

// Types
export type {
  VideoMetadata,
  VideoStreamInfo,
  ProcessingProgress,
  ProcessingStage,
  TranscodeOptions,
  ThumbnailOptions,
  ThumbnailGridOptions,
  ChunkInfo,
  ChunkedUploadConfig,
  UploadProgress,
  StreamProcessorOptions,
  VideoProcessingError,
  VideoErrorCode,
  CompressionPreset,
} from './types';

export { COMPRESSION_PRESETS } from './types';

// Constants
export {
  BYTES_PER_KB,
  BYTES_PER_MB,
  BYTES_PER_GB,
  DEFAULT_CHUNK_SIZE,
  MAX_FILE_SIZE,
  CHUNKED_UPLOAD_THRESHOLD,
  DEFAULT_STREAM_BUFFER_SIZE,
  DEFAULT_HIGH_WATER_MARK,
  METADATA_EXTRACTION_TIMEOUT,
  THUMBNAIL_GENERATION_TIMEOUT,
  DEFAULT_PROCESSING_TIMEOUT,
  LARGE_FILE_PROCESSING_TIMEOUT,
  DEFAULT_UPLOAD_CHUNK_SIZE,
  MAX_CONCURRENT_UPLOADS,
  UPLOAD_RETRY_ATTEMPTS,
  UPLOAD_RETRY_DELAY_MS,
  SUPPORTED_VIDEO_FORMATS,
  SUPPORTED_VIDEO_CODECS,
  SUPPORTED_AUDIO_CODECS,
  VIDEO_MIME_TYPES,
  FFMPEG_PRESETS,
  VIDEO_RESOLUTIONS,
  RECOMMENDED_BITRATES,
  MEMORY_LIMITS,
  ERROR_MESSAGES,
} from './constants';

// Metadata extraction
export {
  extractMetadata,
  extractStreams,
  isValidVideo,
  getVideoDuration,
  isFFprobeAvailable,
  formatFileSize,
  formatDuration,
} from './metadata';

// Video processing
export {
  transcode,
  transcodeWithPreset,
  generateThumbnail,
  generateThumbnailGrid,
  extractAudio,
  trimVideo,
  concatenateVideos,
  cancelProcessing,
  getActiveProcesses,
  isFFmpegAvailable,
  detectHardwareAcceleration,
} from './processor';

// Chunked upload
export {
  uploadFileInChunks,
  resumeUpload,
  cancelUpload,
  getUploadProgress,
  getActiveUploads,
  initializeUploadState,
  calculateFileHash,
  calculateChunkHash,
  generateChunks,
  readChunk,
  verifyUploadedFile,
} from './chunked-upload';

// Stream handling
export {
  streamFileWithProgress,
  processFileInChunks,
  streamCopy,
  readFileAsChunks,
  writeChunksToFile,
  compareFiles,
  getFileProcessingInfo,
  getOptimalBufferSize,
  getMemoryUsage,
  hasEnoughMemory,
  MemoryAwareStream,
  ProgressStream,
} from './stream-handler';

// Ingestion service
export {
  initiateUpload,
  uploadChunk,
  completeUpload,
  getUploadProgress as getIngestionUploadProgress,
  getProcessingJobStatus,
  getVideoStatus,
  cancelUpload as cancelIngestionUpload,
  cleanupExpiredSessions,
  getActiveUploads as getActiveIngestionUploads,
  isValidVideoType,
} from './ingestion';

/**
 * Quick check if the system is ready for video processing
 */
export async function checkSystemReady(): Promise<{
  ready: boolean;
  ffmpegAvailable: boolean;
  ffprobeAvailable: boolean;
  hwAccelOptions: string[];
  memoryStatus: {
    heapUsedPercent: number;
    hasAdequateMemory: boolean;
  };
}> {
  const { isFFmpegAvailable, detectHardwareAcceleration } = await import('./processor');
  const { isFFprobeAvailable } = await import('./metadata');
  const { getMemoryUsage, hasEnoughMemory } = await import('./stream-handler');
  const { BYTES_PER_GB } = await import('./constants');

  const [ffmpegAvailable, ffprobeAvailable, hwAccelOptions] = await Promise.all([
    isFFmpegAvailable(),
    isFFprobeAvailable(),
    detectHardwareAcceleration(),
  ]);

  const memUsage = getMemoryUsage();
  const hasAdequateMemory = hasEnoughMemory(BYTES_PER_GB);

  return {
    ready: ffmpegAvailable && ffprobeAvailable,
    ffmpegAvailable,
    ffprobeAvailable,
    hwAccelOptions,
    memoryStatus: {
      heapUsedPercent: memUsage.heapUsedPercent,
      hasAdequateMemory,
    },
  };
}
