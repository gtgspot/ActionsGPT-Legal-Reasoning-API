"use client"

import type { IdentityRecord } from "@/lib/types/identity"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, Edit } from "lucide-react"

interface IdentityTableProps {
  identities: IdentityRecord[]
}

export function IdentityTable({ identities }: IdentityTableProps) {
  if (identities.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No identity records found</p>
        <Button asChild>
          <Link href="/dashboard/identities/new">Create Your First Identity</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Original Script</TableHead>
            <TableHead>Canonical ASCII</TableHead>
            <TableHead>Script</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {identities.map((identity) => (
            <TableRow key={identity.id}>
              <TableCell className="font-medium font-mono">{identity.original_script}</TableCell>
              <TableCell className="font-mono">{identity.canonical_ascii}</TableCell>
              <TableCell>
                <Badge variant="outline">{identity.script_code}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{identity.language_code}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    identity.status === "active" ? "default" : identity.status === "archived" ? "secondary" : "outline"
                  }
                >
                  {identity.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(identity.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/identities/${identity.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/identities/${identity.id}/edit`}>
                      <Edit className="h-4 w-4" />
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
