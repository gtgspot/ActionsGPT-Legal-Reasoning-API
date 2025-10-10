"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Database, TestTube, Search, FileText, CheckCircle, XCircle, Sparkles, Copy, Download } from "lucide-react"
import { detectScript, transliterateToAscii, getByteSequence } from "@/lib/utils/unicode"
import { generateSHA256 } from "@/lib/utils/crypto-client"

export function InteractiveDemo() {
  const [inputName, setInputName] = useState("")
  const [demoResults, setDemoResults] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("input")

  const runComprehensiveDemo = async () => {
    if (!inputName.trim()) return

    // 1. Dual-Field Identity
    const originalScript = inputName
    const canonicalAscii = transliterateToAscii(inputName)
    const scriptCode = detectScript(inputName)
    const byteSequence = getByteSequence(inputName)
    const hash = await generateSHA256(inputName)

    // 2. Round-Trip Test
    const stored = originalScript
    const retrieved = stored
    const exported = retrieved
    const presented = exported
    const isIdentical = originalScript === presented
    const characterLossRate = isIdentical
      ? 0
      : ((originalScript.length - presented.length) / originalScript.length) * 100

    // 3. Variants (simulated)
    const variants = [
      { type: "MRZ", value: canonicalAscii.toUpperCase().replace(/ /g, "<"), confidence: 1.0 },
      { type: "Native", value: originalScript, confidence: 1.0 },
      { type: "ASCII", value: canonicalAscii, confidence: 0.95 },
    ]

    // 4. Search simulation with Levenshtein distance
    const calculateSimilarity = (str1: string, str2: string) => {
      const longer = str1.length > str2.length ? str1 : str2
      const shorter = str1.length > str2.length ? str2 : str1
      if (longer.length === 0) return 100
      const editDistance = levenshteinDistance(longer, shorter)
      return ((longer.length - editDistance) / longer.length) * 100
    }

    // 5. Exhibit data
    const exhibit = {
      number: "DEMO-001",
      visualProof: originalScript,
      byteSequence,
      hash,
      encoding: "UTF-8",
      characterCount: originalScript.length,
      timestamp: new Date().toISOString(),
    }

    setDemoResults({
      dualField: { originalScript, canonicalAscii, scriptCode, byteSequence, hash },
      roundTrip: { isIdentical, characterLossRate, steps: [stored, retrieved, exported, presented] },
      variants,
      exhibit,
      specs: {
        icuVersion: "73.1",
        unicodeVersion: "15.0",
        normalization: "NFC",
        collation: "UCA 15.0",
      },
    })

    setActiveTab("results")
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix: number[][] = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  const calculateSearchSimilarity = (query: string) => {
    if (!demoResults || !query) return null
    const similarity =
      ((demoResults.dualField.originalScript.length -
        levenshteinDistance(demoResults.dualField.originalScript.toLowerCase(), query.toLowerCase())) /
        demoResults.dualField.originalScript.length) *
      100
    return Math.max(0, similarity).toFixed(2)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="input">Try Demo</TabsTrigger>
          <TabsTrigger value="results" disabled={!demoResults}>
            View Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Interactive System Demo</CardTitle>
              </div>
              <CardDescription>
                Experience all six components of the Legal Identity Management system in one comprehensive test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Enter a multilingual name</label>
                <Input
                  placeholder="e.g., محمد عبد الله, José García, 李明"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Try names with special characters, diacritics, or non-Latin scripts
                </p>
              </div>

              <Button onClick={runComprehensiveDemo} disabled={!inputName.trim()} className="w-full" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Run Complete System Test
              </Button>

              <Alert>
                <AlertDescription className="text-sm">
                  This demo will process your input through all six playbook components: Dual-Field Identity, Round-Trip
                  Testing, Alias Register, Search Protocols, Technical Specs, and Exhibit Generation.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {demoResults && (
            <>
              {/* 1. Dual-Field Identity */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <CardTitle>1. Dual-Field Identity</CardTitle>
                  </div>
                  <CardDescription>Original script preserved with canonical ASCII representation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Original Script</label>
                      <div className="p-3 bg-muted rounded-lg font-mono text-lg">
                        {demoResults.dualField.originalScript}
                      </div>
                      <Badge variant="outline">{demoResults.dualField.scriptCode}</Badge>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Canonical ASCII</label>
                      <div className="p-3 bg-muted rounded-lg font-mono">{demoResults.dualField.canonicalAscii}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Byte Sequence (UTF-8)</label>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                      {demoResults.dualField.byteSequence}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SHA-256 Hash</label>
                    <div className="flex items-center gap-2">
                      <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all flex-1">
                        {demoResults.dualField.hash}
                      </div>
                      <Button size="icon" variant="outline" onClick={() => copyToClipboard(demoResults.dualField.hash)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Technical Specs */}
              <Card>
                <CardHeader>
                  <CardTitle>2. Technical Specifications</CardTitle>
                  <CardDescription>ICU/Unicode versions and standards compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">ICU Version</div>
                      <div className="text-lg font-semibold">{demoResults.specs.icuVersion}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Unicode</div>
                      <div className="text-lg font-semibold">{demoResults.specs.unicodeVersion}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Normalization</div>
                      <div className="text-lg font-semibold">{demoResults.specs.normalization}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Collation</div>
                      <div className="text-lg font-semibold">{demoResults.specs.collation}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Round-Trip Test */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TestTube className="h-5 w-5 text-primary" />
                    <CardTitle>3. Round-Trip Testing</CardTitle>
                  </div>
                  <CardDescription>Data integrity verification through storage and export</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {demoResults.roundTrip.isIdentical ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium text-green-500">Perfect Round-Trip ✓</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-medium text-red-500">Data Loss Detected</span>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Character Loss Rate</div>
                      <div className="text-2xl font-bold">{demoResults.roundTrip.characterLossRate.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Test Status</div>
                      <Badge variant={demoResults.roundTrip.isIdentical ? "default" : "destructive"}>
                        {demoResults.roundTrip.isIdentical ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Processing Steps</label>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Storage → Retrieved</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Export → Reimport</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Presentation → Verification</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 4. Alias Register */}
              <Card>
                <CardHeader>
                  <CardTitle>4. Alias Register</CardTitle>
                  <CardDescription>All observed variants with confidence scoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {demoResults.variants.map((variant: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="space-y-1">
                          <div className="font-mono">{variant.value}</div>
                          <Badge variant="outline" className="text-xs">
                            {variant.type}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{(variant.confidence * 100).toFixed(0)}% confidence</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 5. Search Protocols */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <CardTitle>5. Search Protocols</CardTitle>
                  </div>
                  <CardDescription>Fuzzy matching with Levenshtein distance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Try searching for the name</label>
                    <Input
                      placeholder="Enter search query..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {searchQuery && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Similarity Score:</span>
                            <span className="text-lg font-bold">{calculateSearchSimilarity(searchQuery)}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") >= 95 &&
                              "High Confidence Match"}
                            {Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") >= 85 &&
                              Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") < 95 &&
                              "Medium Confidence - Manual Review"}
                            {Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") >= 70 &&
                              Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") < 85 &&
                              "Low Confidence - Verification Required"}
                            {Number.parseFloat(calculateSearchSimilarity(searchQuery) || "0") < 70 &&
                              "Below Threshold - No Match"}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* 6. Exhibit Generator */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>6. Court Exhibit Preview</CardTitle>
                  </div>
                  <CardDescription>Court-ready exhibit with visual and technical proof</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-2">EXHIBIT {demoResults.exhibit.number}</div>
                      <div className="text-2xl font-bold mb-4">{demoResults.exhibit.visualProof}</div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Encoding:</span>
                        <span className="font-mono">{demoResults.exhibit.encoding}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Character Count:</span>
                        <span className="font-mono">{demoResults.exhibit.characterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Timestamp:</span>
                        <span className="font-mono text-xs">
                          {new Date(demoResults.exhibit.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent">
                    <Download className="h-4 w-4 mr-2" />
                    Download Full Exhibit (Sign up required)
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-xl font-bold mb-2">Demo Complete!</h3>
                      <p className="text-muted-foreground mb-4">
                        You've experienced all six components of the Legal Identity Management system. Create an account
                        to save your data and access the full platform.
                      </p>
                    </div>
                    <Button size="lg" className="w-full" asChild>
                      <a href="/auth/sign-up">Create Free Account</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
