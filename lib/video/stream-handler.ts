/**
 * Stream Handler for Large Video Files
 * Memory-efficient streaming utilities for processing large files
 * Designed for files 2GB+ that cannot be loaded entirely into memory
 */

import * as fs from 'fs';
import * as path from 'path';
import { Transform, Readable, Writable, pipeline } from 'stream';
import { promisify } from 'util';
import type { StreamProcessorOptions, VideoProcessingError } from './types';
import {
  DEFAULT_STREAM_BUFFER_SIZE,
  DEFAULT_HIGH_WATER_MARK,
  BYTES_PER_MB,
  BYTES_PER_GB,
} from './constants';

const pipelineAsync = promisify(pipeline);

/**
 * Memory usage monitor
 */
export function getMemoryUsage(): {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedPercent: number;
} {
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
    rss: usage.rss,
    heapUsedPercent: (usage.heapUsed / usage.heapTotal) * 100,
  };
}

/**
 * Check if there's enough memory to process a file
 */
export function hasEnoughMemory(requiredBytes: number): boolean {
  const usage = process.memoryUsage();
  const availableHeap = usage.heapTotal - usage.heapUsed;
  // Require at least 20% buffer above required amount
  return availableHeap > requiredBytes * 1.2;
}

/**
 * Throttled stream that controls memory usage
 * Pauses reading when memory threshold is exceeded
 */
export class MemoryAwareStream extends Transform {
  private memoryThreshold: number;
  private checkInterval: number;
  private lastCheck: number = 0;

  constructor(options: {
    memoryThresholdPercent?: number;
    checkIntervalMs?: number;
    highWaterMark?: number;
  } = {}) {
    super({
      highWaterMark: options.highWaterMark || DEFAULT_HIGH_WATER_MARK,
    });
    this.memoryThreshold = options.memoryThresholdPercent || 80;
    this.checkInterval = options.checkIntervalMs || 1000;
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void
  ): void {
    const now = Date.now();

    if (now - this.lastCheck > this.checkInterval) {
      this.lastCheck = now;
      const usage = getMemoryUsage();

      if (usage.heapUsedPercent > this.memoryThreshold) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Add small delay to allow GC to work
        setTimeout(() => {
          callback(null, chunk);
        }, 100);
        return;
      }
    }

    callback(null, chunk);
  }
}

/**
 * Progress tracking transform stream
 */
export class ProgressStream extends Transform {
  private processedBytes: number = 0;
  private totalBytes: number;
  private onProgress: (processed: number, total: number, percent: number) => void;
  private lastReportTime: number = 0;
  private reportIntervalMs: number;

  constructor(options: {
    totalBytes: number;
    onProgress: (processed: number, total: number, percent: number) => void;
    reportIntervalMs?: number;
    highWaterMark?: number;
  }) {
    super({ highWaterMark: options.highWaterMark || DEFAULT_HIGH_WATER_MARK });
    this.totalBytes = options.totalBytes;
    this.onProgress = options.onProgress;
    this.reportIntervalMs = options.reportIntervalMs || 250;
  }

  _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void
  ): void {
    this.processedBytes += chunk.length;

    const now = Date.now();
    if (now - this.lastReportTime > this.reportIntervalMs) {
      this.lastReportTime = now;
      const percent = (this.processedBytes / this.totalBytes) * 100;
      this.onProgress(this.processedBytes, this.totalBytes, percent);
    }

    callback(null, chunk);
  }

  _flush(callback: (error?: Error | null) => void): void {
    // Final progress report
    const percent = (this.processedBytes / this.totalBytes) * 100;
    this.onProgress(this.processedBytes, this.totalBytes, percent);
    callback();
  }
}

/**
 * Stream a large file with progress tracking
 */
export async function streamFileWithProgress(
  inputPath: string,
  outputPath: string,
  onProgress?: (processed: number, total: number, percent: number) => void
): Promise<void> {
  const stats = fs.statSync(inputPath);
  const totalBytes = stats.size;

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const readStream = fs.createReadStream(inputPath, {
    highWaterMark: DEFAULT_HIGH_WATER_MARK,
  });

  const writeStream = fs.createWriteStream(outputPath, {
    highWaterMark: DEFAULT_HIGH_WATER_MARK,
  });

  const streams: (Readable | Transform | Writable)[] = [readStream];

  if (onProgress) {
    streams.push(new ProgressStream({
      totalBytes,
      onProgress,
    }));
  }

  streams.push(writeStream);

  await pipelineAsync(...streams);
}

/**
 * Process file in chunks with a custom processor function
 */
export async function processFileInChunks(
  filePath: string,
  processor: (chunk: Buffer, index: number, offset: number) => Promise<Buffer | void>,
  options: StreamProcessorOptions = {}
): Promise<void> {
  const stats = fs.statSync(filePath);
  const totalBytes = stats.size;
  const bufferSize = options.bufferSize || DEFAULT_STREAM_BUFFER_SIZE;

  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, {
      highWaterMark: bufferSize,
    });

    let chunkIndex = 0;
    let bytesProcessed = 0;

    readStream.on('data', async (chunk: Buffer) => {
      readStream.pause();

      try {
        await processor(chunk, chunkIndex, bytesProcessed);

        bytesProcessed += chunk.length;
        chunkIndex++;

        if (options.onData) {
          options.onData(chunk, bytesProcessed, totalBytes);
        }

        readStream.resume();
      } catch (error) {
        readStream.destroy();
        reject(error);
      }
    });

    readStream.on('end', () => resolve());
    readStream.on('error', reject);
  });
}

/**
 * Copy file with streaming (memory efficient for large files)
 */
export async function streamCopy(
  sourcePath: string,
  destPath: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const stats = fs.statSync(sourcePath);

  // Ensure destination directory exists
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  await streamFileWithProgress(
    sourcePath,
    destPath,
    onProgress
      ? (processed, total, percent) => onProgress(percent)
      : undefined
  );
}

/**
 * Calculate recommended buffer size based on file size and available memory
 */
export function getOptimalBufferSize(fileSize: number): number {
  const memUsage = process.memoryUsage();
  const availableHeap = memUsage.heapTotal - memUsage.heapUsed;

  // Use at most 10% of available heap for buffer
  const maxBuffer = Math.floor(availableHeap * 0.1);

  // For very large files (>2GB), use larger buffers for efficiency
  if (fileSize > 2 * BYTES_PER_GB) {
    return Math.min(128 * BYTES_PER_MB, maxBuffer);
  }

  // For large files (>500MB), use 64MB buffer
  if (fileSize > 500 * BYTES_PER_MB) {
    return Math.min(64 * BYTES_PER_MB, maxBuffer);
  }

  // For medium files (>100MB), use 32MB buffer
  if (fileSize > 100 * BYTES_PER_MB) {
    return Math.min(32 * BYTES_PER_MB, maxBuffer);
  }

  // For smaller files, use 16MB buffer
  return Math.min(16 * BYTES_PER_MB, maxBuffer);
}

/**
 * Stream reader that yields chunks as async iterator
 */
export async function* readFileAsChunks(
  filePath: string,
  chunkSize: number = DEFAULT_STREAM_BUFFER_SIZE
): AsyncGenerator<{ chunk: Buffer; index: number; offset: number; totalBytes: number }> {
  const stats = fs.statSync(filePath);
  const totalBytes = stats.size;
  const fd = fs.openSync(filePath, 'r');

  let offset = 0;
  let index = 0;

  try {
    while (offset < totalBytes) {
      const readSize = Math.min(chunkSize, totalBytes - offset);
      const buffer = Buffer.alloc(readSize);
      fs.readSync(fd, buffer, 0, readSize, offset);

      yield { chunk: buffer, index, offset, totalBytes };

      offset += readSize;
      index++;
    }
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Write chunks from async iterator to file
 */
export async function writeChunksToFile(
  chunks: AsyncIterable<Buffer>,
  outputPath: string,
  onProgress?: (bytesWritten: number) => void
): Promise<number> {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(outputPath, {
    highWaterMark: DEFAULT_HIGH_WATER_MARK,
  });

  let bytesWritten = 0;

  for await (const chunk of chunks) {
    const canContinue = writeStream.write(chunk);
    bytesWritten += chunk.length;

    if (onProgress) {
      onProgress(bytesWritten);
    }

    if (!canContinue) {
      // Wait for drain event before continuing
      await new Promise((resolve) => writeStream.once('drain', resolve));
    }
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: Error | null) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return bytesWritten;
}

/**
 * Compare two large files byte-by-byte using streaming
 */
export async function compareFiles(
  filePath1: string,
  filePath2: string
): Promise<boolean> {
  const stats1 = fs.statSync(filePath1);
  const stats2 = fs.statSync(filePath2);

  // Quick size check
  if (stats1.size !== stats2.size) {
    return false;
  }

  const chunkSize = getOptimalBufferSize(stats1.size);
  const fd1 = fs.openSync(filePath1, 'r');
  const fd2 = fs.openSync(filePath2, 'r');

  try {
    let offset = 0;
    const buffer1 = Buffer.alloc(chunkSize);
    const buffer2 = Buffer.alloc(chunkSize);

    while (offset < stats1.size) {
      const readSize = Math.min(chunkSize, stats1.size - offset);

      fs.readSync(fd1, buffer1, 0, readSize, offset);
      fs.readSync(fd2, buffer2, 0, readSize, offset);

      if (!buffer1.subarray(0, readSize).equals(buffer2.subarray(0, readSize))) {
        return false;
      }

      offset += readSize;
    }

    return true;
  } finally {
    fs.closeSync(fd1);
    fs.closeSync(fd2);
  }
}

/**
 * Get file statistics including optimal processing parameters
 */
export function getFileProcessingInfo(filePath: string): {
  size: number;
  sizeFormatted: string;
  isLargeFile: boolean;
  recommendedBufferSize: number;
  estimatedChunks: number;
  memoryWarning: boolean;
} {
  const stats = fs.statSync(filePath);
  const size = stats.size;
  const recommendedBufferSize = getOptimalBufferSize(size);
  const memoryUsage = getMemoryUsage();

  const formatSize = (bytes: number): string => {
    if (bytes >= BYTES_PER_GB) {
      return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
    }
    return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  };

  return {
    size,
    sizeFormatted: formatSize(size),
    isLargeFile: size > BYTES_PER_GB,
    recommendedBufferSize,
    estimatedChunks: Math.ceil(size / recommendedBufferSize),
    memoryWarning: memoryUsage.heapUsedPercent > 70,
  };
}
