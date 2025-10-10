import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DocumentsTable } from "@/components/documents-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BucketBrowser } from "@/components/bucket-browser"

export default async function DocumentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: documents, error } = await supabase
    .from("regulatory_documents")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: actsFiles } = await supabase.storage.from("acts").list()
  const { data: regulationsFiles } = await supabase.storage.from("regulations").list()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Documents</h1>
          <p className="text-muted-foreground mt-2">
            Browse acts and regulations from Supabase Storage buckets, or upload new documents
          </p>
        </div>
        <Link href="/dashboard/documents/upload">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="database" className="w-full">
        <TabsList>
          <TabsTrigger value="database">Database Records</TabsTrigger>
          <TabsTrigger value="acts">Acts Bucket ({actsFiles?.length || 0})</TabsTrigger>
          <TabsTrigger value="regulations">Regulations Bucket ({regulationsFiles?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="mt-6">
          <Suspense fallback={<div>Loading documents...</div>}>
            <DocumentsTable documents={documents || []} />
          </Suspense>
        </TabsContent>

        <TabsContent value="acts" className="mt-6">
          <BucketBrowser bucket="acts" files={actsFiles || []} />
        </TabsContent>

        <TabsContent value="regulations" className="mt-6">
          <BucketBrowser bucket="regulations" files={regulationsFiles || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
