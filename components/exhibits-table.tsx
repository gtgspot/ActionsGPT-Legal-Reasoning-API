"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Download } from "lucide-react"
import Link from "next/link"

interface Exhibit {
  id: string
  exhibit_number: string
  case_number: string | null
  status: string
  created_at: string
  identity_records?: {
    original_script: string
    canonical_ascii: string
  }
}

interface ExhibitsTableProps {
  exhibits: Exhibit[]
}

export function ExhibitsTable({ exhibits }: ExhibitsTableProps) {
  if (exhibits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No exhibits found</p>
        <Button asChild>
          <Link href="/dashboard/exhibits/new">Create Your First Exhibit</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Exhibit Number</TableHead>
            <TableHead>Case Number</TableHead>
            <TableHead>Identity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exhibits.map((exhibit) => (
            <TableRow key={exhibit.id}>
              <TableCell className="font-medium">{exhibit.exhibit_number}</TableCell>
              <TableCell>{exhibit.case_number || "—"}</TableCell>
              <TableCell className="font-mono text-sm max-w-[200px] truncate">
                {exhibit.identity_records?.original_script || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    exhibit.status === "approved"
                      ? "default"
                      : exhibit.status === "pending_review"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {exhibit.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(exhibit.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/exhibits/${exhibit.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/exhibits/${exhibit.id}/download`}>
                      <Download className="h-4 w-4" />
                    </Link>
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
