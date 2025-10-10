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
import { Slider } from "@/components/ui/slider"
import { Loader2 } from "lucide-react"

interface VariantFormProps {
  identityId: string
  canonicalId: string
  userId: string
}

export function VariantForm({ identityId, canonicalId, userId }: VariantFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    representation: "",
    variant_type: "native_alternate" as const,
    script_code: "",
    language_code: "",
    source_document: "",
    confidence_score: 0.95,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const variantData = {
        canonical_id: canonicalId,
        representation: formData.representation,
        variant_type: formData.variant_type,
        script_code: formData.script_code || null,
        language_code: formData.language_code || null,
        source_document: formData.source_document,
        confidence_score: formData.confidence_score,
        created_by: userId,
      }

      const { error: insertError } = await supabase.from("identity_variants").insert(variantData)

      if (insertError) throw insertError
      router.push(`/dashboard/identities/${identityId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Variant to Alias Register</CardTitle>
        <CardDescription>Record an observed variant of this identity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="representation">
              Variant Representation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="representation"
              value={formData.representation}
              onChange={(e) => setFormData({ ...formData, representation: e.target.value })}
              placeholder="MUHAMMAD<ABD<ALLAH"
              required
              className="font-mono text-lg"
            />
            <p className="text-xs text-muted-foreground">The observed variant as it appears in the source document</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="variant_type">
              Variant Type <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.variant_type}
              onValueChange={(value: any) => setFormData({ ...formData, variant_type: value })}
              required
            >
              <SelectTrigger id="variant_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MRZ">MRZ (Machine Readable Zone)</SelectItem>
                <SelectItem value="native_alternate">Native Alternate</SelectItem>
                <SelectItem value="ascii_alternate">ASCII Alternate</SelectItem>
                <SelectItem value="transliteration">Transliteration</SelectItem>
                <SelectItem value="phonetic">Phonetic</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="script_code">Script Code</Label>
              <Select
                value={formData.script_code}
                onValueChange={(value) => setFormData({ ...formData, script_code: value })}
              >
                <SelectTrigger id="script_code">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Latn">Latin (Latn)</SelectItem>
                  <SelectItem value="Arab">Arabic (Arab)</SelectItem>
                  <SelectItem value="Cyrl">Cyrillic (Cyrl)</SelectItem>
                  <SelectItem value="Grek">Greek (Grek)</SelectItem>
                  <SelectItem value="Hebr">Hebrew (Hebr)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language_code">Language Code</Label>
              <Select
                value={formData.language_code}
                onValueChange={(value) => setFormData({ ...formData, language_code: value })}
              >
                <SelectTrigger id="language_code">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="ar">Arabic (ar)</SelectItem>
                  <SelectItem value="ru">Russian (ru)</SelectItem>
                  <SelectItem value="el">Greek (el)</SelectItem>
                  <SelectItem value="he">Hebrew (he)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_document">
              Source Document <span className="text-destructive">*</span>
            </Label>
            <Input
              id="source_document"
              value={formData.source_document}
              onChange={(e) => setFormData({ ...formData, source_document: e.target.value })}
              placeholder="passport_scan_2024_01_15"
              required
            />
            <p className="text-xs text-muted-foreground">
              Reference to the source document where this variant was observed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidence_score">Confidence Score: {(formData.confidence_score * 100).toFixed(0)}%</Label>
            <Slider
              id="confidence_score"
              min={0}
              max={1}
              step={0.05}
              value={[formData.confidence_score]}
              onValueChange={([value]) => setFormData({ ...formData, confidence_score: value })}
            />
            <p className="text-xs text-muted-foreground">Confidence level for this variant (0-100%)</p>
          </div>

          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Variant
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
