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
import { generateSHA256, stringToHex } from "@/lib/utils/crypto"
import { normalizeUnicode, detectScript } from "@/lib/utils/unicode"
import { Loader2 } from "lucide-react"

interface IdentityFormProps {
  userId: string
  initialData?: {
    id: string
    original_script: string
    canonical_ascii: string
    script_code: string
    language_code: string
  }
}

export function IdentityForm({ userId, initialData }: IdentityFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    original_script: initialData?.original_script || "",
    canonical_ascii: initialData?.canonical_ascii || "",
    script_code: initialData?.script_code || "",
    language_code: initialData?.language_code || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Normalize the original script
      const normalized = normalizeUnicode(formData.original_script, "NFC")

      // Auto-detect script if not provided
      const scriptCode = formData.script_code || detectScript(normalized)

      // Generate hash and byte sequence
      const hash = generateSHA256(normalized)
      const byteSequence = stringToHex(normalized)

      const identityData = {
        original_script: normalized,
        canonical_ascii: formData.canonical_ascii,
        script_code: scriptCode,
        language_code: formData.language_code,
        encoding_used: "UTF-8",
        icu_version: "73.1",
        unicode_version: "15.0",
        normalization_form: "NFC",
        original_hash: hash,
        byte_sequence: `\\x${byteSequence}`,
        status: "active",
        created_by: userId,
        modified_by: userId,
      }

      if (initialData?.id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("identity_records")
          .update(identityData)
          .eq("id", initialData.id)

        if (updateError) throw updateError
        router.push(`/dashboard/identities/${initialData.id}`)
      } else {
        // Create new record
        const { data, error: insertError } = await supabase
          .from("identity_records")
          .insert(identityData)
          .select()
          .single()

        if (insertError) throw insertError
        router.push(`/dashboard/identities/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit" : "Create"} Identity Record</CardTitle>
        <CardDescription>Enter both original script and canonical ASCII representation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="original_script">
              Original Script <span className="text-destructive">*</span>
            </Label>
            <Input
              id="original_script"
              value={formData.original_script}
              onChange={(e) => setFormData({ ...formData, original_script: e.target.value })}
              placeholder="محمد عبد الله"
              required
              className="font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">Enter the name in its original writing system</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonical_ascii">
              Canonical ASCII <span className="text-destructive">*</span>
            </Label>
            <Input
              id="canonical_ascii"
              value={formData.canonical_ascii}
              onChange={(e) => setFormData({ ...formData, canonical_ascii: e.target.value })}
              placeholder="Muhammad Abd Allah"
              required
              className="font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">Enter the standardized ASCII transliteration</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="script_code">Script Code</Label>
              <Select
                value={formData.script_code}
                onValueChange={(value) => setFormData({ ...formData, script_code: value })}
              >
                <SelectTrigger id="script_code">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Latn">Latin (Latn)</SelectItem>
                  <SelectItem value="Arab">Arabic (Arab)</SelectItem>
                  <SelectItem value="Cyrl">Cyrillic (Cyrl)</SelectItem>
                  <SelectItem value="Grek">Greek (Grek)</SelectItem>
                  <SelectItem value="Hebr">Hebrew (Hebr)</SelectItem>
                  <SelectItem value="Hani">Han/Chinese (Hani)</SelectItem>
                  <SelectItem value="Hira">Hiragana (Hira)</SelectItem>
                  <SelectItem value="Kana">Katakana (Kana)</SelectItem>
                  <SelectItem value="Thai">Thai (Thai)</SelectItem>
                  <SelectItem value="Deva">Devanagari (Deva)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">ISO 15924 script code (auto-detected if empty)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language_code">
                Language Code <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.language_code}
                onValueChange={(value) => setFormData({ ...formData, language_code: value })}
                required
              >
                <SelectTrigger id="language_code">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ar">Arabic (ar)</SelectItem>
                  <SelectItem value="ru">Russian (ru)</SelectItem>
                  <SelectItem value="el">Greek (el)</SelectItem>
                  <SelectItem value="he">Hebrew (he)</SelectItem>
                  <SelectItem value="zh">Chinese (zh)</SelectItem>
                  <SelectItem value="ja">Japanese (ja)</SelectItem>
                  <SelectItem value="th">Thai (th)</SelectItem>
                  <SelectItem value="hi">Hindi (hi)</SelectItem>
                  <SelectItem value="es">Spanish (es)</SelectItem>
                  <SelectItem value="fr">French (fr)</SelectItem>
                  <SelectItem value="de">German (de)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">ISO 639 language code</p>
            </div>
          </div>

          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Update" : "Create"} Identity
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
