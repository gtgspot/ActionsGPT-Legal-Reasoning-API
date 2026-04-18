"use client"

import { useState } from "react"
import { SmartInput, type EngineType } from "@/components/smart-input"
import { analyzeInput, type AnalysisResult } from "@/components/analysis-router"
import { ResultsRenderer } from "@/components/results-renderer"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function AnalyzePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async (input: string, engine: EngineType) => {
    setIsAnalyzing(true)
    try {
      const analysisResult = await analyzeInput(input, engine)
      setResult(analysisResult)
    } catch (error) {
      console.error("Analysis error:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNewAnalysis = () => {
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Intelligent Analysis Platform</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {isAnalyzing ? (
          <Card className="w-full max-w-4xl mx-auto p-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <h2 className="text-xl font-semibold">Analyzing your input...</h2>
              <p className="text-muted-foreground">
                Running through our reasoning, NLP, and architecture engines
              </p>
            </div>
          </Card>
        ) : result ? (
          <ResultsRenderer result={result} onNewAnalysis={handleNewAnalysis} />
        ) : (
          <SmartInput onAnalyze={handleAnalyze} />
        )}
      </div>

      {/* Footer Help */}
      {!result && !isAnalyzing && (
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto p-6 bg-muted/30">
            <h3 className="font-semibold mb-3">How it works</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium mb-1">🧠 Logic & Reasoning</p>
                <p className="text-muted-foreground">
                  Analyze logical statements, check consistency, generate proofs, and validate arguments
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">💬 Text Analysis</p>
                <p className="text-muted-foreground">
                  Extract sentiment, detect intent, identify entities, and parse discourse structure
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">🏗️ System Design</p>
                <p className="text-muted-foreground">
                  Generate architecture diagrams, design microservices, and plan system topology
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
