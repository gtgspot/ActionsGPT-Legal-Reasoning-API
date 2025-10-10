"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Eye, FileText, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"
import type { RegulatoryDocument } from "@/lib/types/document"

interface DocumentsTableProps {
  documents: RegulatoryDocument[]
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "draft":
        return "secondary"
      case "archived":
        return "outline"
      case "superseded":
        return "destructive"
      default:
        return "default"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "regulation":
        return "bg-blue-500/10 text-blue-500"
      case "statute":
        return "bg-purple-500/10 text-purple-500"
      case "case_law":
        return "bg-green-500/10 text-green-500"
      case "policy":
        return "bg-orange-500/10 text-orange-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Upload your first regulatory document to get started</p>
        <Link href="/dashboard/documents/upload">
          <Button>Upload Document</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Jurisdiction</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{doc.document_name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={getTypeColor(doc.document_type)}>
                  {doc.document_type}
                </Badge>
              </TableCell>
              <TableCell>{doc.category || "—"}</TableCell>
              <TableCell>{doc.jurisdiction || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.file_size_bytes)}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(doc.status)}>{doc.status}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
