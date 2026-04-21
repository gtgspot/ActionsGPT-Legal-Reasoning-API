/**
 * Video Upload API Route
 * Handles initiation of chunked video uploads
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { initiateUpload, getActiveUploads } from '@/lib/video/ingestion';
import type { InitiateUploadRequest } from '@/lib/types/video';

/**
 * POST /api/videos/upload
 * Initiate a new chunked video upload
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body: InitiateUploadRequest = await request.json();

    // Validate required fields
    if (!body.filename || !body.file_size || !body.mime_type || !body.title || !body.category || !body.access_level) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, file_size, mime_type, title, category, access_level' },
        { status: 400 }
      );
    }

    // Validate file size (max 10GB)
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    if (body.file_size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (10GB)` },
        { status: 400 }
      );
    }

    // Initiate upload
    const uploadResponse = await initiateUpload(body, user.id);

    return NextResponse.json(uploadResponse, { status: 201 });
  } catch (error) {
    console.error('Error initiating video upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate upload' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/videos/upload
 * Get active uploads for current user
 */
export async function GET() {
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

    const activeUploads = getActiveUploads(user.id);

    return NextResponse.json({ uploads: activeUploads });
  } catch (error) {
    console.error('Error fetching active uploads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active uploads' },
      { status: 500 }
    );
  }
}
