import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react"

export default async function TestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect("/auth/login")
  }

  // Fetch test result
  const { data: test, error: testError } = await supabase
    .from("roundtrip_tests")
    .select(
      `
      *,
      identity_records (
        id,
        original_script,
        canonical_ascii,
        script_code,
        language_code
      )
    `,
    )
    .eq("id", id)
    .single()

  if (testError || !test) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/testing">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Test Result Details</h1>
              <p className="text-muted-foreground mt-1">Round-trip test execution details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Test Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Test Status</CardTitle>
                  {test.passed ? (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Passed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Failed</span>
                    </div>
                  )}
                </div>
                <CardDescription>
                  {test.test_type} test executed on {new Date(test.test_timestamp).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Input</label>
                  <p className="text-xl font-mono mt-1 p-3 bg-muted rounded-md">{test.original_input}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Final Output</label>
                  <p className="text-xl font-mono mt-1 p-3 bg-muted rounded-md">{test.final_output}</p>
                </div>
                {!test.passed && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-medium text-destructive mb-2">Data Integrity Violation Detected</p>
                    <p className="text-sm text-muted-foreground">
                      The output does not match the input, indicating data loss or corruption during the test cycle.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Loss Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Loss Metrics</CardTitle>
                <CardDescription>Quantification of data loss during test cycle</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Character Loss Rate</p>
                    <p
                      className={`text-2xl font-bold ${test.character_loss_rate > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {test.character_loss_rate.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 0.00%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Diacritic Loss Rate</p>
                    <p
                      className={`text-2xl font-bold ${test.diacritic_loss_rate > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {test.diacritic_loss_rate.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 0.00%</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Script Conversion Errors</p>
                    <p
                      className={`text-2xl font-bold ${test.script_conversion_errors > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {test.script_conversion_errors}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 0</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Byte Differences</p>
                    <p
                      className={`text-2xl font-bold ${test.byte_differences > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {test.byte_differences}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Target: 0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Test Type</label>
                  <p className="mt-1">
                    <Badge variant="outline">{test.test_type}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm mt-1">{new Date(test.test_timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Test ID</label>
                  <p className="text-xs mt-1 font-mono break-all">{test.id}</p>
                </div>
              </CardContent>
            </Card>

            {test.identity_records && (
              <Card>
                <CardHeader>
                  <CardTitle>Identity Record</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Original Script</label>
                    <p className="text-sm mt-1 font-mono">{test.identity_records.original_script}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Canonical ASCII</label>
                    <p className="text-sm mt-1 font-mono">{test.identity_records.canonical_ascii}</p>
                  </div>
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href={`/dashboard/identities/${test.identity_records.id}`}>View Identity</Link>
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
