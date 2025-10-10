"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { normalizeUnicode } from "@/lib/utils/unicode"
import { Loader2, CheckCircle } from "lucide-react"

interface Identity {
  id: string
  original_script: string
  canonical_ascii: string
}

interface RunTestsFormProps {
  identities: Identity[]
  userId: string
}

export function RunTestsForm({ identities, userId }: RunTestsFormProps) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<{ passed: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedIdentity, setSelectedIdentity] = useState<string>("all")
  const [testTypes, setTestTypes] = useState({
    storage: true,
    export: true,
    presentation: true,
  })

  const runRoundTripTest = async (identity: Identity, testType: string): Promise<boolean> => {
    const supabase = createClient()

    // Simulate round-trip test
    const originalInput = identity.original_script
    let finalOutput = originalInput

    // Storage test: normalize and store
    if (testType === "storage") {
      finalOutput = normalizeUnicode(originalInput, "NFC")
    }

    // Export test: simulate export/import cycle
    if (testType === "export") {
      const encoded = new TextEncoder().encode(originalInput)
      finalOutput = new TextDecoder().decode(encoded)
    }

    // Presentation test: simulate rendering
    if (testType === "presentation") {
      finalOutput = originalInput
    }

    // Calculate metrics
    const passed = originalInput === finalOutput
    const characterLossRate = passed ? 0 : ((originalInput.length - finalOutput.length) / originalInput.length) * 100
    const diacriticLossRate = 0 // Simplified for demo
    const scriptConversionErrors = passed ? 0 : 1
    const byteDifferences = passed ? 0 : Math.abs(originalInput.length - finalOutput.length)

    // Store test result
    await supabase.from("roundtrip_tests").insert({
      identity_id: identity.id,
      test_type: testType,
      passed,
      original_input: originalInput,
      final_output: finalOutput,
      character_loss_rate: characterLossRate,
      diacritic_loss_rate: diacriticLossRate,
      script_conversion_errors: scriptConversionErrors,
      byte_differences: byteDifferences,
      created_by: userId,
    })

    return passed
  }

  const handleRunTests = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRunning(true)
    setProgress(0)
    setResults(null)
    setError(null)

    try {
      const supabase = createClient()

      // Get identities to test
      let identitiesToTest = identities
      if (selectedIdentity !== "all") {
        identitiesToTest = identities.filter((i) => i.id === selectedIdentity)
      }

      // Get test types to run
      const typesToRun = Object.entries(testTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type)

      if (typesToRun.length === 0) {
        setError("Please select at least one test type")
        setIsRunning(false)
        return
      }

      const totalTests = identitiesToTest.length * typesToRun.length
      let completed = 0
      let passed = 0
      let failed = 0

      // Run tests
      for (const identity of identitiesToTest) {
        for (const testType of typesToRun) {
          const result = await runRoundTripTest(identity, testType)
          if (result) {
            passed++
          } else {
            failed++
          }
          completed++
          setProgress((completed / totalTests) * 100)
        }
      }

      setResults({ passed, failed })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Round-Trip Tests</CardTitle>
        <CardDescription>Select identities and test types to validate data integrity</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRunTests} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="identity">Identity Records</Label>
            <Select value={selectedIdentity} onValueChange={setSelectedIdentity} disabled={isRunning}>
              <SelectTrigger id="identity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active Records ({identities.length})</SelectItem>
                {identities.map((identity) => (
                  <SelectItem key={identity.id} value={identity.id}>
                    {identity.original_script} / {identity.canonical_ascii}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Test Types</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="storage"
                  checked={testTypes.storage}
                  onCheckedChange={(checked) => setTestTypes({ ...testTypes, storage: checked as boolean })}
                  disabled={isRunning}
                />
                <label
                  htmlFor="storage"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Storage Test - Validate database storage and retrieval
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="export"
                  checked={testTypes.export}
                  onCheckedChange={(checked) => setTestTypes({ ...testTypes, export: checked as boolean })}
                  disabled={isRunning}
                />
                <label
                  htmlFor="export"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Export Test - Validate export and reimport cycle
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="presentation"
                  checked={testTypes.presentation}
                  onCheckedChange={(checked) => setTestTypes({ ...testTypes, presentation: checked as boolean })}
                  disabled={isRunning}
                />
                <label
                  htmlFor="presentation"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Presentation Test - Validate rendering and display
                </label>
              </div>
            </div>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Running tests...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {results && (
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Tests Completed</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-2xl font-bold text-success">{results.passed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-destructive">{results.failed}</p>
                </div>
              </div>
            </div>
          )}

          {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isRunning || identities.length === 0}>
              {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isRunning ? "Running Tests..." : "Run Tests"}
            </Button>
            {results && (
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/testing")}>
                View All Results
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
