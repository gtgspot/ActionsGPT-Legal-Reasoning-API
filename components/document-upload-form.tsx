"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { generateSHA256, generateMD5 } from "@/lib/utils/crypto"

interface DocumentUploadFormProps {
  userId: string
}

export function DocumentUploadForm({ userId }: DocumentUploadFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    document_type: "act",
    category: "",
    jurisdiction: "",
    access_level: "internal",
    tags: "",
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // Auto-fill title from filename if empty
      if (!formData.title) {
        setFormData((prev) => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ""),
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Read file as ArrayBuffer for hashing
      const arrayBuffer = await selectedFile.arrayBuffer()
      const sha256Hash = await generateSHA256(arrayBuffer)
      const md5Hash = await generateMD5(arrayBuffer)

      const bucket = formData.document_type === "act" ? "acts" : "regulations"

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${selectedFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, selectedFile)

      if (uploadError) {
        throw uploadError
      }

      // Insert document metadata into database
      const { error: insertError } = await supabase.from("regulatory_documents").insert({
        document_name: selectedFile.name,
        document_type: formData.document_type,
        file_extension: selectedFile.name.split(".").pop() || "",
        storage_bucket: bucket,
        storage_path: uploadData.path,
        file_size_bytes: selectedFile.size,
        mime_type: selectedFile.type,
        title: formData.title,
        description: formData.description || null,
        jurisdiction: formData.jurisdiction || null,
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
        sha256_hash: sha256Hash,
        md5_hash: md5Hash,
        access_level: formData.access_level,
        created_by: userId,
        modified_by: userId,
        status: "active",
      })

      if (insertError) {
        throw insertError
      }

      router.push("/dashboard/documents")
      router.refresh()
    } catch (error) {
      console.error("Error uploading document:", error)
      alert("Failed to upload document. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Document Information</CardTitle>
          <CardDescription>Provide details about the regulatory document you're uploading</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file">Document File *</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file"
                type="file"
                accept=".docx,.doc,.pdf,.txt"
                onChange={handleFileChange}
                required
                className="flex-1"
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Accepted formats: .docx, .doc, .pdf, .txt (Max 50MB)</p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Immigration and Nationality Act Section 212"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the document contents..."
              rows={3}
            />
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, document_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="act">Act (Legislative Act)</SelectItem>
                <SelectItem value="regulation">Regulation</SelectItem>
                <SelectItem value="statute">Statute</SelectItem>
                <SelectItem value="case_law">Case Law</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="guideline">Guideline</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Acts will be stored in the 'acts' bucket, all other types in 'regulations' bucket
            </p>
          </div>

          {/* Category and Jurisdiction */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Immigration, Criminal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Input
                id="jurisdiction"
                value={formData.jurisdiction}
                onChange={(e) => setFormData((prev) => ({ ...prev, jurisdiction: e.target.value }))}
                placeholder="e.g., Federal, California"
              />
            </div>
          </div>

          {/* Access Level */}
          <div className="space-y-2">
            <Label htmlFor="access_level">Access Level *</Label>
            <Select
              value={formData.access_level}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, access_level: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="immigration, visa, h1b (comma-separated)"
            />
            <p className="text-xs text-muted-foreground">Separate multiple tags with commas</p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedFile || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
