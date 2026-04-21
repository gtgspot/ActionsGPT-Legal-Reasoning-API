import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Video, Clock, CheckCircle, AlertCircle, Film, HardDrive } from "lucide-react"
import { getActiveUploads } from "@/lib/video/ingestion"
import type { VideoStatus } from "@/lib/types/video"

const STATUS_CONFIG: Record<VideoStatus, { color: string; label: string }> = {
  pending: { color: "bg-gray-500", label: "Pending" },
  uploading: { color: "bg-blue-500", label: "Uploading" },
  processing: { color: "bg-yellow-500", label: "Processing" },
  transcoding: { color: "bg-purple-500", label: "Transcoding" },
  generating_thumbnails: { color: "bg-pink-500", label: "Thumbnails" },
  extracting_metadata: { color: "bg-cyan-500", label: "Metadata" },
  completed: { color: "bg-green-500", label: "Complete" },
  failed: { color: "bg-red-500", label: "Failed" },
  cancelled: { color: "bg-gray-500", label: "Cancelled" },
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }
  return `${(bytes / 1024).toFixed(2)} KB`
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

export default async function VideosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get active uploads for this user
  const activeUploads = getActiveUploads(user.id)

  // In production, fetch from database
  // const { data: videos } = await supabase.from("videos").select("*").order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Video Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload, process, and manage video files for legal proceedings
          </p>
        </div>
        <Link href="/dashboard/videos/upload">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUploads.length}</div>
            <p className="text-xs text-muted-foreground">In current session</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUploads.filter((u) => u.status === "processing" || u.status === "uploading").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently in queue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUploads.filter((u) => u.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Ready for use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUploads.filter((u) => u.status === "failed").length}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Uploads / Videos List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Videos</CardTitle>
          <CardDescription>
            Videos uploaded during this session. In production, this would show all videos from the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeUploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No videos yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Upload your first video to get started
              </p>
              <Link href="/dashboard/videos/upload">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Video
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activeUploads.map((upload) => {
                const statusConfig = STATUS_CONFIG[upload.status as VideoStatus] || STATUS_CONFIG.pending
                return (
                  <div
                    key={upload.uploadId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-muted rounded-lg flex items-center justify-center">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{upload.filename}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {upload.videoId.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {Math.round(upload.progress)}%
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`${statusConfig.color} text-white`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Formats Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Supported Formats
          </CardTitle>
          <CardDescription>
            The video processing module supports the following formats and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Video Formats</h4>
              <div className="flex flex-wrap gap-1">
                {["MP4", "MKV", "AVI", "MOV", "WebM", "WMV", "FLV", "MPEG"].map((format) => (
                  <Badge key={format} variant="outline">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Processing Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Automatic thumbnail generation</li>
                <li>Thumbnail grid/sprite sheets</li>
                <li>Metadata extraction</li>
                <li>Format transcoding</li>
                <li>Audio extraction</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Size Limits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Maximum file size: 10 GB</li>
                <li>Chunked upload for large files</li>
                <li>Resumable uploads supported</li>
                <li>Integrity verification (SHA-256)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
