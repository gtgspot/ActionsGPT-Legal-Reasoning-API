"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Image,
  Music,
  Film,
  FileSearch,
  RefreshCw,
} from "lucide-react"
import type { VideoStatus } from "@/lib/types/video"

interface VideoProcessingStatusProps {
  videoId: string
  jobId?: string
  initialStatus?: VideoStatus
  onComplete?: () => void
}

interface ProcessingJobStatus {
  jobId: string
  videoId: string
  status: "queued" | "processing" | "completed" | "failed"
  progress: number
  stage: string
  error?: string
  startedAt?: string
  completedAt?: string
}

interface VideoDetails {
  id: string
  original_filename: string
  title: string
  status: VideoStatus
  processing_progress?: number
  processing_stage?: string
  error_message?: string
  duration_seconds?: number
  width?: number
  height?: number
  thumbnail_path?: string
}

const STATUS_CONFIG: Record<VideoStatus, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: "bg-gray-500", icon: Clock, label: "Pending" },
  uploading: { color: "bg-blue-500", icon: Loader2, label: "Uploading" },
  processing: { color: "bg-yellow-500", icon: Loader2, label: "Processing" },
  transcoding: { color: "bg-purple-500", icon: Film, label: "Transcoding" },
  generating_thumbnails: { color: "bg-pink-500", icon: Image, label: "Generating Thumbnails" },
  extracting_metadata: { color: "bg-cyan-500", icon: FileSearch, label: "Extracting Metadata" },
  completed: { color: "bg-green-500", icon: CheckCircle, label: "Complete" },
  failed: { color: "bg-red-500", icon: AlertCircle, label: "Failed" },
  cancelled: { color: "bg-gray-500", icon: AlertCircle, label: "Cancelled" },
}

const STAGE_ICONS: Record<string, typeof Clock> = {
  initializing: Clock,
  extracting_metadata: FileSearch,
  generating_thumbnails: Image,
  generating_thumbnail_grid: Image,
  transcoding: Film,
  extracting_audio: Music,
  completed: CheckCircle,
}

export function VideoProcessingStatus({
  videoId,
  jobId,
  initialStatus = "processing",
  onComplete,
}: VideoProcessingStatusProps) {
  const [status, setStatus] = useState<VideoStatus>(initialStatus)
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState("initializing")
  const [error, setError] = useState<string | null>(null)
  const [video, setVideo] = useState<VideoDetails | null>(null)
  const [isPolling, setIsPolling] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      // Fetch job status if jobId is provided
      if (jobId) {
        const jobResponse = await fetch(`/api/videos/${videoId}?job_id=${jobId}`)
        if (jobResponse.ok) {
          const jobStatus: ProcessingJobStatus = await jobResponse.json()
          setProgress(jobStatus.progress)
          setStage(jobStatus.stage)

          if (jobStatus.status === "completed") {
            setStatus("completed")
            setIsPolling(false)
            onComplete?.()
          } else if (jobStatus.status === "failed") {
            setStatus("failed")
            setError(jobStatus.error || "Processing failed")
            setIsPolling(false)
          }
        }
      }

      // Fetch video details
      const videoResponse = await fetch(`/api/videos/${videoId}`)
      if (videoResponse.ok) {
        const videoData = await videoResponse.json()
        setVideo(videoData)
        setStatus(videoData.status)

        if (videoData.status === "completed" || videoData.status === "failed") {
          setIsPolling(false)
          if (videoData.status === "completed") {
            onComplete?.()
          }
        }

        if (videoData.error_message) {
          setError(videoData.error_message)
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err)
    }
  }, [videoId, jobId, onComplete])

  useEffect(() => {
    fetchStatus()

    // Poll for updates while processing
    let interval: NodeJS.Timeout | null = null
    if (isPolling) {
      interval = setInterval(fetchStatus, 2000) // Poll every 2 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [fetchStatus, isPolling])

  const statusConfig = STATUS_CONFIG[status]
  const StatusIcon = statusConfig.icon
  const StageIcon = STAGE_ICONS[stage] || Loader2

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            <CardTitle className="text-lg">
              {video?.title || "Video Processing"}
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={`${statusConfig.color} text-white`}
          >
            <StatusIcon
              className={`mr-1 h-3 w-3 ${status === "processing" || status === "uploading" ? "animate-spin" : ""}`}
            />
            {statusConfig.label}
          </Badge>
        </div>
        {video?.original_filename && (
          <CardDescription>{video.original_filename}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Section */}
        {(status === "processing" || status === "transcoding" || status === "generating_thumbnails" || status === "extracting_metadata") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <StageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{stage.replace(/_/g, " ")}</span>
              </div>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {status === "failed" && error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Processing Failed
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Video Details (when complete) */}
        {status === "completed" && video && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Video processed successfully
              </span>
            </div>

            {/* Video metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {video.duration_seconds && (
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(video.duration_seconds)}</p>
                </div>
              )}
              {video.width && video.height && (
                <div>
                  <p className="text-muted-foreground">Resolution</p>
                  <p className="font-medium">{video.width} x {video.height}</p>
                </div>
              )}
            </div>

            {/* Thumbnail preview */}
            {video.thumbnail_path && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Thumbnail</p>
                <div className="aspect-video w-full max-w-sm bg-muted rounded-lg overflow-hidden">
                  <img
                    src={video.thumbnail_path}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Refresh Button */}
        {!isPolling && status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsPolling(true)
              fetchStatus()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
