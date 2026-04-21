"use client"

import type React from "react"
import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, Video, Loader2, X, CheckCircle, AlertCircle } from "lucide-react"
import type { VideoCategory, VideoAccessLevel, InitiateUploadResponse } from "@/lib/types/video"

interface VideoUploadFormProps {
  userId: string
}

type UploadStage = 'idle' | 'preparing' | 'uploading' | 'processing' | 'complete' | 'error'

interface UploadState {
  stage: UploadStage
  progress: number
  chunksCompleted: number
  totalChunks: number
  message: string
  videoId?: string
  jobId?: string
  error?: string
}

const VIDEO_CATEGORIES: { value: VideoCategory; label: string }[] = [
  { value: "evidence", label: "Evidence" },
  { value: "deposition", label: "Deposition" },
  { value: "testimony", label: "Testimony" },
  { value: "exhibit", label: "Exhibit" },
  { value: "surveillance", label: "Surveillance" },
  { value: "interview", label: "Interview" },
  { value: "presentation", label: "Presentation" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
]

const ACCESS_LEVELS: { value: VideoAccessLevel; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "internal", label: "Internal" },
  { value: "restricted", label: "Restricted" },
  { value: "confidential", label: "Confidential" },
  { value: "privileged", label: "Privileged" },
]

const SUPPORTED_FORMATS = ".mp4,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.mpeg,.mpg"

export function VideoUploadForm({ userId }: VideoUploadFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    chunksCompleted: 0,
    totalChunks: 0,
    message: '',
  })

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "evidence" as VideoCategory,
    case_number: "",
    jurisdiction: "",
    access_level: "internal" as VideoAccessLevel,
    tags: "",
    recorded_at: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadState({ stage: 'idle', progress: 0, chunksCompleted: 0, totalChunks: 0, message: '' })
      if (!formData.title) {
        setFormData((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ""),
        }))
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const calculateChunkHash = async (chunk: Blob): Promise<string> => {
    const arrayBuffer = await chunk.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const uploadChunk = async (
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
    signal: AbortSignal
  ): Promise<void> => {
    const chunkHash = await calculateChunkHash(chunk)

    const response = await fetch(`/api/videos/upload/${uploadId}/chunk/${chunkIndex}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-chunk-hash': chunkHash,
      },
      body: chunk,
      signal,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Chunk upload failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      // Stage 1: Prepare upload
      setUploadState({
        stage: 'preparing',
        progress: 0,
        chunksCompleted: 0,
        totalChunks: 0,
        message: 'Preparing upload...',
      })

      // Initiate upload
      const initiateResponse = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type || 'video/mp4',
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          case_number: formData.case_number || undefined,
          jurisdiction: formData.jurisdiction || undefined,
          access_level: formData.access_level,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : undefined,
          recorded_at: formData.recorded_at || undefined,
        }),
        signal,
      })

      if (!initiateResponse.ok) {
        const error = await initiateResponse.json()
        throw new Error(error.error || 'Failed to initiate upload')
      }

      const uploadInfo: InitiateUploadResponse = await initiateResponse.json()

      setUploadState({
        stage: 'uploading',
        progress: 0,
        chunksCompleted: 0,
        totalChunks: uploadInfo.total_chunks,
        message: `Uploading 0 of ${uploadInfo.total_chunks} chunks...`,
        videoId: uploadInfo.video_id,
      })

      // Stage 2: Upload chunks
      let completedChunks = 0
      const chunkSize = uploadInfo.chunk_size

      for (const chunkInfo of uploadInfo.chunks) {
        if (signal.aborted) {
          throw new Error('Upload cancelled')
        }

        const start = chunkInfo.start
        const end = chunkInfo.end
        const chunk = selectedFile.slice(start, end)

        // Retry logic with exponential backoff
        let retries = 3
        while (retries > 0) {
          try {
            await uploadChunk(uploadInfo.upload_id, chunkInfo.index, chunk, signal)
            break
          } catch (err) {
            retries--
            if (retries === 0) throw err
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)))
          }
        }

        completedChunks++
        const progress = (completedChunks / uploadInfo.total_chunks) * 100

        setUploadState((prev) => ({
          ...prev,
          progress,
          chunksCompleted: completedChunks,
          message: `Uploading ${completedChunks} of ${uploadInfo.total_chunks} chunks...`,
        }))
      }

      // Stage 3: Calculate file hash and complete upload
      setUploadState((prev) => ({
        ...prev,
        stage: 'processing',
        message: 'Verifying file integrity...',
      }))

      const fileHash = await calculateFileHash(selectedFile)

      const completeResponse = await fetch(`/api/videos/upload/${uploadInfo.upload_id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_hash: fileHash,
          processing_options: {
            generate_thumbnail: true,
            generate_thumbnail_grid: true,
            extract_metadata: true,
          },
        }),
        signal,
      })

      if (!completeResponse.ok) {
        const error = await completeResponse.json()
        throw new Error(error.error || 'Failed to complete upload')
      }

      const completeResult = await completeResponse.json()

      setUploadState({
        stage: 'complete',
        progress: 100,
        chunksCompleted: uploadInfo.total_chunks,
        totalChunks: uploadInfo.total_chunks,
        message: 'Upload complete! Processing video...',
        videoId: completeResult.video_id,
        jobId: completeResult.processing_job_id,
      })

      // Redirect to videos page after short delay
      setTimeout(() => {
        router.push('/dashboard/videos')
        router.refresh()
      }, 2000)

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setUploadState((prev) => ({
          ...prev,
          stage: 'idle',
          message: '',
        }))
      } else {
        setUploadState((prev) => ({
          ...prev,
          stage: 'error',
          message: error instanceof Error ? error.message : 'Upload failed',
          error: error instanceof Error ? error.message : 'Upload failed',
        }))
      }
    }
  }

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setUploadState({ stage: 'idle', progress: 0, chunksCompleted: 0, totalChunks: 0, message: '' })
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isUploading = uploadState.stage === 'preparing' || uploadState.stage === 'uploading' || uploadState.stage === 'processing'

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upload Video
        </CardTitle>
        <CardDescription>
          Upload video files up to 10GB. Supported formats: MP4, MKV, AVI, MOV, WebM, and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Selection */}
          <div className="space-y-2">
            <Label htmlFor="video-file">Video File</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                id="video-file"
                accept={SUPPORTED_FORMATS}
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
              <label
                htmlFor="video-file"
                className={`cursor-pointer flex flex-col items-center gap-2 ${isUploading ? 'opacity-50' : ''}`}
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'Click to select a video file'}
                </span>
                {selectedFile && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {uploadState.stage !== 'idle' && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {uploadState.stage === 'complete' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : uploadState.stage === 'error' ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span className="text-sm font-medium">{uploadState.message}</span>
                </div>
                {isUploading && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Progress value={uploadState.progress} className="h-2" />
              {uploadState.totalChunks > 0 && (
                <p className="text-xs text-muted-foreground text-right">
                  {uploadState.chunksCompleted} / {uploadState.totalChunks} chunks ({Math.round(uploadState.progress)}%)
                </p>
              )}
            </div>
          )}

          {/* Metadata Fields */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Video title"
                required
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value as VideoCategory }))}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="case_number">Case Number</Label>
              <Input
                id="case_number"
                value={formData.case_number}
                onChange={(e) => setFormData((prev) => ({ ...prev, case_number: e.target.value }))}
                placeholder="e.g., 2024-CV-001234"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData((prev) => ({ ...prev, jurisdiction: e.target.value }))}
                placeholder="e.g., California, Federal"
                disabled={isUploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_level">Access Level *</Label>
              <Select
                value={formData.access_level}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, access_level: value as VideoAccessLevel }))}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recorded_at">Recording Date</Label>
              <Input
                id="recorded_at"
                type="datetime-local"
                value={formData.recorded_at}
                onChange={(e) => setFormData((prev) => ({ ...prev, recorded_at: e.target.value }))}
                disabled={isUploading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter a description of the video content"
              rows={3}
              disabled={isUploading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Enter tags separated by commas"
              disabled={isUploading}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!selectedFile || isUploading || uploadState.stage === 'complete'}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : uploadState.stage === 'complete' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
            {(selectedFile || uploadState.stage === 'error') && !isUploading && uploadState.stage !== 'complete' && (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
