"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, XCircle, Eye } from "lucide-react"
import Link from "next/link"

interface TestResult {
  id: string
  identity_id: string
  test_timestamp: string
  test_type: string
  passed: boolean
  original_input: string
  final_output: string
  character_loss_rate: number
  diacritic_loss_rate: number
  script_conversion_errors: number
  byte_differences: number
  identity_records?: {
    original_script: string
    canonical_ascii: string
  }
}

interface TestResultsTableProps {
  tests: TestResult[]
}

export function TestResultsTable({ tests }: TestResultsTableProps) {
  if (tests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No test results found</p>
        <Button asChild>
          <Link href="/dashboard/testing/run">Run Your First Test</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Test Type</TableHead>
            <TableHead>Identity</TableHead>
            <TableHead>Char Loss</TableHead>
            <TableHead>Diacritic Loss</TableHead>
            <TableHead>Errors</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tests.map((test) => (
            <TableRow key={test.id}>
              <TableCell>
                {test.passed ? (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Passed</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{test.test_type}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm max-w-[200px] truncate">
                {test.identity_records?.original_script || test.original_input}
              </TableCell>
              <TableCell>
                <span className={test.character_loss_rate > 0 ? "text-destructive font-medium" : ""}>
                  {test.character_loss_rate.toFixed(2)}%
                </span>
              </TableCell>
              <TableCell>
                <span className={test.diacritic_loss_rate > 0 ? "text-destructive font-medium" : ""}>
                  {test.diacritic_loss_rate.toFixed(2)}%
                </span>
              </TableCell>
              <TableCell>
                <span className={test.script_conversion_errors > 0 ? "text-destructive font-medium" : ""}>
                  {test.script_conversion_errors}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(test.test_timestamp).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/dashboard/testing/${test.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
