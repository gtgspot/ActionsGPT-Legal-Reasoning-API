/**
 * Logical Reasoning Engine
 *
 * Implements forward/backward chaining inference, propositional logic evaluation,
 * proof chain generation, and legal syllogism analysis. Operates as a pure
 * computational engine with no external dependencies.
 */

import type {
  Proposition,
  LogicExpression,
  LogicOperator,
  Rule,
  InferenceStep,
  ProofChain,
  InferenceStrategy,
  EvaluationResult,
  LegalSyllogism,
  LegalPrecedent,
  ReasoningSession,
  RulePriority,
} from './types';

// --- Utility: ID Generation ---

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// --- Proposition Factory ---

export function createProposition(
  label: string,
  value: boolean | null = null,
  confidence = 1.0
): Proposition {
  return {
    id: generateId('prop'),
    label,
    value,
    status: value === null ? 'hypothetical' : 'assumed',
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

// --- Logic Expression Builder ---

export function and(...operands: Array<Proposition | LogicExpression>): LogicExpression {
  return { operator: 'AND', operands };
}

export function or(...operands: Array<Proposition | LogicExpression>): LogicExpression {
  return { operator: 'OR', operands };
}

export function not(operand: Proposition | LogicExpression): LogicExpression {
  return { operator: 'NOT', operands: [operand] };
}

export function implies(
  antecedent: Proposition | LogicExpression,
  consequent: Proposition | LogicExpression
): LogicExpression {
  return { operator: 'IMPLIES', operands: [antecedent, consequent] };
}

export function iff(
  left: Proposition | LogicExpression,
  right: Proposition | LogicExpression
): LogicExpression {
  return { operator: 'IFF', operands: [left, right] };
}

export function xor(
  left: Proposition | LogicExpression,
  right: Proposition | LogicExpression
): LogicExpression {
  return { operator: 'XOR', operands: [left, right] };
}

// --- Expression Evaluation ---

function isProposition(node: Proposition | LogicExpression): node is Proposition {
  return 'label' in node && 'value' in node;
}

function resolveValue(node: Proposition | LogicExpression): boolean {
  if (isProposition(node)) {
    return node.value === true;
  }
  return evaluateExpression(node);
}

export function evaluateExpression(expr: LogicExpression): boolean {
  const { operator, operands } = expr;

  switch (operator) {
    case 'AND':
      return operands.every(resolveValue);

    case 'OR':
      return operands.some(resolveValue);

    case 'NOT':
      return !resolveValue(operands[0]);

    case 'IMPLIES': {
      const antecedent = resolveValue(operands[0]);
      const consequent = resolveValue(operands[1]);
      return !antecedent || consequent;
    }

    case 'IFF': {
      const left = resolveValue(operands[0]);
      const right = resolveValue(operands[1]);
      return left === right;
    }

    case 'XOR': {
      const a = resolveValue(operands[0]);
      const b = resolveValue(operands[1]);
      return a !== b;
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

// --- Truth Table Generation ---

function extractPropositions(expr: LogicExpression): Proposition[] {
  const found: Proposition[] = [];
  const seen = new Set<string>();

  function walk(node: Proposition | LogicExpression) {
    if (isProposition(node)) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        found.push(node);
      }
    } else {
      node.operands.forEach(walk);
    }
  }

  walk(expr);
  return found;
}

export function generateTruthTable(
  expr: LogicExpression
): { assignments: Array<Record<string, boolean>>; results: boolean[] } {
  const props = extractPropositions(expr);
  const n = props.length;
  const totalRows = Math.pow(2, n);
  const assignments: Array<Record<string, boolean>> = [];
  const results: boolean[] = [];

  for (let i = 0; i < totalRows; i++) {
    const assignment: Record<string, boolean> = {};
    for (let j = 0; j < n; j++) {
      const val = Boolean((i >> (n - 1 - j)) & 1);
      props[j].value = val;
      props[j].status = 'assumed';
      assignment[props[j].label] = val;
    }
    assignments.push(assignment);
    results.push(evaluateExpression(expr));
  }

  return { assignments, results };
}

export function evaluateWithDetails(expr: LogicExpression): EvaluationResult {
  const props = extractPropositions(expr);
  const truthTable = new Map<string, boolean>();
  const evaluationPath: string[] = [];

  for (const p of props) {
    truthTable.set(p.label, p.value === true);
    evaluationPath.push(`${p.label} = ${p.value}`);
  }

  const result = evaluateExpression(expr);
  evaluationPath.push(`Result = ${result}`);

  return { expression: expr, result, truthTable, evaluationPath };
}

// --- Rule Engine ---

export function createRule(
  name: string,
  description: string,
  conditions: LogicExpression,
  conclusion: Proposition,
  priority: RulePriority = 'medium',
  domain = 'general'
): Rule {
  return {
    id: generateId('rule'),
    name,
    description,
    priority,
    conditions,
    conclusion,
    domain,
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

const PRIORITY_ORDER: Record<RulePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  advisory: 4,
};

function sortRulesByPriority(rules: Rule[]): Rule[] {
  return [...rules].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

// --- Forward Chaining ---

export function forwardChain(
  rules: Rule[],
  facts: Map<string, Proposition>,
  maxIterations = 100
): InferenceStep[] {
  const steps: InferenceStep[] = [];
  const sortedRules = sortRulesByPriority(rules);
  let changed = true;
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    for (const rule of sortedRules) {
      if (facts.has(rule.conclusion.id)) continue;

      const conditionsMet = evaluateExpression(rule.conditions);
      if (conditionsMet) {
        const conditionProps = extractPropositions(rule.conditions);
        const minConfidence = Math.min(
          ...conditionProps.map((p) => p.confidence),
          1.0
        );
        const derivedConfidence = minConfidence * 0.95; // decay factor

        const derived: Proposition = {
          ...rule.conclusion,
          value: true,
          status: 'derived',
          confidence: derivedConfidence,
        };

        facts.set(derived.id, derived);
        changed = true;

        steps.push({
          stepNumber: steps.length + 1,
          strategy: 'forward_chaining',
          appliedRule: rule,
          inputPropositions: conditionProps.filter((p) => p.value === true),
          derivedProposition: derived,
          confidence: derivedConfidence,
          justification: `Rule "${rule.name}" fired: conditions met with confidence ${derivedConfidence.toFixed(3)}`,
        });
      }
    }
  }

  return steps;
}

// --- Backward Chaining ---

export function backwardChain(
  goal: Proposition,
  rules: Rule[],
  facts: Map<string, Proposition>,
  visited = new Set<string>()
): InferenceStep[] {
  if (visited.has(goal.id)) return [];
  visited.add(goal.id);

  const existing = facts.get(goal.id);
  if (existing && existing.value === true) return [];

  const steps: InferenceStep[] = [];
  const applicableRules = rules.filter((r) => r.conclusion.label === goal.label);

  for (const rule of sortRulesByPriority(applicableRules)) {
    const subGoals = extractPropositions(rule.conditions);
    let allSubGoalsMet = true;
    const subSteps: InferenceStep[] = [];

    for (const subGoal of subGoals) {
      const existingFact = facts.get(subGoal.id);
      if (existingFact && existingFact.value === true) continue;

      const subResult = backwardChain(subGoal, rules, facts, visited);
      if (subResult.length > 0) {
        subSteps.push(...subResult);
      } else if (!facts.get(subGoal.id)?.value) {
        allSubGoalsMet = false;
        break;
      }
    }

    if (allSubGoalsMet) {
      steps.push(...subSteps);

      const conditionProps = subGoals.filter(
        (p) => facts.get(p.id)?.value === true || p.value === true
      );
      const minConfidence = conditionProps.length > 0
        ? Math.min(...conditionProps.map((p) => p.confidence))
        : 0.5;

      const derived: Proposition = {
        ...goal,
        value: true,
        status: 'derived',
        confidence: minConfidence * 0.95,
      };

      facts.set(derived.id, derived);

      steps.push({
        stepNumber: steps.length + 1,
        strategy: 'backward_chaining',
        appliedRule: rule,
        inputPropositions: conditionProps,
        derivedProposition: derived,
        confidence: derived.confidence,
        justification: `Backward chaining proved "${goal.label}" via rule "${rule.name}"`,
      });

      return steps;
    }
  }

  return steps;
}

// --- Modus Ponens ---

export function modusPonens(
  antecedent: Proposition,
  implication: LogicExpression
): Proposition | null {
  if (implication.operator !== 'IMPLIES') return null;
  if (antecedent.value !== true) return null;

  const premiseNode = implication.operands[0];
  if (isProposition(premiseNode) && premiseNode.id === antecedent.id) {
    const consequentNode = implication.operands[1];
    if (isProposition(consequentNode)) {
      return {
        ...consequentNode,
        value: true,
        status: 'derived',
        confidence: antecedent.confidence * consequentNode.confidence,
      };
    }
  }

  return null;
}

// --- Proof Chain Builder ---

export function buildProofChain(
  goal: Proposition,
  rules: Rule[],
  facts: Map<string, Proposition>,
  strategy: InferenceStrategy = 'forward_chaining'
): ProofChain {
  const startTime = performance.now();
  let steps: InferenceStep[];

  switch (strategy) {
    case 'forward_chaining':
      steps = forwardChain(rules, facts);
      break;
    case 'backward_chaining':
      steps = backwardChain(goal, rules, facts);
      break;
    case 'modus_ponens':
      steps = forwardChain(rules, facts, 1);
      break;
    default:
      steps = forwardChain(rules, facts);
  }

  const goalAchieved = facts.get(goal.id)?.value === true ||
    steps.some((s) => s.derivedProposition.label === goal.label && s.derivedProposition.value === true);

  const overallConfidence = steps.length > 0
    ? steps[steps.length - 1].confidence
    : 0;

  return {
    id: generateId('proof'),
    goal,
    steps,
    isValid: goalAchieved,
    overallConfidence,
    completedAt: new Date().toISOString(),
    durationMs: performance.now() - startTime,
  };
}

// --- Legal Syllogism Analysis ---

export function analyzeLegalSyllogism(
  majorPremise: Proposition,
  minorPremise: Proposition,
  precedents: LegalPrecedent[] = []
): LegalSyllogism {
  const conclusionValue =
    majorPremise.value === true && minorPremise.value === true;

  const avgRelevance = precedents.length > 0
    ? precedents.reduce((sum, p) => sum + p.relevanceScore, 0) / precedents.length
    : 0;

  const baseStrength =
    majorPremise.confidence * minorPremise.confidence * (conclusionValue ? 1 : 0.1);
  const precedentBoost = avgRelevance * 0.2;
  const strength = Math.min(1, baseStrength + precedentBoost);

  const conclusion: Proposition = {
    id: generateId('conclusion'),
    label: `Conclusion: ${majorPremise.label} ∧ ${minorPremise.label}`,
    value: conclusionValue,
    status: 'derived',
    confidence: strength,
  };

  return {
    majorPremise,
    minorPremise,
    conclusion,
    precedents,
    strength,
  };
}

// --- Consistency Checking ---

export function checkConsistency(propositions: Proposition[]): {
  isConsistent: boolean;
  conflicts: Array<[Proposition, Proposition]>;
} {
  const conflicts: Array<[Proposition, Proposition]> = [];
  const byLabel = new Map<string, Proposition[]>();

  for (const p of propositions) {
    const existing = byLabel.get(p.label) ?? [];
    existing.push(p);
    byLabel.set(p.label, existing);
  }

  for (const [, group] of byLabel) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (
          group[i].value !== null &&
          group[j].value !== null &&
          group[i].value !== group[j].value
        ) {
          conflicts.push([group[i], group[j]]);
        }
      }
    }
  }

  return { isConsistent: conflicts.length === 0, conflicts };
}

// --- Reasoning Session Management ---

export function createReasoningSession(): ReasoningSession {
  return {
    id: generateId('session'),
    propositions: new Map(),
    rules: [],
    proofChains: [],
    startedAt: new Date().toISOString(),
    status: 'active',
  };
}

export function addPropositionToSession(
  session: ReasoningSession,
  proposition: Proposition
): void {
  session.propositions.set(proposition.id, proposition);
}

export function addRuleToSession(session: ReasoningSession, rule: Rule): void {
  session.rules.push(rule);
}

export function runSessionInference(
  session: ReasoningSession,
  goal: Proposition,
  strategy: InferenceStrategy = 'forward_chaining'
): ProofChain {
  const proof = buildProofChain(goal, session.rules, session.propositions, strategy);
  session.proofChains.push(proof);
  return proof;
}

export function completeSession(session: ReasoningSession): void {
  session.status = 'completed';
}
