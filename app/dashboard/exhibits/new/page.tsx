import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ExhibitForm } from "@/components/exhibit-form"

export default async function NewExhibitPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Fetch all active identities
  const { data: identities } = await supabase
    .from("identity_records")
    .select("id, original_script, canonical_ascii")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/exhibits">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Create Court Exhibit</h1>
              <p className="text-muted-foreground mt-1">Generate exhibit with visual and technical proof</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl">
          <ExhibitForm identities={identities || []} userId={data.user.id} />
        </div>
      </div>
    </div>
  )
}
