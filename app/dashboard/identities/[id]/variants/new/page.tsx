import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VariantForm } from "@/components/variant-form"

export default async function NewVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) {
    redirect("/auth/login")
  }

  // Fetch identity record
  const { data: identity, error: identityError } = await supabase
    .from("identity_records")
    .select("canonical_id")
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
              <h1 className="text-3xl font-bold">Add Identity Variant</h1>
              <p className="text-muted-foreground mt-1">Record an observed variant for this identity</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl">
          <VariantForm identityId={id} canonicalId={identity.canonical_id} userId={userData.user.id} />
        </div>
      </div>
    </div>
  )
}
