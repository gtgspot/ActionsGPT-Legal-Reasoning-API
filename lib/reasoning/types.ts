/**
 * Type definitions for the Logical Reasoning Engine.
 *
 * Supports propositional logic, first-order logic, legal syllogisms,
 * and multi-step proof chain generation with confidence scoring.
 */

// --- Primitive Logic Types ---

export type LogicOperator = 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'XOR';

export type Quantifier = 'FORALL' | 'EXISTS' | 'NONE';

export type PropositionStatus = 'assumed' | 'derived' | 'negated' | 'hypothetical';

export interface Proposition {
  id: string;
  label: string;
  value: boolean | null;
  status: PropositionStatus;
  confidence: number; // 0.0 to 1.0
  metadata?: Record<string, unknown>;
}

export interface LogicExpression {
  operator: LogicOperator;
  operands: Array<Proposition | LogicExpression>;
}

// --- Rule System ---

export type RulePriority = 'critical' | 'high' | 'medium' | 'low' | 'advisory';

export interface Rule {
  id: string;
  name: string;
  description: string;
  priority: RulePriority;
  conditions: LogicExpression;
  conclusion: Proposition;
  domain: string;
  tags: string[];
  createdAt: string;
}

export interface RuleSet {
  id: string;
  name: string;
  version: string;
  rules: Rule[];
  domain: string;
}

// --- Inference Engine ---

export type InferenceStrategy = 'forward_chaining' | 'backward_chaining' | 'resolution' | 'modus_ponens';

export interface InferenceStep {
  stepNumber: number;
  strategy: InferenceStrategy;
  appliedRule: Rule;
  inputPropositions: Proposition[];
  derivedProposition: Proposition;
  confidence: number;
  justification: string;
}

export interface ProofChain {
  id: string;
  goal: Proposition;
  steps: InferenceStep[];
  isValid: boolean;
  overallConfidence: number;
  completedAt: string;
  durationMs: number;
}

// --- Legal Reasoning Extensions ---

export type LegalDomain = 'constitutional' | 'statutory' | 'regulatory' | 'case_law' | 'international' | 'procedural';

export interface LegalPrecedent {
  caseId: string;
  caseName: string;
  jurisdiction: string;
  year: number;
  domain: LegalDomain;
  holdingProposition: Proposition;
  relevanceScore: number;
}

export interface LegalSyllogism {
  majorPremise: Proposition;  // General legal rule
  minorPremise: Proposition;  // Specific fact pattern
  conclusion: Proposition;    // Legal conclusion
  precedents: LegalPrecedent[];
  strength: number;           // 0.0 to 1.0
}

// --- Evaluation Results ---

export interface EvaluationResult {
  expression: LogicExpression;
  result: boolean;
  truthTable: Map<string, boolean>;
  evaluationPath: string[];
}

export interface ReasoningSession {
  id: string;
  propositions: Map<string, Proposition>;
  rules: Rule[];
  proofChains: ProofChain[];
  startedAt: string;
  status: 'active' | 'completed' | 'failed';
}
