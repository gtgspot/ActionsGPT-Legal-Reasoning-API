"use client"

import { processNLP } from "@/lib/nlp"
import {
  createProposition,
  createRule,
  buildProofChain,
  evaluateExpression,
  and,
  or,
  implies,
  checkConsistency,
  type Proposition
} from "@/lib/reasoning"
import { createMicroservicesTemplate, computeSystemMetrics, type ArchitectureBlueprint } from "@/lib/architecture"
import { fullPipeline } from "@/lib/orchestrator"
import type { EngineType } from "./smart-input"
import type { NLPResult } from "@/lib/nlp/types"
import type { ProofChain } from "@/lib/reasoning/types"

export interface AnalysisResult {
  engine: EngineType
  input: string
  timestamp: string
  processingTimeMs: number
  result: {
    summary: string
    confidence?: number
    details: any
    visualizations?: any[]
  }
}

export async function analyzeInput(input: string, engine: EngineType): Promise<AnalysisResult> {
  const startTime = performance.now()

  try {
    let result: AnalysisResult

    switch (engine) {
      case "reasoning":
        result = await analyzeReasoning(input)
        break
      case "nlp":
        result = await analyzeNLP(input)
        break
      case "architecture":
        result = await analyzeArchitecture(input)
        break
      case "unified":
        result = await analyzeUnified(input)
        break
      default:
        result = await analyzeNLP(input)
    }

    result.processingTimeMs = performance.now() - startTime
    result.timestamp = new Date().toISOString()

    return result
  } catch (error) {
    return {
      engine,
      input,
      timestamp: new Date().toISOString(),
      processingTimeMs: performance.now() - startTime,
      result: {
        summary: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        details: { error: true }
      }
    }
  }
}

async function analyzeReasoning(input: string): Promise<AnalysisResult> {
  // Simple rule parser for basic logic statements
  const propositions: Proposition[] = []

  // Try to detect simple logical structure
  const hasIfThen = /if\s+(.+?)\s+then\s+(.+?)(?:\.|$)/i.exec(input)

  if (hasIfThen) {
    const antecedent = createProposition(hasIfThen[1].trim(), true, 0.9)
    const consequent = createProposition(hasIfThen[2].trim(), null, 0.85)
    propositions.push(antecedent, consequent)

    const facts = new Map([[antecedent.id, antecedent]])
    const rules = [
      createRule(
        "User Rule",
        "User-provided conditional",
        implies(antecedent, consequent),
        consequent,
        "high"
      )
    ]

    const proof = buildProofChain(consequent, rules, facts, "forward_chaining")

    return {
      engine: "reasoning",
      input,
      timestamp: "",
      processingTimeMs: 0,
      result: {
        summary: proof.isValid
          ? `✓ Conclusion validated with ${(proof.overallConfidence * 100).toFixed(1)}% confidence`
          : "✗ Could not validate conclusion",
        confidence: proof.overallConfidence,
        details: {
          goal: proof.goal,
          steps: proof.steps,
          valid: proof.isValid,
          propositions: propositions
        },
        visualizations: [{
          type: "proof_chain",
          data: proof
        }]
      }
    }
  }

  // Consistency check for multiple statements
  const consistency = checkConsistency(propositions)

  return {
    engine: "reasoning",
    input,
    timestamp: "",
    processingTimeMs: 0,
    result: {
      summary: consistency.isConsistent
        ? "✓ Statements are logically consistent"
        : `✗ Found ${consistency.conflicts.length} logical conflicts`,
      confidence: consistency.isConsistent ? 0.95 : 0.1,
      details: {
        consistent: consistency.isConsistent,
        conflicts: consistency.conflicts,
        propositions: propositions
      }
    }
  }
}

async function analyzeNLP(input: string): Promise<AnalysisResult> {
  const nlpResult = processNLP(input)

  const sentiment = nlpResult.semantics.sentiment
  const sentimentLabel = sentiment.polarity > 0.2 ? "Positive" : sentiment.polarity < -0.2 ? "Negative" : "Neutral"

  return {
    engine: "nlp",
    input,
    timestamp: "",
    processingTimeMs: nlpResult.processingTimeMs,
    result: {
      summary: `${sentimentLabel} sentiment (${(sentiment.polarity * 100).toFixed(0)}% polarity) • ${nlpResult.intents.intent.action} intent detected`,
      confidence: nlpResult.intents.intent.confidence,
      details: nlpResult,
      visualizations: [
        {
          type: "sentiment",
          data: sentiment
        },
        {
          type: "intent",
          data: nlpResult.intents.intent
        },
        {
          type: "entities",
          data: nlpResult.semantics.entities
        }
      ]
    }
  }
}

async function analyzeArchitecture(input: string): Promise<AnalysisResult> {
  // For now, return the microservices template as an example
  const blueprint = createMicroservicesTemplate()
  const metrics = computeSystemMetrics(blueprint.topology)

  const serviceCount = blueprint.topology.layers.reduce((sum, layer) => sum + layer.services.length, 0)

  return {
    engine: "architecture",
    input,
    timestamp: "",
    processingTimeMs: 0,
    result: {
      summary: `Generated ${serviceCount}-service architecture with ${blueprint.topology.connections.length} connections across ${blueprint.topology.layers.length} layers`,
      confidence: 0.85,
      details: blueprint,
      visualizations: [
        {
          type: "topology",
          data: blueprint.topology
        },
        {
          type: "metrics",
          data: metrics
        }
      ]
    }
  }
}

async function analyzeUnified(input: string): Promise<AnalysisResult> {
  const orchestratorResult = fullPipeline(input)

  return {
    engine: "unified",
    input,
    timestamp: "",
    processingTimeMs: orchestratorResult.metrics.totalDurationMs,
    result: {
      summary: `Full analysis complete: ${orchestratorResult.synthesis.summary}`,
      confidence: 0.8,
      details: orchestratorResult,
      visualizations: [
        {
          type: "synthesis",
          data: orchestratorResult.synthesis
        }
      ]
    }
  }
}
