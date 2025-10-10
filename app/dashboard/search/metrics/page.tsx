import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function SearchMetricsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch all search metrics
  const { data: metrics } = await supabase
    .from("search_metrics")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(12)

  // Fetch search operations summary
  const { data: operations } = await supabase
    .from("search_operations")
    .select("search_mode, results_count, execution_time_ms")
    .order("search_timestamp", { ascending: false })
    .limit(100)

  // Calculate aggregate stats
  const avgExecutionTime =
    operations && operations.length > 0
      ? Math.round(operations.reduce((sum, op) => sum + (op.execution_time_ms || 0), 0) / operations.length)
      : 0

  const modeDistribution = operations?.reduce(
    (acc, op) => {
      acc[op.search_mode] = (acc[op.search_mode] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/search">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Search Performance Metrics</h1>
              <p className="text-muted-foreground mt-1">Detailed analytics and performance tracking</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgExecutionTime}ms</div>
              <p className="text-xs text-muted-foreground mt-1">Last 100 searches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Most Used Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {modeDistribution
                  ? Object.entries(modeDistribution).sort(([, a], [, b]) => b - a)[0]?.[0] || "N/A"
                  : "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Search mode preference</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{operations?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Recent searches logged</p>
            </CardContent>
          </Card>
        </div>

        {/* Historical Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Performance Metrics</CardTitle>
            <CardDescription>Monthly aggregated search performance data</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics && metrics.length > 0 ? (
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">
                          {new Date(metric.period_start).toLocaleDateString()} -{" "}
                          {new Date(metric.period_end).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">{metric.total_searches} searches</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">False Positive Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{metric.false_positive_rate?.toFixed(2) || "0.00"}%</span>
                          <Badge
                            variant={
                              Number.parseFloat(metric.false_positive_rate?.toFixed(2) || "0") < 2
                                ? "default"
                                : "destructive"
                            }
                          >
                            {Number.parseFloat(metric.false_positive_rate?.toFixed(2) || "0") < 2 ? "Good" : "High"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">False Negative Rate</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{metric.false_negative_rate?.toFixed(2) || "0.00"}%</span>
                          <Badge
                            variant={
                              Number.parseFloat(metric.false_negative_rate?.toFixed(2) || "0") < 1
                                ? "default"
                                : "destructive"
                            }
                          >
                            {Number.parseFloat(metric.false_negative_rate?.toFixed(2) || "0") < 1 ? "Good" : "High"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Precision</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{metric.precision_score?.toFixed(2) || "0.00"}%</span>
                          <Badge
                            variant={
                              Number.parseFloat(metric.precision_score?.toFixed(2) || "0") > 98
                                ? "default"
                                : "secondary"
                            }
                          >
                            {Number.parseFloat(metric.precision_score?.toFixed(2) || "0") > 98 ? "Excellent" : "Fair"}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recall</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{metric.recall_score?.toFixed(2) || "0.00"}%</span>
                          <Badge
                            variant={
                              Number.parseFloat(metric.recall_score?.toFixed(2) || "0") > 99 ? "default" : "secondary"
                            }
                          >
                            {Number.parseFloat(metric.recall_score?.toFixed(2) || "0") > 99 ? "Excellent" : "Fair"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No historical metrics available yet</p>
                <p className="text-sm text-muted-foreground mt-2">Metrics are aggregated monthly</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
