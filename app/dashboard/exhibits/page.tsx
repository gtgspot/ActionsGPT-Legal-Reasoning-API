import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Plus } from "lucide-react"
import { ExhibitsTable } from "@/components/exhibits-table"

export default async function ExhibitsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch exhibits
  const { data: exhibits } = await supabase
    .from("court_exhibits")
    .select(
      `
      *,
      identity_records (
        original_script,
        canonical_ascii
      )
    `,
    )
    .order("created_at", { ascending: false })

  // Count by status
  const statusCounts = exhibits?.reduce(
    (acc, ex) => {
      acc[ex.status] = (acc[ex.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

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
                <h1 className="text-3xl font-bold">Court Exhibits</h1>
                <p className="text-muted-foreground mt-1">Generate court-ready exhibits with technical proof</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/dashboard/exhibits/new">
                <Plus className="h-4 w-4 mr-2" />
                New Exhibit
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Exhibits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exhibits?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts?.draft || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts?.pending_review || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts?.approved || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Exhibits Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Exhibits</CardTitle>
            <CardDescription>Court exhibits with visual and technical proof</CardDescription>
          </CardHeader>
          <CardContent>
            <ExhibitsTable exhibits={exhibits || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
