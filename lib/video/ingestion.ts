/**
 * Video Ingestion Service
 * Orchestrates the complete video upload and processing pipeline
 * Handles chunked uploads, processing jobs, and status tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  VideoUpload,
  VideoChunk,
  VideoProcessingJob,
  VideoStatus,
  InitiateUploadRequest,
  InitiateUploadResponse,
  CompleteUploadResponse,
  VideoProcessingOptions,
} from '../types/video';
import type { ProcessingProgress, VideoMetadata } from './types';
import {
  DEFAULT_UPLOAD_CHUNK_SIZE,
  BYTES_PER_MB,
  BYTES_PER_GB,
  SUPPORTED_VIDEO_FORMATS,
  VIDEO_MIME_TYPES,
} from './constants';
import { extractMetadata } from './metadata';
import { transcode, generateThumbnail, generateThumbnailGrid, extractAudio } from './processor';
import { COMPRESSION_PRESETS } from './types';

// In-memory storage for upload sessions (replace with Redis in production)
const uploadSessions = new Map<string, UploadSession>();
const processingJobs = new Map<string, ProcessingJobState>();

interface UploadSession {
  uploadId: string;
  videoId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  chunks: ChunkState[];
  tempDir: string;
  metadata: Partial<VideoUpload>;
  createdAt: Date;
  expiresAt: Date;
}

interface ChunkState {
  index: number;
  start: number;
  end: number;
  size: number;
  uploaded: boolean;
  hash?: string;
  tempPath?: string;
}

interface ProcessingJobState {
  jobId: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Configuration
const UPLOAD_EXPIRY_HOURS = 24;
const TEMP_UPLOAD_DIR = process.env.VIDEO_TEMP_DIR || '/tmp/video-uploads';
const PROCESSED_VIDEO_DIR = process.env.VIDEO_PROCESSED_DIR || '/tmp/video-processed';

/**
 * Validate video file type
 */
export function isValidVideoType(filename: string, mimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase().slice(1);
  const validExt = SUPPORTED_VIDEO_FORMATS.includes(ext as typeof SUPPORTED_VIDEO_FORMATS[number]);
  const validMime = mimeType.startsWith('video/') || Object.values(VIDEO_MIME_TYPES).includes(mimeType);
  return validExt && validMime;
}

/**
 * Generate chunks for a file upload
 */
function generateChunks(fileSize: number, chunkSize: number = DEFAULT_UPLOAD_CHUNK_SIZE): ChunkState[] {
  const chunks: ChunkState[] = [];
  let start = 0;
  let index = 0;

  while (start < fileSize) {
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({
      index,
      start,
      end,
      size: end - start,
      uploaded: false,
    });
    start = end;
    index++;
  }

  return chunks;
}

/**
 * Initiate a chunked video upload
 */
export async function initiateUpload(
  request: InitiateUploadRequest,
  userId?: string
): Promise<InitiateUploadResponse> {
  // Validate file type
  if (!isValidVideoType(request.filename, request.mime_type)) {
    throw new Error(`Unsupported video format: ${request.filename}`);
  }

  // Generate IDs
  const uploadId = crypto.randomUUID();
  const videoId = crypto.randomUUID();

  // Calculate chunks
  const chunkSize = request.file_size > 2 * BYTES_PER_GB
    ? 50 * BYTES_PER_MB // 50MB chunks for very large files
    : DEFAULT_UPLOAD_CHUNK_SIZE;

  const chunks = generateChunks(request.file_size, chunkSize);

  // Create temp directory for this upload
  const tempDir = path.join(TEMP_UPLOAD_DIR, uploadId);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create upload session
  const session: UploadSession = {
    uploadId,
    videoId,
    filename: request.filename,
    fileSize: request.file_size,
    mimeType: request.mime_type,
    chunks,
    tempDir,
    metadata: {
      id: videoId,
      original_filename: request.filename,
      file_size_bytes: request.file_size,
      mime_type: request.mime_type,
      file_extension: path.extname(request.filename).slice(1).toLowerCase(),
      title: request.title,
      description: request.description,
      category: request.category,
      tags: request.tags,
      case_number: request.case_number,
      jurisdiction: request.jurisdiction,
      access_level: request.access_level,
      recorded_at: request.recorded_at,
      status: 'uploading',
      uploaded_by: userId,
      storage_bucket: 'videos',
    },
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_HOURS * 60 * 60 * 1000),
  };

  uploadSessions.set(uploadId, session);

  return {
    upload_id: uploadId,
    video_id: videoId,
    chunks: chunks.map((chunk) => ({
      index: chunk.index,
      upload_url: `/api/videos/upload/${uploadId}/chunk/${chunk.index}`,
      start: chunk.start,
      end: chunk.end,
      size: chunk.size,
    })),
    total_chunks: chunks.length,
    chunk_size: chunkSize,
    expires_at: session.expiresAt.toISOString(),
  };
}

/**
 * Handle chunk upload
 */
export async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  chunkData: Buffer,
  chunkHash: string
): Promise<{ success: boolean; chunksCompleted: number; totalChunks: number; progress: number }> {
  const session = uploadSessions.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or expired');
  }

  const chunk = session.chunks[chunkIndex];
  if (!chunk) {
    throw new Error(`Invalid chunk index: ${chunkIndex}`);
  }

  // Verify chunk size
  if (chunkData.length !== chunk.size) {
    throw new Error(`Chunk size mismatch: expected ${chunk.size}, got ${chunkData.length}`);
  }

  // Verify chunk hash
  const actualHash = crypto.createHash('sha256').update(chunkData).digest('hex');
  if (actualHash !== chunkHash) {
    throw new Error('Chunk hash verification failed');
  }

  // Write chunk to temp file
  const chunkPath = path.join(session.tempDir, `chunk-${chunkIndex.toString().padStart(6, '0')}`);
  fs.writeFileSync(chunkPath, chunkData);

  // Update chunk state
  chunk.uploaded = true;
  chunk.hash = chunkHash;
  chunk.tempPath = chunkPath;

  // Calculate progress
  const chunksCompleted = session.chunks.filter((c) => c.uploaded).length;
  const progress = (chunksCompleted / session.chunks.length) * 100;

  return {
    success: true,
    chunksCompleted,
    totalChunks: session.chunks.length,
    progress,
  };
}

/**
 * Get upload progress
 */
export function getUploadProgress(uploadId: string): {
  chunksCompleted: number;
  totalChunks: number;
  progress: number;
  status: string;
} | null {
  const session = uploadSessions.get(uploadId);
  if (!session) return null;

  const chunksCompleted = session.chunks.filter((c) => c.uploaded).length;

  return {
    chunksCompleted,
    totalChunks: session.chunks.length,
    progress: (chunksCompleted / session.chunks.length) * 100,
    status: chunksCompleted === session.chunks.length ? 'ready' : 'uploading',
  };
}

/**
 * Assemble uploaded chunks into final file
 */
async function assembleChunks(session: UploadSession): Promise<string> {
  const outputPath = path.join(session.tempDir, session.filename);
  const writeStream = fs.createWriteStream(outputPath);

  // Sort chunks by index and write sequentially
  const sortedChunks = [...session.chunks].sort((a, b) => a.index - b.index);

  for (const chunk of sortedChunks) {
    if (!chunk.tempPath || !chunk.uploaded) {
      throw new Error(`Chunk ${chunk.index} not uploaded`);
    }
    const chunkData = fs.readFileSync(chunk.tempPath);
    writeStream.write(chunkData);
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Clean up chunk files
  for (const chunk of sortedChunks) {
    if (chunk.tempPath) {
      fs.unlinkSync(chunk.tempPath);
    }
  }

  return outputPath;
}

/**
 * Complete the upload and start processing
 */
export async function completeUpload(
  uploadId: string,
  fileHash: string,
  processingOptions: VideoProcessingOptions = {
    generate_thumbnail: true,
    generate_thumbnail_grid: true,
    extract_metadata: true,
  }
): Promise<CompleteUploadResponse> {
  const session = uploadSessions.get(uploadId);
  if (!session) {
    throw new Error('Upload session not found or expired');
  }

  // Verify all chunks uploaded
  const allUploaded = session.chunks.every((c) => c.uploaded);
  if (!allUploaded) {
    const missing = session.chunks.filter((c) => !c.uploaded).map((c) => c.index);
    throw new Error(`Missing chunks: ${missing.join(', ')}`);
  }

  // Assemble chunks into final file
  const assembledPath = await assembleChunks(session);

  // Verify file hash
  const actualHash = await calculateFileHashStream(assembledPath);
  if (actualHash !== fileHash) {
    throw new Error('File hash verification failed');
  }

  // Update session with assembled file path
  session.metadata.original_path = assembledPath;
  session.metadata.sha256_hash = fileHash;
  session.metadata.status = 'processing';

  // Start processing job
  const jobId = await startProcessingJob(session.videoId, assembledPath, processingOptions);

  return {
    video_id: session.videoId,
    status: 'processing',
    processing_job_id: jobId,
  };
}

/**
 * Calculate file hash using streaming
 */
async function calculateFileHashStream(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 64 * BYTES_PER_MB });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Start video processing job
 */
async function startProcessingJob(
  videoId: string,
  inputPath: string,
  options: VideoProcessingOptions
): Promise<string> {
  const jobId = crypto.randomUUID();

  const jobState: ProcessingJobState = {
    jobId,
    videoId,
    status: 'queued',
    progress: 0,
    stage: 'initializing',
  };

  processingJobs.set(jobId, jobState);

  // Start processing asynchronously
  processVideoAsync(jobId, videoId, inputPath, options).catch((error) => {
    const job = processingJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
    }
  });

  return jobId;
}

/**
 * Process video asynchronously
 */
async function processVideoAsync(
  jobId: string,
  videoId: string,
  inputPath: string,
  options: VideoProcessingOptions
): Promise<void> {
  const job = processingJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';
  job.startedAt = new Date();

  // Ensure output directory exists
  const outputDir = path.join(PROCESSED_VIDEO_DIR, videoId);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: {
    metadata?: VideoMetadata;
    thumbnailPath?: string;
    thumbnailGridPath?: string;
    transcodedPath?: string;
    audioPath?: string;
  } = {};

  try {
    // Step 1: Extract metadata
    if (options.extract_metadata !== false) {
      job.stage = 'extracting_metadata';
      job.progress = 5;
      results.metadata = await extractMetadata(inputPath);
      job.progress = 15;
    }

    // Step 2: Generate thumbnail
    if (options.generate_thumbnail) {
      job.stage = 'generating_thumbnails';
      job.progress = 20;
      const thumbnailPath = path.join(outputDir, 'thumbnail.jpg');
      await generateThumbnail(inputPath, {
        outputPath: thumbnailPath,
        width: 640,
        height: 360,
        quality: 5,
      });
      results.thumbnailPath = thumbnailPath;
      job.progress = 30;
    }

    // Step 3: Generate thumbnail grid
    if (options.generate_thumbnail_grid) {
      job.stage = 'generating_thumbnail_grid';
      const gridPath = path.join(outputDir, 'thumbnail-grid.jpg');
      await generateThumbnailGrid(inputPath, {
        outputPath: gridPath,
        columns: 5,
        rows: 4,
        width: 160,
        height: 90,
      });
      results.thumbnailGridPath = gridPath;
      job.progress = 40;
    }

    // Step 4: Transcode (if requested)
    if (options.transcode) {
      job.stage = 'transcoding';
      const profile = options.transcode_profile
        ? COMPRESSION_PRESETS[options.transcode_profile]
        : COMPRESSION_PRESETS.web_optimal;

      const transcodedPath = path.join(outputDir, 'video-processed.mp4');
      await transcode(inputPath, {
        outputPath: transcodedPath,
        videoCodec: profile?.videoCodec || 'h264',
        crf: profile?.crf || 23,
        preset: profile?.preset || 'medium',
        audioCodec: profile?.audioCodec || 'aac',
        audioBitrate: profile?.audioBitrate || '128k',
        fastStart: true,
        onProgress: (progress: ProcessingProgress) => {
          job.progress = 40 + (progress.percent * 0.5); // 40-90%
        },
      });
      results.transcodedPath = transcodedPath;
      job.progress = 90;
    }

    // Step 5: Extract audio (if requested)
    if (options.extract_audio) {
      job.stage = 'extracting_audio';
      const audioPath = path.join(outputDir, 'audio.mp3');
      await extractAudio(inputPath, audioPath, { codec: 'mp3', bitrate: '192k' });
      results.audioPath = audioPath;
    }

    // Complete
    job.status = 'completed';
    job.progress = 100;
    job.stage = 'completed';
    job.completedAt = new Date();

    // Update video record with results (in production, save to database)
    const session = Array.from(uploadSessions.values()).find((s) => s.videoId === videoId);
    if (session) {
      session.metadata.status = 'completed';
      session.metadata.processed_at = new Date().toISOString();
      if (results.metadata) {
        session.metadata.duration_seconds = results.metadata.duration;
        session.metadata.width = results.metadata.width;
        session.metadata.height = results.metadata.height;
        session.metadata.frame_rate = results.metadata.frameRate;
        session.metadata.video_codec = results.metadata.codec;
        session.metadata.audio_codec = results.metadata.audioCodec;
        session.metadata.bitrate = results.metadata.bitrate;
        session.metadata.has_audio = results.metadata.hasAudio;
      }
      session.metadata.thumbnail_path = results.thumbnailPath;
      session.metadata.thumbnail_grid_path = results.thumbnailGridPath;
      session.metadata.processed_path = results.transcodedPath;
    }
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date();

    // Update video status
    const session = Array.from(uploadSessions.values()).find((s) => s.videoId === videoId);
    if (session) {
      session.metadata.status = 'failed';
      session.metadata.error_message = job.error;
    }

    throw error;
  }
}

/**
 * Get processing job status
 */
export function getProcessingJobStatus(jobId: string): ProcessingJobState | null {
  return processingJobs.get(jobId) || null;
}

/**
 * Get video status by ID
 */
export function getVideoStatus(videoId: string): Partial<VideoUpload> | null {
  const session = Array.from(uploadSessions.values()).find((s) => s.videoId === videoId);
  return session?.metadata || null;
}

/**
 * Cancel an upload
 */
export function cancelUpload(uploadId: string): boolean {
  const session = uploadSessions.get(uploadId);
  if (!session) return false;

  // Clean up temp files
  if (fs.existsSync(session.tempDir)) {
    fs.rmSync(session.tempDir, { recursive: true, force: true });
  }

  uploadSessions.delete(uploadId);
  return true;
}

/**
 * Clean up expired upload sessions
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleaned = 0;

  for (const [uploadId, session] of uploadSessions.entries()) {
    if (session.expiresAt < now) {
      // Clean up temp files
      if (fs.existsSync(session.tempDir)) {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
      }
      uploadSessions.delete(uploadId);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get all active uploads for a user
 */
export function getActiveUploads(userId?: string): Array<{
  uploadId: string;
  videoId: string;
  filename: string;
  progress: number;
  status: string;
}> {
  const uploads: Array<{
    uploadId: string;
    videoId: string;
    filename: string;
    progress: number;
    status: string;
  }> = [];

  for (const [uploadId, session] of uploadSessions.entries()) {
    if (!userId || session.metadata.uploaded_by === userId) {
      const chunksCompleted = session.chunks.filter((c) => c.uploaded).length;
      uploads.push({
        uploadId,
        videoId: session.videoId,
        filename: session.filename,
        progress: (chunksCompleted / session.chunks.length) * 100,
        status: session.metadata.status || 'uploading',
      });
    }
  }

  return uploads;
}
