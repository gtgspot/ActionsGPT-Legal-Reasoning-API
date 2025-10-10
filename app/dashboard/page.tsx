import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Database, TestTube, Search, FileText, Plus, TrendingUp, FolderOpen } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch dashboard statistics
  const [identitiesResult, variantsResult, testsResult, exhibitsResult, documentsResult] = await Promise.all([
    supabase.from("identity_records").select("id", { count: "exact", head: true }),
    supabase.from("identity_variants").select("id", { count: "exact", head: true }),
    supabase.from("roundtrip_tests").select("id, passed", { count: "exact" }),
    supabase.from("court_exhibits").select("id", { count: "exact", head: true }),
    supabase.from("regulatory_documents").select("id", { count: "exact", head: true }),
  ])

  const stats = {
    identities: identitiesResult.count || 0,
    variants: variantsResult.count || 0,
    tests: testsResult.count || 0,
    testsPassed: testsResult.data?.filter((t) => t.passed).length || 0,
    exhibits: exhibitsResult.count || 0,
    documents: documentsResult.count || 0,
  }

  const testPassRate = stats.tests > 0 ? ((stats.testsPassed / stats.tests) * 100).toFixed(1) : "0"

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Welcome back, {data.user.email}</p>
            </div>
            <Button asChild>
              <Link href="/dashboard/identities/new">
                <Plus className="h-4 w-4 mr-2" />
                New Identity
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Identity Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.identities}</div>
              <p className="text-xs text-muted-foreground mt-1">Active records in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Variants Tracked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.variants}</div>
              <p className="text-xs text-muted-foreground mt-1">Alias register entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Test Pass Rate</CardTitle>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{testPassRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.testsPassed} of {stats.tests} tests passed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Court Exhibits</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.exhibits}</div>
              <p className="text-xs text-muted-foreground mt-1">Generated exhibits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documents}</div>
              <p className="text-xs text-muted-foreground mt-1">Regulatory files</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <Link href="/dashboard/identities">
              <CardHeader>
                <Database className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Manage Identities</CardTitle>
                <CardDescription>View, create, and edit identity records with dual-field structure</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer">
            <Link href="/dashboard/testing">
              <CardHeader>
                <TestTube className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Round-Trip Testing</CardTitle>
                <CardDescription>Run integrity tests and view loss metrics for all records</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer">
            <Link href="/dashboard/search">
              <CardHeader>
                <Search className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Search & Match</CardTitle>
                <CardDescription>Fuzzy search with configurable thresholds and performance metrics</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer">
            <Link href="/dashboard/exhibits">
              <CardHeader>
                <FileText className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Generate Exhibits</CardTitle>
                <CardDescription>Create court-ready exhibits with visual and technical proof</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:border-primary transition-colors cursor-pointer">
            <Link href="/dashboard/documents">
              <CardHeader>
                <FolderOpen className="h-10 w-10 mb-4 text-primary" />
                <CardTitle>Regulatory Documents</CardTitle>
                <CardDescription>Browse acts and regulations stored in Supabase buckets</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
