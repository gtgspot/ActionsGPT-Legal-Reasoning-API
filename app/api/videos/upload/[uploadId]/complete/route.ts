/**
 * Complete Upload API Route
 * Finalizes chunked upload and starts processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeUpload, getUploadProgress, cancelUpload } from '@/lib/video/ingestion';
import type { VideoProcessingOptions } from '@/lib/types/video';

interface RouteParams {
  params: Promise<{
    uploadId: string;
  }>;
}

/**
 * POST /api/videos/upload/[uploadId]/complete
 * Complete the upload and start processing
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { uploadId } = await params;

    // Parse request body
    const body = await request.json();
    const { file_hash, processing_options } = body as {
      file_hash: string;
      processing_options?: VideoProcessingOptions;
    };

    if (!file_hash) {
      return NextResponse.json(
        { error: 'Missing file_hash' },
        { status: 400 }
      );
    }

    // Verify all chunks are uploaded
    const progress = getUploadProgress(uploadId);
    if (!progress) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    if (progress.chunksCompleted !== progress.totalChunks) {
      return NextResponse.json(
        {
          error: 'Upload not complete',
          chunks_completed: progress.chunksCompleted,
          total_chunks: progress.totalChunks,
        },
        { status: 400 }
      );
    }

    // Complete upload and start processing
    const result = await completeUpload(uploadId, file_hash, processing_options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error completing upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete upload' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/upload/[uploadId]/complete
 * Get upload progress
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { uploadId } = await params;
    const progress = getUploadProgress(uploadId);

    if (!progress) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error fetching upload progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upload progress' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/upload/[uploadId]/complete
 * Cancel an upload
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { uploadId } = await params;
    const cancelled = cancelUpload(uploadId);

    if (!cancelled) {
      return NextResponse.json(
        { error: 'Upload session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Upload cancelled' });
  } catch (error) {
    console.error('Error cancelling upload:', error);
    return NextResponse.json(
      { error: 'Failed to cancel upload' },
      { status: 500 }
    );
  }
}
