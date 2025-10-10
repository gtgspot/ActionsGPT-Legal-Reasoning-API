import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Plus, ArrowLeft } from "lucide-react"
import { IdentityTable } from "@/components/identity-table"

export default async function IdentitiesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch identity records
  const { data: identities, error: identitiesError } = await supabase
    .from("identity_records")
    .select("*")
    .order("created_at", { ascending: false })

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
                <h1 className="text-3xl font-bold">Identity Records</h1>
                <p className="text-muted-foreground mt-1">
                  Manage dual-field identity records with complete data integrity
                </p>
              </div>
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
        <Card>
          <CardHeader>
            <CardTitle>All Identity Records</CardTitle>
            <CardDescription>{identities?.length || 0} records in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {identitiesError ? (
              <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
                Error loading identities: {identitiesError.message}
              </div>
            ) : (
              <IdentityTable identities={identities || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
