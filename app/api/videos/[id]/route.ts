/**
 * Video API Route
 * Get video details and processing status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVideoStatus, getProcessingJobStatus } from '@/lib/video/ingestion';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/videos/[id]
 * Get video details and status
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

    const { id } = await params;

    // Check if this is a job status request
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');

    if (jobId) {
      const jobStatus = getProcessingJobStatus(jobId);
      if (!jobStatus) {
        return NextResponse.json(
          { error: 'Processing job not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(jobStatus);
    }

    // Get video status
    const video = getVideoStatus(id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/videos/[id]
 * Delete a video
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

    const { id } = await params;

    // Get video to verify ownership
    const video = getVideoStatus(id);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (video.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // In production, delete from storage and database
    // For now, just return success
    return NextResponse.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: 'Failed to delete video' },
      { status: 500 }
    );
  }
}
