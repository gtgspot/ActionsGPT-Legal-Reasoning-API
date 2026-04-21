/**
 * Video Chunk Upload API Route
 * Handles individual chunk uploads for large video files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadChunk } from '@/lib/video/ingestion';

interface RouteParams {
  params: Promise<{
    uploadId: string;
    chunkIndex: string;
  }>;
}

/**
 * POST /api/videos/upload/[uploadId]/chunk/[chunkIndex]
 * Upload a single chunk of a video file
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

    const { uploadId, chunkIndex } = await params;
    const chunkIndexNum = parseInt(chunkIndex, 10);

    if (isNaN(chunkIndexNum) || chunkIndexNum < 0) {
      return NextResponse.json(
        { error: 'Invalid chunk index' },
        { status: 400 }
      );
    }

    // Get chunk hash from header
    const chunkHash = request.headers.get('x-chunk-hash');
    if (!chunkHash) {
      return NextResponse.json(
        { error: 'Missing x-chunk-hash header' },
        { status: 400 }
      );
    }

    // Read chunk data from request body
    const arrayBuffer = await request.arrayBuffer();
    const chunkData = Buffer.from(arrayBuffer);

    if (chunkData.length === 0) {
      return NextResponse.json(
        { error: 'Empty chunk data' },
        { status: 400 }
      );
    }

    // Upload chunk
    const result = await uploadChunk(uploadId, chunkIndexNum, chunkData, chunkHash);

    return NextResponse.json({
      success: result.success,
      chunks_completed: result.chunksCompleted,
      total_chunks: result.totalChunks,
      progress: result.progress,
    });
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload chunk' },
      { status: 500 }
    );
  }
}
