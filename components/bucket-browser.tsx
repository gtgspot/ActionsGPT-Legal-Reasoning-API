"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Download, FileText, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"

interface BucketFile {
  name: string
  id: string
  updated_at?: string
  created_at?: string
  last_accessed_at?: string
  metadata?: {
    size?: number
    mimetype?: string
  }
}

interface BucketBrowserProps {
  bucket: string
  files: BucketFile[]
}

export function BucketBrowser({ bucket, files }: BucketBrowserProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const supabase = createClient()

  const handleDownload = async (fileName: string) => {
    setDownloading(fileName)
    try {
      const { data, error } = await supabase.storage.from(bucket).download(fileName)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading file:", error)
      alert("Failed to download file")
    } finally {
      setDownloading(null)
    }
  }

  const handleView = async (fileName: string) => {
    try {
      const { data } = await supabase.storage.from(bucket).getPublicUrl(fileName)
      window.open(data.publicUrl, "_blank")
    } catch (error) {
      console.error("Error viewing file:", error)
      alert("Failed to view file")
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    return `${kb.toFixed(2)} KB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No files found</h3>
        <p className="text-muted-foreground">The {bucket} bucket is empty</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {file.name}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{file.metadata?.mimetype || "Unknown"}</Badge>
              </TableCell>
              <TableCell>{formatFileSize(file.metadata?.size)}</TableCell>
              <TableCell>{formatDate(file.updated_at || file.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleView(file.name)} title="View file">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(file.name)}
                    disabled={downloading === file.name}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
