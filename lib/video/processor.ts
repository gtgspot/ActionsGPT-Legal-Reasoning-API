/**
 * Video Processor Module
 * Core FFmpeg integration for transcoding and manipulation of large video files
 * Optimized for memory efficiency with streaming and progress tracking
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type {
  TranscodeOptions,
  ThumbnailOptions,
  ThumbnailGridOptions,
  ProcessingProgress,
  ProcessingStage,
  VideoProcessingError,
  CompressionPreset,
} from './types';
import { COMPRESSION_PRESETS } from './types';
import {
  DEFAULT_PROCESSING_TIMEOUT,
  LARGE_FILE_PROCESSING_TIMEOUT,
  THUMBNAIL_GENERATION_TIMEOUT,
  BYTES_PER_GB,
  VIDEO_RESOLUTIONS,
} from './constants';
import { extractMetadata, formatFileSize } from './metadata';

interface ActiveProcess {
  process: ChildProcess;
  cancelled: boolean;
}

// Track active processes for cancellation support
const activeProcesses = new Map<string, ActiveProcess>();

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Check available hardware acceleration options
 */
export async function detectHardwareAcceleration(): Promise<string[]> {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-hwaccels']);
    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('error', () => resolve([]));
    proc.on('close', () => {
      const lines = stdout.split('\n').slice(1); // Skip header
      const hwaccels = lines
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      resolve(hwaccels);
    });
  });
}

/**
 * Parse FFmpeg progress output
 */
function parseProgress(
  line: string,
  totalDuration: number,
  stage: ProcessingStage
): ProcessingProgress | null {
  // FFmpeg progress format: frame=123 fps=30 q=28.0 size=1234kB time=00:00:05.00 bitrate=2000kbps speed=1.5x
  const frameMatch = line.match(/frame=\s*(\d+)/);
  const fpsMatch = line.match(/fps=\s*([\d.]+)/);
  const sizeMatch = line.match(/size=\s*(\d+)kB/);
  const timeMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
  const speedMatch = line.match(/speed=\s*([\d.]+)x/);

  if (!timeMatch) return null;

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = parseInt(timeMatch[3], 10);
  const centiseconds = parseInt(timeMatch[4], 10);
  const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

  const percent = totalDuration > 0 ? Math.min((currentTime / totalDuration) * 100, 100) : 0;
  const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 0;
  const speed = speedMatch ? parseFloat(speedMatch[1]) : 0;
  const bitrate = bitrateMatch ? parseFloat(bitrateMatch[1]) : 0;
  const size = sizeMatch ? parseInt(sizeMatch[1], 10) * 1024 : 0;

  const remainingTime = totalDuration - currentTime;
  const eta = speed > 0 ? remainingTime / speed : 0;

  return {
    percent: Math.round(percent * 100) / 100,
    currentTime,
    totalTime: totalDuration,
    fps,
    speed,
    bitrate,
    size,
    eta,
    stage,
  };
}

/**
 * Build FFmpeg arguments for transcoding
 */
function buildTranscodeArgs(inputPath: string, options: TranscodeOptions): string[] {
  const args: string[] = ['-y']; // Overwrite output

  // Hardware acceleration
  if (options.hwAccel && options.hwAccel !== 'none') {
    args.push('-hwaccel', options.hwAccel === 'auto' ? 'auto' : options.hwAccel);
  }

  // Input file
  if (options.startTime !== undefined) {
    args.push('-ss', options.startTime.toString());
  }
  args.push('-i', inputPath);

  // Duration/end time
  if (options.duration !== undefined) {
    args.push('-t', options.duration.toString());
  } else if (options.endTime !== undefined && options.startTime !== undefined) {
    args.push('-t', (options.endTime - options.startTime).toString());
  }

  // Video codec and settings
  if (options.videoCodec === 'copy') {
    args.push('-c:v', 'copy');
  } else if (options.videoCodec) {
    const codecMap: Record<string, string> = {
      h264: 'libx264',
      h265: 'libx265',
      vp9: 'libvpx-vp9',
      av1: 'libaom-av1',
    };
    args.push('-c:v', codecMap[options.videoCodec] || options.videoCodec);

    // Quality settings
    if (options.crf !== undefined) {
      args.push('-crf', options.crf.toString());
    }
    if (options.videoBitrate) {
      args.push('-b:v', options.videoBitrate);
    }
    if (options.maxBitrate) {
      args.push('-maxrate', options.maxBitrate);
    }
    if (options.bufferSize) {
      args.push('-bufsize', options.bufferSize);
    }
    if (options.preset) {
      args.push('-preset', options.preset);
    }
  }

  // Resolution scaling
  if (options.width || options.height) {
    const width = options.width || -2; // -2 maintains aspect ratio with even number
    const height = options.height || -2;
    args.push('-vf', `scale=${width}:${height}`);
  }

  // Frame rate
  if (options.frameRate) {
    args.push('-r', options.frameRate.toString());
  }

  // Audio codec and settings
  if (options.audioCodec === 'none') {
    args.push('-an');
  } else if (options.audioCodec === 'copy') {
    args.push('-c:a', 'copy');
  } else if (options.audioCodec) {
    const audioCodecMap: Record<string, string> = {
      aac: 'aac',
      mp3: 'libmp3lame',
      opus: 'libopus',
    };
    args.push('-c:a', audioCodecMap[options.audioCodec] || options.audioCodec);

    if (options.audioBitrate) {
      args.push('-b:a', options.audioBitrate);
    }
    if (options.audioSampleRate) {
      args.push('-ar', options.audioSampleRate.toString());
    }
    if (options.audioChannels) {
      args.push('-ac', options.audioChannels.toString());
    }
  }

  // Threading
  if (options.threads) {
    args.push('-threads', options.threads.toString());
  }

  // Fast start for web streaming
  if (options.fastStart) {
    args.push('-movflags', '+faststart');
  }

  // Progress reporting
  args.push('-progress', 'pipe:1');
  args.push('-stats_period', '0.5');

  // Output file
  args.push(options.outputPath);

  return args;
}

/**
 * Transcode video file with progress tracking
 * Optimized for large files with streaming output
 */
export async function transcode(
  inputPath: string,
  options: TranscodeOptions
): Promise<{ outputPath: string; duration: number; size: number }> {
  // Validate input file
  if (!fs.existsSync(inputPath)) {
    throw createError('FILE_NOT_FOUND', `Input file not found: ${inputPath}`);
  }

  // Get input metadata for progress tracking
  const metadata = await extractMetadata(inputPath);
  const totalDuration = options.duration ||
    (options.endTime && options.startTime
      ? options.endTime - options.startTime
      : metadata.duration);

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Determine timeout based on file size
  const timeout = metadata.fileSize > 2 * BYTES_PER_GB
    ? LARGE_FILE_PROCESSING_TIMEOUT
    : DEFAULT_PROCESSING_TIMEOUT;

  const processId = `transcode-${Date.now()}`;
  const args = buildTranscodeArgs(inputPath, options);

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    activeProcesses.set(processId, { process: proc, cancelled: false });

    let stderr = '';
    let stage: ProcessingStage = 'initializing';

    const timeoutId = setTimeout(() => {
      const activeProc = activeProcesses.get(processId);
      if (activeProc) {
        activeProc.cancelled = true;
        proc.kill('SIGKILL');
      }
      reject(createError('TIMEOUT', 'Transcoding timed out'));
    }, timeout);

    // Parse progress from stdout (due to -progress pipe:1)
    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('out_time=')) {
          stage = 'encoding';
          // Parse progress output format
          const timeMatch = line.match(/out_time_ms=(\d+)/);
          if (timeMatch && options.onProgress) {
            const currentTimeMs = parseInt(timeMatch[1], 10);
            const currentTime = currentTimeMs / 1000000;
            const percent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

            options.onProgress({
              percent: Math.min(Math.round(percent * 100) / 100, 100),
              currentTime,
              totalTime: totalDuration,
              fps: 0,
              speed: 0,
              bitrate: 0,
              size: 0,
              eta: 0,
              stage,
            });
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;

      // Parse progress from stderr (fallback)
      if (options.onProgress) {
        const progress = parseProgress(output, totalDuration, stage);
        if (progress) {
          options.onProgress(progress);
        }
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      activeProcesses.delete(processId);

      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(createError('FFMPEG_NOT_FOUND', 'FFmpeg is not installed'));
      } else {
        reject(createError('PROCESSING_FAILED', err.message));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const activeProc = activeProcesses.get(processId);
      activeProcesses.delete(processId);

      if (activeProc?.cancelled) {
        reject(createError('CANCELLED', 'Processing was cancelled'));
        return;
      }

      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', `FFmpeg exited with code ${code}`, stderr));
        return;
      }

      // Get output file info
      const outputStats = fs.statSync(options.outputPath);

      if (options.onProgress) {
        options.onProgress({
          percent: 100,
          currentTime: totalDuration,
          totalTime: totalDuration,
          fps: 0,
          speed: 0,
          bitrate: 0,
          size: outputStats.size,
          eta: 0,
          stage: 'complete',
        });
      }

      resolve({
        outputPath: options.outputPath,
        duration: totalDuration,
        size: outputStats.size,
      });
    });
  });
}

/**
 * Transcode using a compression preset
 */
export async function transcodeWithPreset(
  inputPath: string,
  outputPath: string,
  presetName: keyof typeof COMPRESSION_PRESETS | CompressionPreset,
  onProgress?: TranscodeOptions['onProgress']
): Promise<{ outputPath: string; duration: number; size: number }> {
  const preset = typeof presetName === 'string'
    ? COMPRESSION_PRESETS[presetName]
    : presetName;

  if (!preset) {
    throw createError('PROCESSING_FAILED', `Unknown preset: ${presetName}`);
  }

  const options: TranscodeOptions = {
    outputPath,
    videoCodec: preset.videoCodec,
    videoBitrate: preset.videoBitrate,
    crf: preset.crf,
    preset: preset.preset,
    audioCodec: preset.audioCodec,
    audioBitrate: preset.audioBitrate,
    width: preset.maxWidth,
    height: preset.maxHeight,
    fastStart: true,
    onProgress,
  };

  return transcode(inputPath, options);
}

/**
 * Generate a single thumbnail from video
 */
export async function generateThumbnail(
  inputPath: string,
  options: ThumbnailOptions
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw createError('FILE_NOT_FOUND', `Input file not found: ${inputPath}`);
  }

  // Get video duration if timestamp not specified
  let timestamp = options.timestamp;
  if (timestamp === undefined) {
    const metadata = await extractMetadata(inputPath);
    timestamp = metadata.duration * 0.1; // 10% into video
  }

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const args = [
    '-y',
    '-ss', timestamp.toString(),
    '-i', inputPath,
    '-vframes', '1',
  ];

  // Resolution
  if (options.width || options.height) {
    const width = options.width || -2;
    const height = options.height || -2;
    args.push('-vf', `scale=${width}:${height}`);
  }

  // Quality
  if (options.quality && options.format !== 'png') {
    args.push('-q:v', options.quality.toString());
  }

  args.push(options.outputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    const timeoutId = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(createError('TIMEOUT', 'Thumbnail generation timed out'));
    }, THUMBNAIL_GENERATION_TIMEOUT);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(createError('FFMPEG_NOT_FOUND', 'FFmpeg is not installed'));
      } else {
        reject(createError('PROCESSING_FAILED', err.message));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', `Thumbnail generation failed`, stderr));
        return;
      }
      resolve(options.outputPath);
    });
  });
}

/**
 * Generate a thumbnail grid (sprite sheet) from video
 * Useful for video preview scrubbing
 */
export async function generateThumbnailGrid(
  inputPath: string,
  options: ThumbnailGridOptions
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw createError('FILE_NOT_FOUND', `Input file not found: ${inputPath}`);
  }

  const metadata = await extractMetadata(inputPath);
  const columns = options.columns || 5;
  const rows = options.rows || 5;
  const totalThumbnails = columns * rows;
  const interval = options.interval || metadata.duration / totalThumbnails;
  const thumbWidth = options.width || 160;
  const thumbHeight = options.height || 90;

  // Ensure output directory exists
  const outputDir = path.dirname(options.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Build complex filter for thumbnail grid
  const filter = [
    `fps=1/${interval}`,
    `scale=${thumbWidth}:${thumbHeight}`,
    `tile=${columns}x${rows}`,
  ].join(',');

  const args = [
    '-y',
    '-i', inputPath,
    '-frames:v', '1',
    '-vf', filter,
  ];

  if (options.quality) {
    args.push('-q:v', options.quality.toString());
  }

  args.push(options.outputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    const timeoutId = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(createError('TIMEOUT', 'Thumbnail grid generation timed out'));
    }, THUMBNAIL_GENERATION_TIMEOUT);

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(createError('PROCESSING_FAILED', err.message));
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', `Thumbnail grid generation failed`, stderr));
        return;
      }
      resolve(options.outputPath);
    });
  });
}

/**
 * Extract audio from video
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string,
  options: {
    codec?: 'aac' | 'mp3' | 'opus' | 'flac';
    bitrate?: string;
    onProgress?: TranscodeOptions['onProgress'];
  } = {}
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw createError('FILE_NOT_FOUND', `Input file not found: ${inputPath}`);
  }

  const metadata = await extractMetadata(inputPath);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const codecMap: Record<string, string> = {
    aac: 'aac',
    mp3: 'libmp3lame',
    opus: 'libopus',
    flac: 'flac',
  };

  const args = [
    '-y',
    '-i', inputPath,
    '-vn', // No video
    '-c:a', codecMap[options.codec || 'aac'] || 'aac',
  ];

  if (options.bitrate) {
    args.push('-b:a', options.bitrate);
  }

  args.push('-progress', 'pipe:1');
  args.push(outputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    proc.stdout.on('data', (data) => {
      if (options.onProgress) {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          if (line.includes('out_time_ms=')) {
            const timeMatch = line.match(/out_time_ms=(\d+)/);
            if (timeMatch) {
              const currentTime = parseInt(timeMatch[1], 10) / 1000000;
              const percent = (currentTime / metadata.duration) * 100;
              options.onProgress({
                percent: Math.min(Math.round(percent * 100) / 100, 100),
                currentTime,
                totalTime: metadata.duration,
                fps: 0,
                speed: 0,
                bitrate: 0,
                size: 0,
                eta: 0,
                stage: 'encoding',
              });
            }
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(createError('PROCESSING_FAILED', err.message));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', `Audio extraction failed`, stderr));
        return;
      }
      resolve(outputPath);
    });
  });
}

/**
 * Trim video to specified time range
 */
export async function trimVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
  options: {
    reencode?: boolean;
    onProgress?: TranscodeOptions['onProgress'];
  } = {}
): Promise<string> {
  const transcodeOptions: TranscodeOptions = {
    outputPath,
    startTime,
    endTime,
    videoCodec: options.reencode ? 'h264' : 'copy',
    audioCodec: options.reencode ? 'aac' : 'copy',
    fastStart: true,
    onProgress: options.onProgress,
  };

  await transcode(inputPath, transcodeOptions);
  return outputPath;
}

/**
 * Concatenate multiple video files
 */
export async function concatenateVideos(
  inputPaths: string[],
  outputPath: string,
  options: {
    reencode?: boolean;
    onProgress?: TranscodeOptions['onProgress'];
  } = {}
): Promise<string> {
  if (inputPaths.length === 0) {
    throw createError('PROCESSING_FAILED', 'No input files provided');
  }

  // Validate all input files exist
  for (const inputPath of inputPaths) {
    if (!fs.existsSync(inputPath)) {
      throw createError('FILE_NOT_FOUND', `Input file not found: ${inputPath}`);
    }
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create concat file list
  const concatListPath = path.join(outputDir, `concat-${Date.now()}.txt`);
  const concatList = inputPaths.map((p) => `file '${p}'`).join('\n');
  fs.writeFileSync(concatListPath, concatList);

  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
  ];

  if (options.reencode) {
    args.push('-c:v', 'libx264', '-crf', '23', '-preset', 'medium');
    args.push('-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-c', 'copy');
  }

  args.push('-movflags', '+faststart');
  args.push(outputPath);

  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      fs.unlinkSync(concatListPath);
      reject(createError('PROCESSING_FAILED', err.message));
    });

    proc.on('close', (code) => {
      fs.unlinkSync(concatListPath);
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', `Concatenation failed`, stderr));
        return;
      }
      resolve(outputPath);
    });
  });
}

/**
 * Cancel an active processing operation
 */
export function cancelProcessing(processId: string): boolean {
  const activeProc = activeProcesses.get(processId);
  if (activeProc) {
    activeProc.cancelled = true;
    activeProc.process.kill('SIGTERM');
    return true;
  }
  return false;
}

/**
 * Get list of active processing operations
 */
export function getActiveProcesses(): string[] {
  return Array.from(activeProcesses.keys());
}

/**
 * Create a VideoProcessingError object
 */
function createError(
  code: VideoProcessingError['code'],
  message: string,
  details?: string
): VideoProcessingError {
  return { code, message, details };
}
