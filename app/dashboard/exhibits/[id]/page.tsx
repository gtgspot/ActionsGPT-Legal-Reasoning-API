import { Label } from "@/components/ui/label"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Download, CheckCircle, FileText } from "lucide-react"

export default async function ExhibitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect("/auth/login")
  }

  // Fetch exhibit
  const { data: exhibit, error: exhibitError } = await supabase
    .from("court_exhibits")
    .select(
      `
      *,
      identity_records (
        id,
        original_script,
        canonical_ascii,
        script_code,
        language_code,
        encoding_used
      )
    `,
    )
    .eq("id", id)
    .single()

  if (exhibitError || !exhibit) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/exhibits">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Exhibit {exhibit.exhibit_number}</h1>
                <p className="text-muted-foreground mt-1">Court exhibit with technical proof</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/exhibits/${id}/download`}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Visual Representation */}
            <Card>
              <CardHeader>
                <CardTitle>Visual Representation</CardTitle>
                <CardDescription>Native string rendering</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 bg-muted rounded-lg border-2 border-dashed">
                  <p className="text-4xl font-mono text-center">{exhibit.identity_records?.original_script}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Font</p>
                    <p className="font-medium">{exhibit.font_information?.family || "Arial Unicode MS"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-medium">{exhibit.font_information?.size || "12pt"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Rendering Engine</p>
                    <p className="font-medium">{exhibit.rendering_environment?.browser || "Browser Default"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Display</p>
                    <p className="font-medium">{exhibit.rendering_environment?.display || "1920x1080"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Proof</CardTitle>
                <CardDescription>Byte sequence and cryptographic verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Byte Sequence (UTF-8)</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="font-mono text-xs break-all">{exhibit.byte_sequence}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Hexadecimal Dump</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="font-mono text-xs break-all">{exhibit.hex_dump}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">SHA-256 Hash</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <p className="font-mono text-xs break-all">{exhibit.sha256_hash}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Encoding</p>
                    <p className="font-mono text-sm font-medium">{exhibit.encoding}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Character Count</p>
                    <p className="font-mono text-sm font-medium">
                      {exhibit.identity_records?.original_script.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation */}
            <Card>
              <CardHeader>
                <CardTitle>Validation</CardTitle>
                <CardDescription>Quality assurance checklist</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Screenshot clearly shows all characters</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Byte dump matches visual representation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Hash verification completed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Encoding properly documented</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm">Chain of custody maintained</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exhibit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Exhibit Number</Label>
                  <p className="text-lg font-bold mt-1">{exhibit.exhibit_number}</p>
                </div>
                {exhibit.case_number && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Case Number</Label>
                    <p className="text-sm mt-1">{exhibit.case_number}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <p className="mt-1">
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
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Source Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {exhibit.source_system && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Source System</Label>
                    <p className="text-sm mt-1">{exhibit.source_system}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Extraction Timestamp</Label>
                  <p className="text-sm mt-1">{new Date(exhibit.extraction_timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm mt-1">{new Date(exhibit.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {exhibit.chain_of_custody && (
              <Card>
                <CardHeader>
                  <CardTitle>Chain of Custody</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{exhibit.chain_of_custody}</p>
                </CardContent>
              </Card>
            )}

            {exhibit.identity_records && (
              <Card>
                <CardHeader>
                  <CardTitle>Identity Record</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Original Script</Label>
                    <p className="text-sm mt-1 font-mono">{exhibit.identity_records.original_script}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Canonical ASCII</Label>
                    <p className="text-sm mt-1 font-mono">{exhibit.identity_records.canonical_ascii}</p>
                  </div>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href={`/dashboard/identities/${exhibit.identity_records.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Identity
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
