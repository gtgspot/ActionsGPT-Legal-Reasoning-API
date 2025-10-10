import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Edit, Plus } from "lucide-react"
import { VariantsList } from "@/components/variants-list"

export default async function IdentityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect("/auth/login")
  }

  // Fetch identity record
  const { data: identity, error: identityError } = await supabase
    .from("identity_records")
    .select("*")
    .eq("id", id)
    .single()

  if (identityError || !identity) {
    notFound()
  }

  // Fetch variants
  const { data: variants } = await supabase
    .from("identity_variants")
    .select("*")
    .eq("canonical_id", identity.canonical_id)
    .order("confidence_score", { ascending: false })

  // Fetch test results
  const { data: tests } = await supabase
    .from("roundtrip_tests")
    .select("*")
    .eq("identity_id", id)
    .order("test_timestamp", { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/identities">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Identity Details</h1>
                <p className="text-muted-foreground mt-1">View complete identity record information</p>
              </div>
            </div>
            <Button asChild>
              <Link href={`/dashboard/identities/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Identity Information */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Identity</CardTitle>
                <CardDescription>Dual-field identity structure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Script</label>
                  <p className="text-2xl font-mono mt-1">{identity.original_script}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Canonical ASCII</label>
                  <p className="text-2xl font-mono mt-1">{identity.canonical_ascii}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Script Code</label>
                    <p className="mt-1">
                      <Badge variant="outline">{identity.script_code}</Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Language Code</label>
                    <p className="mt-1">
                      <Badge variant="outline">{identity.language_code}</Badge>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variants */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Observed Variants</CardTitle>
                    <CardDescription>{variants?.length || 0} variants in alias register</CardDescription>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/identities/${id}/variants/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <VariantsList variants={variants || []} />
              </CardContent>
            </Card>

            {/* Recent Tests */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Round-Trip Tests</CardTitle>
                <CardDescription>Latest integrity validation results</CardDescription>
              </CardHeader>
              <CardContent>
                {tests && tests.length > 0 ? (
                  <div className="space-y-3">
                    {tests.map((test) => (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={test.passed ? "default" : "destructive"}>
                              {test.passed ? "Passed" : "Failed"}
                            </Badge>
                            <span className="text-sm font-medium">{test.test_type}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(test.test_timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!test.passed && (
                          <div className="text-right text-sm">
                            <p className="text-destructive">Loss: {test.character_loss_rate}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No tests run yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Technical Details Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Encoding</label>
                  <p className="text-sm mt-1 font-mono">{identity.encoding_used}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ICU Version</label>
                  <p className="text-sm mt-1 font-mono">{identity.icu_version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unicode Version</label>
                  <p className="text-sm mt-1 font-mono">{identity.unicode_version}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Normalization</label>
                  <p className="text-sm mt-1 font-mono">{identity.normalization_form}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">SHA-256 Hash</label>
                  <p className="text-xs mt-1 font-mono break-all text-muted-foreground">{identity.original_hash}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="mt-1">
                    <Badge
                      variant={
                        identity.status === "active"
                          ? "default"
                          : identity.status === "archived"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {identity.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Canonical ID</label>
                  <p className="text-xs mt-1 font-mono break-all">{identity.canonical_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">{new Date(identity.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Modified</label>
                  <p className="text-sm mt-1">{new Date(identity.last_modified).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
