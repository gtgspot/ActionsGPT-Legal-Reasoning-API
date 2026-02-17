/**
 * Unified Orchestration Engine
 *
 * Integrates the NLP pipeline, Logical Reasoning Engine, and Architecture
 * module into a single coordinated workflow. Accepts natural language input,
 * processes it through NLP, maps intents to reasoning operations, and
 * contextualizes results within an architecture blueprint.
 */

import type {
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationConfig,
  OrchestrationMode,
  SynthesisReport,
  PipelineMetrics,
} from './types';

import { processNLP } from '../nlp/engine';
import type { NLPResult, IntentCategory } from '../nlp/types';

import {
  createProposition,
  createRule,
  and,
  implies,
  buildProofChain,
  analyzeLegalSyllogism,
  createReasoningSession,
  addPropositionToSession,
  addRuleToSession,
  completeSession,
} from '../reasoning/engine';
import type { ProofChain, ReasoningSession } from '../reasoning/types';

import { createMicroservicesTemplate } from '../architecture/engine';
import type { ArchitectureBlueprint } from '../architecture/types';

// --- Utility ---

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// --- Default Config ---

const DEFAULT_CONFIG: OrchestrationConfig = {
  enableNLP: true,
  enableReasoning: true,
  enableArchitecture: true,
  maxReasoningDepth: 10,
  confidenceThreshold: 0.5,
};

// --- Orchestration Request Builder ---

export function createRequest(
  input: string,
  mode: OrchestrationMode = 'full',
  context: Record<string, unknown> = {}
): OrchestrationRequest {
  return {
    id: generateId('req'),
    input,
    mode,
    context,
    requestedAt: new Date().toISOString(),
  };
}

// --- Intent-to-Reasoning Mapper ---

interface ReasoningMapping {
  propositions: Array<{ label: string; value: boolean; confidence: number }>;
  rules: Array<{
    name: string;
    description: string;
    conditionLabels: string[];
    conclusionLabel: string;
  }>;
  goalLabel: string;
}

const INTENT_REASONING_MAP: Record<IntentCategory, (subject: string) => ReasoningMapping> = {
  query: (subject) => ({
    propositions: [
      { label: `${subject} is requested`, value: true, confidence: 0.9 },
      { label: `${subject} information exists`, value: true, confidence: 0.7 },
    ],
    rules: [{
      name: 'Query Resolution',
      description: `Resolve query about ${subject}`,
      conditionLabels: [`${subject} is requested`, `${subject} information exists`],
      conclusionLabel: `${subject} query resolved`,
    }],
    goalLabel: `${subject} query resolved`,
  }),

  command: (subject) => ({
    propositions: [
      { label: `${subject} action authorized`, value: true, confidence: 0.85 },
      { label: `${subject} resources available`, value: true, confidence: 0.8 },
    ],
    rules: [{
      name: 'Command Execution',
      description: `Execute command on ${subject}`,
      conditionLabels: [`${subject} action authorized`, `${subject} resources available`],
      conclusionLabel: `${subject} command executed`,
    }],
    goalLabel: `${subject} command executed`,
  }),

  assertion: (subject) => ({
    propositions: [
      { label: `${subject} claim stated`, value: true, confidence: 0.75 },
      { label: `${subject} evidence supports claim`, value: true, confidence: 0.6 },
    ],
    rules: [{
      name: 'Assertion Validation',
      description: `Validate assertion about ${subject}`,
      conditionLabels: [`${subject} claim stated`, `${subject} evidence supports claim`],
      conclusionLabel: `${subject} assertion validated`,
    }],
    goalLabel: `${subject} assertion validated`,
  }),

  request: (subject) => ({
    propositions: [
      { label: `${subject} help needed`, value: true, confidence: 0.9 },
      { label: `${subject} assistance available`, value: true, confidence: 0.85 },
    ],
    rules: [{
      name: 'Request Fulfillment',
      description: `Fulfill request for ${subject}`,
      conditionLabels: [`${subject} help needed`, `${subject} assistance available`],
      conclusionLabel: `${subject} request fulfilled`,
    }],
    goalLabel: `${subject} request fulfilled`,
  }),

  clarification: (subject) => ({
    propositions: [
      { label: `${subject} is ambiguous`, value: true, confidence: 0.8 },
      { label: `${subject} context available`, value: true, confidence: 0.65 },
    ],
    rules: [{
      name: 'Clarification Resolution',
      description: `Resolve ambiguity in ${subject}`,
      conditionLabels: [`${subject} is ambiguous`, `${subject} context available`],
      conclusionLabel: `${subject} clarified`,
    }],
    goalLabel: `${subject} clarified`,
  }),

  negotiation: (subject) => ({
    propositions: [
      { label: `${subject} terms proposed`, value: true, confidence: 0.8 },
      { label: `${subject} terms acceptable`, value: true, confidence: 0.6 },
    ],
    rules: [{
      name: 'Negotiation Resolution',
      description: `Resolve negotiation for ${subject}`,
      conditionLabels: [`${subject} terms proposed`, `${subject} terms acceptable`],
      conclusionLabel: `${subject} agreement reached`,
    }],
    goalLabel: `${subject} agreement reached`,
  }),

  acknowledgment: (subject) => ({
    propositions: [
      { label: `${subject} acknowledged`, value: true, confidence: 0.95 },
    ],
    rules: [],
    goalLabel: `${subject} acknowledged`,
  }),

  error_report: (subject) => ({
    propositions: [
      { label: `${subject} error detected`, value: true, confidence: 0.9 },
      { label: `${subject} error is recoverable`, value: true, confidence: 0.5 },
    ],
    rules: [{
      name: 'Error Triage',
      description: `Triage error in ${subject}`,
      conditionLabels: [`${subject} error detected`, `${subject} error is recoverable`],
      conclusionLabel: `${subject} error triaged`,
    }],
    goalLabel: `${subject} error triaged`,
  }),
};

// --- Core Pipeline Stages ---

function runNLPStage(input: string): { result: NLPResult; durationMs: number } {
  const start = performance.now();
  const result = processNLP(input);
  return { result, durationMs: performance.now() - start };
}

function runReasoningStage(
  nlpResult: NLPResult,
  config: OrchestrationConfig
): { session: ReasoningSession; proofChains: ProofChain[]; durationMs: number } {
  const start = performance.now();
  const session = createReasoningSession();
  const proofChains: ProofChain[] = [];

  const intent = nlpResult.intents.intent;
  const subject = typeof intent.parameters['subject'] === 'string'
    ? intent.parameters['subject']
    : 'input';

  const mapper = INTENT_REASONING_MAP[intent.category];
  const mapping = mapper(subject);

  // Create propositions and add to session
  const propMap = new Map<string, ReturnType<typeof createProposition>>();
  for (const pDef of mapping.propositions) {
    const prop = createProposition(pDef.label, pDef.value, pDef.confidence);
    propMap.set(pDef.label, prop);
    addPropositionToSession(session, prop);
  }

  // Create goal proposition
  const goal = createProposition(mapping.goalLabel, null, 0);
  propMap.set(mapping.goalLabel, goal);
  addPropositionToSession(session, goal);

  // Create rules and add to session
  for (const rDef of mapping.rules) {
    const conditionProps = rDef.conditionLabels
      .map((label) => propMap.get(label))
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    if (conditionProps.length >= 2) {
      const conditions = and(...conditionProps);
      const conclusion = propMap.get(rDef.conclusionLabel) ?? goal;
      const rule = createRule(rDef.name, rDef.description, conditions, conclusion);
      addRuleToSession(session, rule);
    } else if (conditionProps.length === 1) {
      const conclusion = propMap.get(rDef.conclusionLabel) ?? goal;
      const rule = createRule(
        rDef.name,
        rDef.description,
        implies(conditionProps[0], conclusion),
        conclusion
      );
      addRuleToSession(session, rule);
    }
  }

  // Run inference
  if (session.rules.length > 0) {
    const proof = buildProofChain(goal, session.rules, session.propositions, 'forward_chaining');
    proofChains.push(proof);
  }

  // If we have enough propositions, attempt a legal syllogism
  const allProps = Array.from(session.propositions.values());
  if (allProps.length >= 2) {
    const syllogism = analyzeLegalSyllogism(allProps[0], allProps[1]);
    const syllogismProof: ProofChain = {
      id: generateId('syllogism_proof'),
      goal: syllogism.conclusion,
      steps: [{
        stepNumber: 1,
        strategy: 'modus_ponens',
        appliedRule: {
          id: generateId('syllogism_rule'),
          name: 'Legal Syllogism',
          description: `${allProps[0].label} ∧ ${allProps[1].label} → ${syllogism.conclusion.label}`,
          priority: 'high',
          conditions: and(allProps[0], allProps[1]),
          conclusion: syllogism.conclusion,
          domain: 'legal',
          tags: ['syllogism'],
          createdAt: new Date().toISOString(),
        },
        inputPropositions: [allProps[0], allProps[1]],
        derivedProposition: syllogism.conclusion,
        confidence: syllogism.strength,
        justification: `Legal syllogism: major premise "${allProps[0].label}" + minor premise "${allProps[1].label}" yields conclusion with strength ${syllogism.strength.toFixed(3)}`,
      }],
      isValid: syllogism.conclusion.value === true,
      overallConfidence: syllogism.strength,
      completedAt: new Date().toISOString(),
      durationMs: 0,
    };
    proofChains.push(syllogismProof);
  }

  completeSession(session);
  return { session, proofChains, durationMs: performance.now() - start };
}

function runArchitectureStage(): { blueprint: ArchitectureBlueprint; durationMs: number } {
  const start = performance.now();
  const blueprint = createMicroservicesTemplate();
  return { blueprint, durationMs: performance.now() - start };
}

// --- Synthesis ---

function synthesize(
  nlpResult: NLPResult | null,
  reasoningResult: { session: ReasoningSession; proofChains: ProofChain[] } | null,
  architectureResult: ArchitectureBlueprint | null
): { report: SynthesisReport; durationMs: number } {
  const start = performance.now();

  const detectedIntents: string[] = [];
  const reasoningConclusions: string[] = [];
  const architectureInsights: string[] = [];
  const recommendations: string[] = [];
  let confidenceScore = 0;

  // NLP synthesis
  if (nlpResult) {
    detectedIntents.push(
      `Primary: ${nlpResult.intents.intent.category}/${nlpResult.intents.intent.action} (${(nlpResult.intents.score * 100).toFixed(1)}%)`
    );
    for (const alt of nlpResult.intents.alternativeIntents.slice(0, 2)) {
      detectedIntents.push(`Alternative: ${alt.category}/${alt.action} (${(alt.confidence * 100).toFixed(1)}%)`);
    }

    if (nlpResult.semantics.entities.length > 0) {
      recommendations.push(
        `Extracted ${nlpResult.semantics.entities.length} entities for further processing`
      );
    }

    if (nlpResult.semantics.sentiment.polarity < -0.3) {
      recommendations.push('Negative sentiment detected — consider empathetic response framing');
    }
  }

  // Reasoning synthesis
  if (reasoningResult) {
    for (const proof of reasoningResult.proofChains) {
      if (proof.isValid) {
        reasoningConclusions.push(
          `Proved "${proof.goal.label}" in ${proof.steps.length} steps (confidence: ${(proof.overallConfidence * 100).toFixed(1)}%)`
        );
      } else {
        reasoningConclusions.push(
          `Could not prove "${proof.goal.label}" — insufficient evidence`
        );
      }
    }

    const avgConfidence = reasoningResult.proofChains.length > 0
      ? reasoningResult.proofChains.reduce((s, p) => s + p.overallConfidence, 0) / reasoningResult.proofChains.length
      : 0;
    confidenceScore = avgConfidence;
  }

  // Architecture synthesis
  if (architectureResult) {
    const totalServices = architectureResult.topology.layers.reduce(
      (sum, l) => sum + l.services.length, 0
    );
    const totalConnections = architectureResult.topology.connections.length;
    const capCount = architectureResult.capabilities.capabilities.size;

    architectureInsights.push(
      `System topology: ${totalServices} services across ${architectureResult.topology.layers.length} layers`
    );
    architectureInsights.push(`${totalConnections} service connections mapped`);
    architectureInsights.push(`${capCount} capabilities registered`);
    architectureInsights.push(
      `${architectureResult.eventPipelines.length} event pipelines configured`
    );

    if (architectureResult.metrics.errorRate > 0) {
      recommendations.push(
        `Error rate: ${(architectureResult.metrics.errorRate * 100).toFixed(1)}% — investigate unhealthy services`
      );
    }
  }

  const inputClassification = nlpResult
    ? `${nlpResult.intents.intent.category} (${nlpResult.semantics.frames[0]?.modality ?? 'declarative'})`
    : 'unclassified';

  const summaryParts: string[] = [];
  if (detectedIntents.length > 0) summaryParts.push(`NLP identified ${detectedIntents.length} intents`);
  if (reasoningConclusions.length > 0) summaryParts.push(`Reasoning produced ${reasoningConclusions.length} conclusions`);
  if (architectureInsights.length > 0) summaryParts.push(`Architecture mapped system topology`);

  const report: SynthesisReport = {
    summary: summaryParts.join('; ') || 'No processing results available',
    inputClassification,
    detectedIntents,
    reasoningConclusions,
    architectureInsights,
    confidenceScore,
    recommendations,
  };

  return { report, durationMs: performance.now() - start };
}

// --- Main Orchestrator ---

export function orchestrate(
  input: string,
  mode: OrchestrationMode = 'full',
  config: Partial<OrchestrationConfig> = {}
): OrchestrationResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const request = createRequest(input, mode);

  let nlpResult: NLPResult | null = null;
  let reasoningResult: { session: ReasoningSession; proofChains: ProofChain[] } | null = null;
  let architectureResult: ArchitectureBlueprint | null = null;

  const metrics: PipelineMetrics = {
    totalDurationMs: 0,
    nlpDurationMs: 0,
    reasoningDurationMs: 0,
    architectureDurationMs: 0,
    synthesisDurationMs: 0,
  };

  const totalStart = performance.now();

  // Stage 1: NLP Processing
  if (fullConfig.enableNLP && (mode === 'full' || mode === 'nlp_only')) {
    const nlpStage = runNLPStage(input);
    nlpResult = nlpStage.result;
    metrics.nlpDurationMs = nlpStage.durationMs;
  }

  // Stage 2: Reasoning (depends on NLP for full mode)
  if (fullConfig.enableReasoning && (mode === 'full' || mode === 'reasoning_only')) {
    const effectiveNLP = nlpResult ?? processNLP(input);
    const reasoningStage = runReasoningStage(effectiveNLP, fullConfig);
    reasoningResult = {
      session: reasoningStage.session,
      proofChains: reasoningStage.proofChains,
    };
    metrics.reasoningDurationMs = reasoningStage.durationMs;
  }

  // Stage 3: Architecture
  if (fullConfig.enableArchitecture && (mode === 'full' || mode === 'architecture_only')) {
    const archStage = runArchitectureStage();
    architectureResult = archStage.blueprint;
    metrics.architectureDurationMs = archStage.durationMs;
  }

  // Stage 4: Synthesis
  const { report, durationMs: synthDuration } = synthesize(
    nlpResult, reasoningResult, architectureResult
  );
  metrics.synthesisDurationMs = synthDuration;
  metrics.totalDurationMs = performance.now() - totalStart;

  return {
    requestId: request.id,
    stage: 'complete',
    nlpResult,
    reasoningResult,
    architectureResult,
    synthesis: report,
    metrics,
    completedAt: new Date().toISOString(),
  };
}

// --- Convenience Functions ---

export function analyzeText(input: string): OrchestrationResult {
  return orchestrate(input, 'nlp_only');
}

export function reasonAbout(input: string): OrchestrationResult {
  return orchestrate(input, 'reasoning_only');
}

export function mapArchitecture(): OrchestrationResult {
  return orchestrate('', 'architecture_only');
}

export function fullPipeline(input: string): OrchestrationResult {
  return orchestrate(input, 'full');
}
