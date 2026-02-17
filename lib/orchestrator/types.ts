/**
 * Type definitions for the Unified Orchestrator.
 *
 * Combines NLP processing, logical reasoning, and architecture modeling
 * into a single coordinated pipeline.
 */

import type { NLPResult } from '../nlp/types';
import type { ProofChain, ReasoningSession } from '../reasoning/types';
import type { ArchitectureBlueprint } from '../architecture/types';

export type OrchestrationMode = 'full' | 'nlp_only' | 'reasoning_only' | 'architecture_only';

export type PipelineStage = 'intake' | 'nlp_processing' | 'reasoning' | 'architecture_mapping' | 'synthesis' | 'complete' | 'error';

export interface PipelineMetrics {
  totalDurationMs: number;
  nlpDurationMs: number;
  reasoningDurationMs: number;
  architectureDurationMs: number;
  synthesisDurationMs: number;
}

export interface OrchestrationRequest {
  id: string;
  input: string;
  mode: OrchestrationMode;
  context: Record<string, unknown>;
  requestedAt: string;
}

export interface OrchestrationResult {
  requestId: string;
  stage: PipelineStage;
  nlpResult: NLPResult | null;
  reasoningResult: {
    session: ReasoningSession;
    proofChains: ProofChain[];
  } | null;
  architectureResult: ArchitectureBlueprint | null;
  synthesis: SynthesisReport;
  metrics: PipelineMetrics;
  completedAt: string;
}

export interface SynthesisReport {
  summary: string;
  inputClassification: string;
  detectedIntents: string[];
  reasoningConclusions: string[];
  architectureInsights: string[];
  confidenceScore: number;
  recommendations: string[];
}

export interface OrchestrationConfig {
  enableNLP: boolean;
  enableReasoning: boolean;
  enableArchitecture: boolean;
  maxReasoningDepth: number;
  confidenceThreshold: number;
}
