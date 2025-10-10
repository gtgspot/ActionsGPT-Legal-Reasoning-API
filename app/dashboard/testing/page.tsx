import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Play } from "lucide-react"
import { TestResultsTable } from "@/components/test-results-table"
import { TestMetrics } from "@/components/test-metrics"

export default async function TestingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch test results
  const { data: tests } = await supabase
    .from("roundtrip_tests")
    .select(`
      *,
      identity_records (
        original_script,
        canonical_ascii
      )
    `)
    .order("test_timestamp", { ascending: false })
    .limit(50)

  // Calculate metrics
  const totalTests = tests?.length || 0
  const passedTests = tests?.filter((t) => t.passed).length || 0
  const failedTests = totalTests - passedTests
  const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : "0"

  const avgCharLoss =
    tests && tests.length > 0
      ? (tests.reduce((sum, t) => sum + (t.character_loss_rate || 0), 0) / tests.length).toFixed(2)
      : "0.00"

  const avgDiacriticLoss =
    tests && tests.length > 0
      ? (tests.reduce((sum, t) => sum + (t.diacritic_loss_rate || 0), 0) / tests.length).toFixed(2)
      : "0.00"

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Round-Trip Testing</h1>
                <p className="text-muted-foreground mt-1">
                  Validate data integrity through storage, export, and presentation
                </p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/testing/run">
                <Play className="h-4 w-4 mr-2" />
                Run Tests
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Metrics Overview */}
        <TestMetrics
          totalTests={totalTests}
          passedTests={passedTests}
          failedTests={failedTests}
          passRate={passRate}
          avgCharLoss={avgCharLoss}
          avgDiacriticLoss={avgDiacriticLoss}
        />

        {/* Test Results */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Test Results</CardTitle>
            <CardDescription>Latest round-trip test executions</CardDescription>
          </CardHeader>
          <CardContent>
            <TestResultsTable tests={tests || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
