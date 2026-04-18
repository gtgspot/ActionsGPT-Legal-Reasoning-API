"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Brain, MessageSquare, Network, Sparkles } from "lucide-react"
import { processNLP } from "@/lib/nlp"
import type { IntentCategory } from "@/lib/nlp/types"

interface SmartInputProps {
  onAnalyze: (input: string, detectedEngine: EngineType) => void
}

export type EngineType = "reasoning" | "nlp" | "architecture" | "unified"

export function SmartInput({ onAnalyze }: SmartInputProps) {
  const [input, setInput] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const detectEngineFromInput = (text: string): EngineType => {
    const lower = text.toLowerCase()

    // Reasoning keywords
    const reasoningKeywords = ["if", "then", "and", "or", "not", "implies", "prove", "logic", "rule", "consistent", "contradiction", "syllogism", "inference", "valid", "truth table"]
    const hasReasoningKeywords = reasoningKeywords.some(kw => lower.includes(kw))

    // Architecture keywords
    const archKeywords = ["service", "microservice", "architecture", "system", "topology", "design", "infrastructure", "deploy", "api", "endpoint", "database", "cache", "event", "pipeline"]
    const hasArchKeywords = archKeywords.some(kw => lower.includes(kw))

    // NLP keywords (default for natural text)
    const nlpKeywords = ["sentiment", "analyze", "text", "intent", "emotion", "feeling", "tone", "extract", "entity", "parse"]
    const hasNlpKeywords = nlpKeywords.some(kw => lower.includes(kw))

    // Count matches
    const scores = {
      reasoning: hasReasoningKeywords ? 1 : 0,
      architecture: hasArchKeywords ? 1 : 0,
      nlp: hasNlpKeywords ? 1 : 0
    }

    // Check for logical operators which strongly suggest reasoning
    if (/\b(if|then|and|or|not|implies|→|∧|∨|¬)\b/i.test(text)) {
      return "reasoning"
    }

    // If multiple engines detected, use unified
    const totalScore = scores.reasoning + scores.architecture + scores.nlp
    if (totalScore > 1) {
      return "unified"
    }

    // Return best match or default to NLP for plain text
    if (scores.reasoning > 0) return "reasoning"
    if (scores.architecture > 0) return "architecture"

    return "nlp"
  }

  const handleAnalyze = () => {
    if (!input.trim()) return

    setIsAnalyzing(true)
    const engine = detectEngineFromInput(input)
    onAnalyze(input, engine)
    setIsAnalyzing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleAnalyze()
    }
  }

  const quickStarts = [
    {
      icon: Brain,
      label: "Logic Check",
      engine: "reasoning" as EngineType,
      example: "If A and B, then C. A is true. B is true. Is C true?"
    },
    {
      icon: MessageSquare,
      label: "Text Analysis",
      engine: "nlp" as EngineType,
      example: "Analyze the sentiment: I absolutely love this product! It exceeded all my expectations."
    },
    {
      icon: Network,
      label: "System Design",
      engine: "architecture" as EngineType,
      example: "Design a microservices architecture for an e-commerce platform with user service, product catalog, and payment processing."
    },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">What would you like to analyze?</h2>
          </div>

          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your question, logic statement, text to analyze, or system design request...

Examples:
• 'If user is premium AND purchase > $100 then apply discount'
• 'Analyze this customer feedback: The service was terrible...'
• 'Design a real-time chat system with message queues'"
            className="min-h-[200px] text-base resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {input.length > 0 ? `${input.length} characters` : "Press ⌘+Enter to analyze"}
            </span>
            <Button
              onClick={handleAnalyze}
              disabled={!input.trim() || isAnalyzing}
              size="lg"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze →"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Or choose a quick start:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStarts.map((quickStart) => (
            <Card
              key={quickStart.label}
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                setInput(quickStart.example)
              }}
            >
              <div className="flex items-center gap-3">
                <quickStart.icon className="h-8 w-8 text-primary shrink-0" />
                <div>
                  <p className="font-medium">{quickStart.label}</p>
                  <p className="text-xs text-muted-foreground">Click to try</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
