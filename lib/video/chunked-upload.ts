/**
 * Chunked Upload Handler for Large Video Files
 * Efficiently handles uploading large files (2GB+) in chunks
 * with progress tracking, retry logic, and integrity verification
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import type {
  ChunkInfo,
  ChunkedUploadConfig,
  UploadProgress,
  VideoProcessingError,
} from './types';
import {
  DEFAULT_UPLOAD_CHUNK_SIZE,
  MAX_CONCURRENT_UPLOADS,
  UPLOAD_RETRY_ATTEMPTS,
  UPLOAD_RETRY_DELAY_MS,
  BYTES_PER_MB,
} from './constants';

interface UploadState {
  fileId: string;
  filePath: string;
  fileSize: number;
  chunkSize: number;
  totalChunks: number;
  completedChunks: Set<number>;
  uploadedBytes: number;
  startTime: number;
  cancelled: boolean;
}

// Track active uploads for resumption
const activeUploads = new Map<string, UploadState>();

/**
 * Calculate file hash using streaming to handle large files
 */
export async function calculateFileHash(
  filePath: string,
  algorithm: 'sha256' | 'md5' = 'sha256'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * BYTES_PER_MB, // 64MB buffer for efficiency
    });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Calculate hash for a specific chunk
 */
export async function calculateChunkHash(
  filePath: string,
  start: number,
  end: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { start, end: end - 1 });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate chunk information for a file
 */
export function generateChunks(
  fileSize: number,
  chunkSize: number = DEFAULT_UPLOAD_CHUNK_SIZE
): ChunkInfo[] {
  const chunks: ChunkInfo[] = [];
  let start = 0;
  let index = 0;

  while (start < fileSize) {
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({
      index,
      start,
      end,
      size: end - start,
    });
    start = end;
    index++;
  }

  return chunks;
}

/**
 * Read a specific chunk from file
 */
export async function readChunk(
  filePath: string,
  start: number,
  end: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = fs.createReadStream(filePath, { start, end: end - 1 });

    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

/**
 * Default chunk upload function (to be replaced with actual implementation)
 * This is a template that should be overridden with your storage backend
 */
type ChunkUploader = (
  fileId: string,
  chunkIndex: number,
  chunkData: Buffer,
  chunkHash: string
) => Promise<void>;

/**
 * Upload a single chunk with retry logic
 */
async function uploadChunkWithRetry(
  uploader: ChunkUploader,
  fileId: string,
  chunkIndex: number,
  chunkData: Buffer,
  chunkHash: string,
  retryAttempts: number,
  retryDelayMs: number
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      await uploader(fileId, chunkIndex, chunkData, chunkHash);
      return;
    } catch (error) {
      lastError = error as Error;

      if (attempt < retryAttempts) {
        // Exponential backoff
        const delay = retryDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Chunked file upload handler
 * Uploads large files in chunks with progress tracking and resumption support
 */
export async function uploadFileInChunks(
  filePath: string,
  uploader: ChunkUploader,
  config: Partial<ChunkedUploadConfig> = {}
): Promise<{ fileId: string; totalChunks: number; fileHash: string }> {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw createError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const chunkSize = config.chunkSize || DEFAULT_UPLOAD_CHUNK_SIZE;
  const maxConcurrent = config.maxConcurrentUploads || MAX_CONCURRENT_UPLOADS;
  const retryAttempts = config.retryAttempts || UPLOAD_RETRY_ATTEMPTS;
  const retryDelayMs = config.retryDelayMs || UPLOAD_RETRY_DELAY_MS;

  // Generate file ID
  const fileId = crypto.randomUUID();

  // Generate chunks
  const chunks = generateChunks(fileSize, chunkSize);
  const totalChunks = chunks.length;

  // Initialize upload state
  const state: UploadState = {
    fileId,
    filePath,
    fileSize,
    chunkSize,
    totalChunks,
    completedChunks: new Set(),
    uploadedBytes: 0,
    startTime: Date.now(),
    cancelled: false,
  };

  activeUploads.set(fileId, state);

  // Calculate file hash in parallel with upload start
  const fileHashPromise = calculateFileHash(filePath);

  // Process chunks with controlled concurrency
  const pendingChunks = [...chunks];
  const activePromises: Promise<void>[] = [];

  const processNextChunk = async (): Promise<void> => {
    while (pendingChunks.length > 0 && !state.cancelled) {
      const chunk = pendingChunks.shift()!;

      try {
        // Read chunk data
        const chunkData = await readChunk(filePath, chunk.start, chunk.end);

        // Calculate chunk hash
        const chunkHash = crypto.createHash('sha256').update(chunkData).digest('hex');

        // Upload chunk with retry
        await uploadChunkWithRetry(
          uploader,
          fileId,
          chunk.index,
          chunkData,
          chunkHash,
          retryAttempts,
          retryDelayMs
        );

        // Update state
        state.completedChunks.add(chunk.index);
        state.uploadedBytes += chunk.size;

        // Report progress
        if (config.onChunkComplete) {
          config.onChunkComplete(chunk, totalChunks);
        }

        if (config.onProgress) {
          const elapsedMs = Date.now() - state.startTime;
          const speed = elapsedMs > 0 ? (state.uploadedBytes / elapsedMs) * 1000 : 0;
          const remainingBytes = fileSize - state.uploadedBytes;
          const eta = speed > 0 ? remainingBytes / speed : 0;

          config.onProgress({
            uploadedBytes: state.uploadedBytes,
            totalBytes: fileSize,
            percent: (state.uploadedBytes / fileSize) * 100,
            chunksComplete: state.completedChunks.size,
            totalChunks,
            speed,
            eta,
          });
        }
      } catch (error) {
        // Re-add chunk to pending for retry or throw
        throw error;
      }
    }
  };

  try {
    // Start concurrent upload workers
    for (let i = 0; i < maxConcurrent; i++) {
      activePromises.push(processNextChunk());
    }

    await Promise.all(activePromises);

    const fileHash = await fileHashPromise;

    // Cleanup state
    activeUploads.delete(fileId);

    return { fileId, totalChunks, fileHash };
  } catch (error) {
    activeUploads.delete(fileId);
    throw error;
  }
}

/**
 * Resume a partially completed upload
 */
export async function resumeUpload(
  fileId: string,
  completedChunkIndices: number[],
  uploader: ChunkUploader,
  config: Partial<ChunkedUploadConfig> = {}
): Promise<{ fileId: string; totalChunks: number; fileHash: string }> {
  const state = activeUploads.get(fileId);
  if (!state) {
    throw createError('UPLOAD_FAILED', `No active upload found for fileId: ${fileId}`);
  }

  // Mark completed chunks
  completedChunkIndices.forEach((index) => state.completedChunks.add(index));

  // Calculate already uploaded bytes
  const chunks = generateChunks(state.fileSize, state.chunkSize);
  state.uploadedBytes = completedChunkIndices.reduce((total, index) => {
    const chunk = chunks.find((c) => c.index === index);
    return total + (chunk?.size || 0);
  }, 0);

  // Continue upload with remaining chunks
  const remainingChunks = chunks.filter((c) => !state.completedChunks.has(c.index));

  const maxConcurrent = config.maxConcurrentUploads || MAX_CONCURRENT_UPLOADS;
  const retryAttempts = config.retryAttempts || UPLOAD_RETRY_ATTEMPTS;
  const retryDelayMs = config.retryDelayMs || UPLOAD_RETRY_DELAY_MS;

  const fileHashPromise = calculateFileHash(state.filePath);

  const pendingChunks = [...remainingChunks];
  const activePromises: Promise<void>[] = [];

  const processNextChunk = async (): Promise<void> => {
    while (pendingChunks.length > 0 && !state.cancelled) {
      const chunk = pendingChunks.shift()!;

      const chunkData = await readChunk(state.filePath, chunk.start, chunk.end);
      const chunkHash = crypto.createHash('sha256').update(chunkData).digest('hex');

      await uploadChunkWithRetry(
        uploader,
        fileId,
        chunk.index,
        chunkData,
        chunkHash,
        retryAttempts,
        retryDelayMs
      );

      state.completedChunks.add(chunk.index);
      state.uploadedBytes += chunk.size;

      if (config.onChunkComplete) {
        config.onChunkComplete(chunk, state.totalChunks);
      }

      if (config.onProgress) {
        const elapsedMs = Date.now() - state.startTime;
        const speed = elapsedMs > 0 ? (state.uploadedBytes / elapsedMs) * 1000 : 0;
        const remainingBytes = state.fileSize - state.uploadedBytes;
        const eta = speed > 0 ? remainingBytes / speed : 0;

        config.onProgress({
          uploadedBytes: state.uploadedBytes,
          totalBytes: state.fileSize,
          percent: (state.uploadedBytes / state.fileSize) * 100,
          chunksComplete: state.completedChunks.size,
          totalChunks: state.totalChunks,
          speed,
          eta,
        });
      }
    }
  };

  for (let i = 0; i < maxConcurrent; i++) {
    activePromises.push(processNextChunk());
  }

  await Promise.all(activePromises);

  const fileHash = await fileHashPromise;
  activeUploads.delete(fileId);

  return { fileId, totalChunks: state.totalChunks, fileHash };
}

/**
 * Cancel an active upload
 */
export function cancelUpload(fileId: string): boolean {
  const state = activeUploads.get(fileId);
  if (state) {
    state.cancelled = true;
    activeUploads.delete(fileId);
    return true;
  }
  return false;
}

/**
 * Get upload progress for an active upload
 */
export function getUploadProgress(fileId: string): UploadProgress | null {
  const state = activeUploads.get(fileId);
  if (!state) return null;

  const elapsedMs = Date.now() - state.startTime;
  const speed = elapsedMs > 0 ? (state.uploadedBytes / elapsedMs) * 1000 : 0;
  const remainingBytes = state.fileSize - state.uploadedBytes;
  const eta = speed > 0 ? remainingBytes / speed : 0;

  return {
    uploadedBytes: state.uploadedBytes,
    totalBytes: state.fileSize,
    percent: (state.uploadedBytes / state.fileSize) * 100,
    chunksComplete: state.completedChunks.size,
    totalChunks: state.totalChunks,
    speed,
    eta,
  };
}

/**
 * Get list of active upload IDs
 */
export function getActiveUploads(): string[] {
  return Array.from(activeUploads.keys());
}

/**
 * Create upload state for resumable uploads
 * Used when initializing an upload that may need to be resumed later
 */
export function initializeUploadState(
  filePath: string,
  chunkSize: number = DEFAULT_UPLOAD_CHUNK_SIZE
): { fileId: string; chunks: ChunkInfo[]; fileSize: number } {
  if (!fs.existsSync(filePath)) {
    throw createError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileId = crypto.randomUUID();
  const chunks = generateChunks(fileSize, chunkSize);

  // Store state for potential resumption
  const state: UploadState = {
    fileId,
    filePath,
    fileSize,
    chunkSize,
    totalChunks: chunks.length,
    completedChunks: new Set(),
    uploadedBytes: 0,
    startTime: Date.now(),
    cancelled: false,
  };

  activeUploads.set(fileId, state);

  return { fileId, chunks, fileSize };
}

/**
 * Verify uploaded file integrity
 */
export async function verifyUploadedFile(
  originalFilePath: string,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await calculateFileHash(originalFilePath);
  return actualHash === expectedHash;
}

/**
 * Create error helper
 */
function createError(
  code: VideoProcessingError['code'],
  message: string
): VideoProcessingError {
  return { code, message };
}
