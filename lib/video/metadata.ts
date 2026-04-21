/**
 * Video Metadata Extraction Module
 * Uses FFprobe for efficient metadata extraction without loading entire file
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { VideoMetadata, VideoStreamInfo, VideoProcessingError } from './types';
import { METADATA_EXTRACTION_TIMEOUT, BYTES_PER_KB, BYTES_PER_MB, BYTES_PER_GB } from './constants';

interface FFProbeOutput {
  format: {
    filename: string;
    nb_streams: number;
    nb_programs: number;
    format_name: string;
    format_long_name: string;
    start_time: string;
    duration: string;
    size: string;
    bit_rate: string;
    probe_score: number;
    tags?: Record<string, string>;
  };
  streams: FFProbeStream[];
}

interface FFProbeStream {
  index: number;
  codec_name: string;
  codec_long_name: string;
  profile?: string;
  codec_type: string;
  codec_tag_string: string;
  codec_tag: string;
  width?: number;
  height?: number;
  coded_width?: number;
  coded_height?: number;
  display_aspect_ratio?: string;
  pix_fmt?: string;
  color_space?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  time_base?: string;
  duration_ts?: number;
  duration?: string;
  bit_rate?: string;
  nb_frames?: string;
  sample_rate?: string;
  channels?: number;
  channel_layout?: string;
  bits_per_sample?: number;
  tags?: Record<string, string>;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  }
  if (bytes >= BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  }
  if (bytes >= BYTES_PER_KB) {
    return `${(bytes / BYTES_PER_KB).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

/**
 * Formats duration in HH:MM:SS.ms format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(2);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
}

/**
 * Parses frame rate string (e.g., "30000/1001" or "30/1") to number
 */
function parseFrameRate(frameRateStr: string | undefined): number {
  if (!frameRateStr || frameRateStr === '0/0') return 0;

  const parts = frameRateStr.split('/');
  if (parts.length === 2) {
    const numerator = parseFloat(parts[0]);
    const denominator = parseFloat(parts[1]);
    if (denominator !== 0) {
      return Math.round((numerator / denominator) * 100) / 100;
    }
  }
  return parseFloat(frameRateStr) || 0;
}

/**
 * Calculates aspect ratio from width and height
 */
function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return 'unknown';

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioWidth = width / divisor;
  const ratioHeight = height / divisor;

  // Common aspect ratios
  const ratio = width / height;
  if (Math.abs(ratio - 16 / 9) < 0.01) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.01) return '4:3';
  if (Math.abs(ratio - 21 / 9) < 0.01) return '21:9';
  if (Math.abs(ratio - 1) < 0.01) return '1:1';

  return `${ratioWidth}:${ratioHeight}`;
}

/**
 * Check if FFprobe is available
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', ['-version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Extract metadata from video file using FFprobe
 * This is memory-efficient as it only reads file headers
 */
export async function extractMetadata(
  filePath: string,
  timeout: number = METADATA_EXTRACTION_TIMEOUT
): Promise<VideoMetadata> {
  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw createError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }

  const stats = fs.statSync(filePath);

  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    const timeoutId = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(createError('TIMEOUT', 'Metadata extraction timed out'));
    }, timeout);

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(createError('FFMPEG_NOT_FOUND', 'FFprobe is not installed'));
      } else {
        reject(createError('PROCESSING_FAILED', err.message));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', stderr || 'FFprobe failed'));
        return;
      }

      try {
        const probeData: FFProbeOutput = JSON.parse(stdout);
        const metadata = parseProbeOutput(probeData, filePath, stats);
        resolve(metadata);
      } catch (err) {
        reject(createError('INVALID_FORMAT', 'Failed to parse video metadata'));
      }
    });
  });
}

/**
 * Parse FFprobe output into VideoMetadata
 */
function parseProbeOutput(
  probe: FFProbeOutput,
  filePath: string,
  stats: fs.Stats
): VideoMetadata {
  const videoStream = probe.streams.find((s) => s.codec_type === 'video');
  const audioStream = probe.streams.find((s) => s.codec_type === 'audio');

  if (!videoStream) {
    throw createError('INVALID_FORMAT', 'No video stream found in file');
  }

  const duration = parseFloat(probe.format.duration) || 0;
  const fileSize = parseInt(probe.format.size, 10) || stats.size;

  return {
    // Basic info
    filename: path.basename(filePath),
    filepath: filePath,
    fileSize,
    fileSizeFormatted: formatFileSize(fileSize),

    // Video stream
    duration,
    durationFormatted: formatDuration(duration),
    width: videoStream.width || 0,
    height: videoStream.height || 0,
    aspectRatio: videoStream.display_aspect_ratio ||
      calculateAspectRatio(videoStream.width || 0, videoStream.height || 0),
    frameRate: parseFrameRate(videoStream.r_frame_rate || videoStream.avg_frame_rate),
    bitrate: parseInt(videoStream.bit_rate || '0', 10),
    codec: videoStream.codec_name,
    codecLongName: videoStream.codec_long_name,
    pixelFormat: videoStream.pix_fmt || 'unknown',
    colorSpace: videoStream.color_space,

    // Audio stream
    hasAudio: !!audioStream,
    audioCodec: audioStream?.codec_name,
    audioChannels: audioStream?.channels,
    audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : undefined,
    audioBitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate, 10) : undefined,

    // Container info
    format: probe.format.format_name,
    formatLongName: probe.format.format_long_name,
    containerBitrate: parseInt(probe.format.bit_rate || '0', 10),

    // Timestamps
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}

/**
 * Extract all stream information from video file
 */
export async function extractStreams(filePath: string): Promise<VideoStreamInfo[]> {
  if (!fs.existsSync(filePath)) {
    throw createError('FILE_NOT_FOUND', `File not found: ${filePath}`);
  }

  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('error', (err) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(createError('FFMPEG_NOT_FOUND', 'FFprobe is not installed'));
      } else {
        reject(createError('PROCESSING_FAILED', err.message));
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', 'FFprobe failed'));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const streams: VideoStreamInfo[] = data.streams.map((s: FFProbeStream) => ({
          index: s.index,
          codecName: s.codec_name,
          codecLongName: s.codec_long_name,
          codecType: s.codec_type as VideoStreamInfo['codecType'],
          profile: s.profile,
          width: s.width,
          height: s.height,
          frameRate: parseFrameRate(s.r_frame_rate || s.avg_frame_rate),
          bitrate: s.bit_rate ? parseInt(s.bit_rate, 10) : undefined,
          channels: s.channels,
          sampleRate: s.sample_rate ? parseInt(s.sample_rate, 10) : undefined,
          duration: s.duration ? parseFloat(s.duration) : undefined,
        }));
        resolve(streams);
      } catch {
        reject(createError('INVALID_FORMAT', 'Failed to parse stream data'));
      }
    });
  });
}

/**
 * Quick check if file is a valid video
 */
export async function isValidVideo(filePath: string): Promise<boolean> {
  try {
    const metadata = await extractMetadata(filePath);
    return metadata.width > 0 && metadata.height > 0 && metadata.duration > 0;
  } catch {
    return false;
  }
}

/**
 * Get video duration without full metadata extraction
 */
export async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    const proc = spawn('ffprobe', args);
    let stdout = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.on('error', (err) => {
      reject(createError('PROCESSING_FAILED', err.message));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(createError('PROCESSING_FAILED', 'Failed to get duration'));
        return;
      }
      resolve(parseFloat(stdout.trim()) || 0);
    });
  });
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
