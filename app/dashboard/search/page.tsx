import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, TrendingUp } from "lucide-react"
import { SearchForm } from "@/components/search-form"
import { SearchMetricsDisplay } from "@/components/search-metrics-display"

export default async function SearchPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch recent search operations
  const { data: recentSearches } = await supabase
    .from("search_operations")
    .select("*")
    .eq("performed_by", data.user.id)
    .order("search_timestamp", { ascending: false })
    .limit(10)

  // Fetch search metrics for the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: metrics } = await supabase
    .from("search_metrics")
    .select("*")
    .gte("period_start", thirtyDaysAgo.toISOString())
    .order("period_start", { ascending: false })
    .limit(1)
    .single()

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
                <h1 className="text-3xl font-bold">Search & Match</h1>
                <p className="text-muted-foreground mt-1">
                  Fuzzy search with configurable thresholds and performance metrics
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/search/metrics">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Metrics
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SearchForm userId={data.user.id} />

            {/* Recent Searches */}
            {recentSearches && recentSearches.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Searches</CardTitle>
                  <CardDescription>Your last 10 search operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {recentSearches.map((search) => (
                      <div key={search.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-mono text-sm">{search.search_query}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {search.search_mode} mode • {search.results_count} results •{" "}
                            {new Date(search.search_timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div>{metrics && <SearchMetricsDisplay metrics={metrics} />}</div>
        </div>
      </div>
    </div>
  )
}
