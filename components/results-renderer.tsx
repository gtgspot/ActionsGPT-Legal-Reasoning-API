"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Download, Share2, Copy, CheckCircle } from "lucide-react"
import type { AnalysisResult } from "./analysis-router"

interface ResultsRendererProps {
  result: AnalysisResult
  onNewAnalysis?: () => void
}

export function ResultsRenderer({ result, onNewAnalysis }: ResultsRendererProps) {
  const [complexityLevel, setComplexityLevel] = useState<"simple" | "intermediate" | "advanced">("simple")
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analysis-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Simple Result (Always Visible) */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {result.engine} Engine
                </Badge>
                {result.result.confidence && (
                  <Badge variant="secondary">
                    {(result.result.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{result.result.summary}</CardTitle>
              <CardDescription>
                Processed in {result.processingTimeMs.toFixed(0)}ms
              </CardDescription>
            </div>
            <CheckCircle className="h-8 w-8 text-primary shrink-0" />
          </div>
        </CardHeader>
      </Card>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Results
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
        {onNewAnalysis && (
          <Button onClick={onNewAnalysis} variant="default">
            New Analysis
          </Button>
        )}
      </div>

      {/* Progressive Disclosure */}
      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-4">
                <span className="font-semibold">Show detailed analysis</span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent>
            <CardContent>
              <Tabs value={complexityLevel} onValueChange={(v) => setComplexityLevel(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="simple">Simple</TabsTrigger>
                  <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                <TabsContent value="simple" className="space-y-4 mt-4">
                  <SimpleView result={result} />
                </TabsContent>

                <TabsContent value="intermediate" className="space-y-4 mt-4">
                  <IntermediateView result={result} />
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <AdvancedView result={result} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Visualizations */}
      {result.result.visualizations && result.result.visualizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Visualizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.result.visualizations.map((viz, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2 capitalize">{viz.type.replace("_", " ")}</h4>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(viz.data, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SimpleView({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Quick Summary</h3>
        <p className="text-sm">{result.result.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 border rounded">
          <p className="text-sm text-muted-foreground">Engine Used</p>
          <p className="font-medium capitalize">{result.engine}</p>
        </div>
        <div className="p-3 border rounded">
          <p className="text-sm text-muted-foreground">Processing Time</p>
          <p className="font-medium">{result.processingTimeMs.toFixed(0)}ms</p>
        </div>
      </div>
    </div>
  )
}

function IntermediateView({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Detailed Analysis</h3>
        <p className="text-sm mb-4">{result.result.summary}</p>

        {result.result.confidence && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>Confidence</span>
              <span className="font-medium">{(result.result.confidence * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${result.result.confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Engine-Specific Metrics */}
      {result.engine === "nlp" && result.result.details.semantics && (
        <div className="space-y-3">
          <h4 className="font-medium">Sentiment Analysis</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">Polarity</p>
              <p className="font-medium">{(result.result.details.semantics.sentiment.polarity * 100).toFixed(0)}%</p>
            </div>
            <div className="p-3 border rounded">
              <p className="text-sm text-muted-foreground">Magnitude</p>
              <p className="font-medium">{(result.result.details.semantics.sentiment.magnitude * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      {result.engine === "reasoning" && result.result.details.steps && (
        <div className="space-y-3">
          <h4 className="font-medium">Inference Steps</h4>
          <p className="text-sm text-muted-foreground">
            {result.result.details.steps.length} step(s) in proof chain
          </p>
        </div>
      )}
    </div>
  )
}

function AdvancedView({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-3">Complete Analysis Data</h3>
        <div className="bg-muted p-4 rounded-lg">
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(result.result.details, null, 2)}
          </pre>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="p-3 border rounded">
          <p className="text-muted-foreground">Timestamp</p>
          <p className="font-mono text-xs mt-1">{new Date(result.timestamp).toLocaleString()}</p>
        </div>
        <div className="p-3 border rounded">
          <p className="text-muted-foreground">Processing Time</p>
          <p className="font-mono text-xs mt-1">{result.processingTimeMs.toFixed(2)}ms</p>
        </div>
        <div className="p-3 border rounded">
          <p className="text-muted-foreground">Engine</p>
          <p className="font-mono text-xs mt-1">{result.engine}</p>
        </div>
      </div>
    </div>
  )
}
