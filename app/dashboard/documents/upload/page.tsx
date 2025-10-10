import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DocumentUploadForm } from "@/components/document-upload-form"

export default async function UploadDocumentPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">Upload Regulatory Document</h1>
        <p className="text-muted-foreground mt-2">
          Upload .docx files containing regulatory data, statutes, case law, or other legal references
        </p>
      </div>

      <DocumentUploadForm userId={user.id} />
    </div>
  )
}
