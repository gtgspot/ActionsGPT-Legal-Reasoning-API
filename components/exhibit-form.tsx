"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { generateSHA256, stringToHex } from "@/lib/utils/crypto"
import { Loader2 } from "lucide-react"

interface Identity {
  id: string
  original_script: string
  canonical_ascii: string
}

interface ExhibitFormProps {
  identities: Identity[]
  userId: string
}

export function ExhibitForm({ identities, userId }: ExhibitFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    identity_id: "",
    exhibit_number: "",
    case_number: "",
    source_system: "",
    chain_of_custody: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Fetch the identity record
      const { data: identity, error: identityError } = await supabase
        .from("identity_records")
        .select("original_script, encoding_used")
        .eq("id", formData.identity_id)
        .single()

      if (identityError || !identity) {
        throw new Error("Identity record not found")
      }

      // Generate technical proof
      const hash = generateSHA256(identity.original_script)
      const hexDump = stringToHex(identity.original_script)
      const byteSequence = `\\x${hexDump}`

      // Generate font and rendering information
      const fontInfo = {
        family: "Arial Unicode MS",
        size: "12pt",
        weight: "normal",
        rendering_engine: "Browser Default",
      }

      const renderingEnv = {
        browser: "Chrome",
        version: "120.0",
        display: "1920x1080",
        dpi: 96,
        color_profile: "sRGB",
      }

      const validationChecksums = {
        sha256: hash,
        md5: "placeholder_md5",
        crc32: "placeholder_crc32",
      }

      const exhibitData = {
        identity_id: formData.identity_id,
        exhibit_number: formData.exhibit_number,
        case_number: formData.case_number || null,
        source_system: formData.source_system || null,
        chain_of_custody: formData.chain_of_custody || null,
        byte_sequence: byteSequence,
        hex_dump: hexDump,
        sha256_hash: hash,
        encoding: identity.encoding_used,
        font_information: fontInfo,
        rendering_environment: renderingEnv,
        validation_checksums: validationChecksums,
        extraction_timestamp: new Date().toISOString(),
        status: "draft",
        created_by: userId,
      }

      const { data, error: insertError } = await supabase.from("court_exhibits").insert(exhibitData).select().single()

      if (insertError) throw insertError
      router.push(`/dashboard/exhibits/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exhibit Information</CardTitle>
        <CardDescription>Enter exhibit details and select identity record</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="identity">
              Identity Record <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.identity_id}
              onValueChange={(value) => setFormData({ ...formData, identity_id: value })}
              required
            >
              <SelectTrigger id="identity">
                <SelectValue placeholder="Select identity record" />
              </SelectTrigger>
              <SelectContent>
                {identities.map((identity) => (
                  <SelectItem key={identity.id} value={identity.id}>
                    {identity.original_script} / {identity.canonical_ascii}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exhibit_number">
                Exhibit Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="exhibit_number"
                value={formData.exhibit_number}
                onChange={(e) => setFormData({ ...formData, exhibit_number: e.target.value })}
                placeholder="EX-001"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="case_number">Case Number</Label>
              <Input
                id="case_number"
                value={formData.case_number}
                onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                placeholder="CASE-2024-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_system">Source System</Label>
            <Input
              id="source_system"
              value={formData.source_system}
              onChange={(e) => setFormData({ ...formData, source_system: e.target.value })}
              placeholder="CaseManagement v3.2"
            />
            <p className="text-xs text-muted-foreground">System from which the identity was extracted</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chain_of_custody">Chain of Custody</Label>
            <Textarea
              id="chain_of_custody"
              value={formData.chain_of_custody}
              onChange={(e) => setFormData({ ...formData, chain_of_custody: e.target.value })}
              placeholder="Describe the chain of custody for this exhibit..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Document the handling and custody of this evidence</p>
          </div>

          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Exhibit
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
