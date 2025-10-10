import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { IdentityForm } from "@/components/identity-form"

export default async function EditIdentityPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/dashboard/identities/${id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Identity Record</h1>
              <p className="text-muted-foreground mt-1">Update identity information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl">
          <IdentityForm
            userId={userData.user.id}
            initialData={{
              id: identity.id,
              original_script: identity.original_script,
              canonical_ascii: identity.canonical_ascii,
              script_code: identity.script_code,
              language_code: identity.language_code,
            }}
          />
        </div>
      </div>
    </div>
  )
}
