"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { calculateSimilarity, removeDiacritics } from "@/lib/utils/unicode"
import { Search, Loader2 } from "lucide-react"

interface SearchResult {
  id: string
  original_script: string
  canonical_ascii: string
  script_code: string
  language_code: string
  similarity: number
  matchType: string
}

interface SearchFormProps {
  userId: string
}

export function SearchForm({ userId }: SearchFormProps) {
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMode, setSearchMode] = useState<"strict" | "standard" | "fuzzy">("standard")
  const [accentSensitive, setAccentSensitive] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [diacriticSensitive, setDiacriticSensitive] = useState(true)
  const [matchThreshold, setMatchThreshold] = useState(0.85)
  const [results, setResults] = useState<SearchResult[]>([])
  const [executionTime, setExecutionTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const performSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)
    setError(null)
    const startTime = performance.now()

    try {
      const supabase = createClient()

      // Fetch all identity records
      const { data: identities, error: fetchError } = await supabase
        .from("identity_records")
        .select("id, original_script, canonical_ascii, script_code, language_code")
        .eq("status", "active")

      if (fetchError) throw fetchError

      // Prepare search query based on settings
      let normalizedQuery = searchQuery
      if (!caseSensitive) {
        normalizedQuery = normalizedQuery.toLowerCase()
      }
      if (!accentSensitive || !diacriticSensitive) {
        normalizedQuery = removeDiacritics(normalizedQuery)
      }

      // Perform matching
      const matches: SearchResult[] = []

      for (const identity of identities || []) {
        let originalText = identity.original_script
        let asciiText = identity.canonical_ascii

        // Apply transformations
        if (!caseSensitive) {
          originalText = originalText.toLowerCase()
          asciiText = asciiText.toLowerCase()
        }
        if (!accentSensitive || !diacriticSensitive) {
          originalText = removeDiacritics(originalText)
          asciiText = removeDiacritics(asciiText)
        }

        // Calculate similarity
        const originalSimilarity = calculateSimilarity(normalizedQuery, originalText)
        const asciiSimilarity = calculateSimilarity(normalizedQuery, asciiText)
        const maxSimilarity = Math.max(originalSimilarity, asciiSimilarity)

        // Determine match type
        let matchType = "fuzzy"
        if (originalText === normalizedQuery || asciiText === normalizedQuery) {
          matchType = "exact"
        } else if (originalText.includes(normalizedQuery) || asciiText.includes(normalizedQuery)) {
          matchType = "partial"
        }

        // Apply threshold based on search mode
        let threshold = matchThreshold
        if (searchMode === "strict") {
          threshold = 1.0 // Exact match only
        } else if (searchMode === "standard") {
          threshold = 0.95
        }

        if (maxSimilarity >= threshold) {
          matches.push({
            id: identity.id,
            original_script: identity.original_script,
            canonical_ascii: identity.canonical_ascii,
            script_code: identity.script_code,
            language_code: identity.language_code,
            similarity: maxSimilarity,
            matchType,
          })
        }
      }

      // Sort by similarity
      matches.sort((a, b) => b.similarity - a.similarity)

      const endTime = performance.now()
      const execTime = Math.round(endTime - startTime)
      setExecutionTime(execTime)
      setResults(matches)

      // Log search operation
      await supabase.from("search_operations").insert({
        search_query: searchQuery,
        search_mode: searchMode,
        accent_sensitive: accentSensitive,
        case_sensitive: caseSensitive,
        diacritic_sensitive: diacriticSensitive,
        max_edit_distance: 2,
        results_count: matches.length,
        match_threshold: matchThreshold,
        execution_time_ms: execTime,
        performed_by: userId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
          <CardDescription>Configure search parameters and matching thresholds</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={performSearch} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="query">Search Query</Label>
              <div className="flex gap-2">
                <Input
                  id="query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter name to search..."
                  required
                  className="font-mono"
                />
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Search Mode</Label>
              <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Strict (100% exact match)</SelectItem>
                  <SelectItem value="standard">Standard (≥95% similarity)</SelectItem>
                  <SelectItem value="fuzzy">Fuzzy (configurable threshold)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchMode === "fuzzy" && (
              <div className="space-y-2">
                <Label htmlFor="threshold">Match Threshold: {(matchThreshold * 100).toFixed(0)}%</Label>
                <Slider
                  id="threshold"
                  min={0.7}
                  max={1.0}
                  step={0.05}
                  value={[matchThreshold]}
                  onValueChange={([value]) => setMatchThreshold(value)}
                />
                <p className="text-xs text-muted-foreground">Minimum similarity score for matches</p>
              </div>
            )}

            <div className="space-y-4">
              <Label>Search Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="accent">Accent Sensitive</Label>
                    <p className="text-xs text-muted-foreground">Distinguish between accented characters</p>
                  </div>
                  <Switch id="accent" checked={accentSensitive} onCheckedChange={setAccentSensitive} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="case">Case Sensitive</Label>
                    <p className="text-xs text-muted-foreground">Distinguish between uppercase and lowercase</p>
                  </div>
                  <Switch id="case" checked={caseSensitive} onCheckedChange={setCaseSensitive} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="diacritic">Diacritic Sensitive</Label>
                    <p className="text-xs text-muted-foreground">Distinguish between diacritical marks</p>
                  </div>
                  <Switch id="diacritic" checked={diacriticSensitive} onCheckedChange={setDiacriticSensitive} />
                </div>
              </div>
            </div>

            {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {results.length} matches in {executionTime}ms
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result) => (
                <div key={result.id} className="p-4 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-mono text-lg mb-1">{result.original_script}</p>
                      <p className="font-mono text-sm text-muted-foreground">{result.canonical_ascii}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{(result.similarity * 100).toFixed(1)}%</div>
                      <Badge variant={result.matchType === "exact" ? "default" : "secondary"}>{result.matchType}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="outline">{result.script_code}</Badge>
                    <Badge variant="outline">{result.language_code}</Badge>
                    <Button variant="ghost" size="sm" asChild className="ml-auto">
                      <a href={`/dashboard/identities/${result.id}`}>View Details</a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.length === 0 && executionTime !== null && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No matches found for your search query</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search parameters or threshold</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
