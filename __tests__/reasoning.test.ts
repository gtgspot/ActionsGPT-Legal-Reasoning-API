import { describe, it, expect } from 'vitest';
import {
  createProposition,
  and,
  or,
  not,
  implies,
  iff,
  xor,
  evaluateExpression,
  generateTruthTable,
  evaluateWithDetails,
  createRule,
  forwardChain,
  backwardChain,
  buildProofChain,
  modusPonens,
  analyzeLegalSyllogism,
  checkConsistency,
  createReasoningSession,
  addPropositionToSession,
  addRuleToSession,
  runSessionInference,
  completeSession,
} from '../lib/reasoning/engine';

describe('Logical Reasoning Engine', () => {
  describe('Proposition creation', () => {
    it('creates a proposition with default values', () => {
      const p = createProposition('A');
      expect(p.label).toBe('A');
      expect(p.value).toBeNull();
      expect(p.status).toBe('hypothetical');
      expect(p.confidence).toBe(1.0);
      expect(p.id).toMatch(/^prop_/);
    });

    it('creates a proposition with explicit values', () => {
      const p = createProposition('B', true, 0.8);
      expect(p.value).toBe(true);
      expect(p.status).toBe('assumed');
      expect(p.confidence).toBe(0.8);
    });

    it('clamps confidence to [0, 1]', () => {
      const overMax = createProposition('X', true, 1.5);
      expect(overMax.confidence).toBe(1.0);

      const underMin = createProposition('Y', true, -0.5);
      expect(underMin.confidence).toBe(0);
    });
  });

  describe('Logic expression evaluation', () => {
    it('evaluates AND correctly', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', true);
      const c = createProposition('C', false);

      expect(evaluateExpression(and(a, b))).toBe(true);
      expect(evaluateExpression(and(a, c))).toBe(false);
      expect(evaluateExpression(and(c, c))).toBe(false);
    });

    it('evaluates OR correctly', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', false);

      expect(evaluateExpression(or(a, b))).toBe(true);
      expect(evaluateExpression(or(b, b))).toBe(false);
    });

    it('evaluates NOT correctly', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', false);

      expect(evaluateExpression(not(a))).toBe(false);
      expect(evaluateExpression(not(b))).toBe(true);
    });

    it('evaluates IMPLIES correctly (P → Q)', () => {
      const t = createProposition('T', true);
      const f = createProposition('F', false);

      // T → T = T
      expect(evaluateExpression(implies(t, createProposition('T2', true)))).toBe(true);
      // T → F = F
      expect(evaluateExpression(implies(t, f))).toBe(false);
      // F → T = T
      expect(evaluateExpression(implies(f, t))).toBe(true);
      // F → F = T
      expect(evaluateExpression(implies(f, createProposition('F2', false)))).toBe(true);
    });

    it('evaluates IFF correctly (P ↔ Q)', () => {
      const t = createProposition('T', true);
      const f = createProposition('F', false);

      expect(evaluateExpression(iff(t, createProposition('T2', true)))).toBe(true);
      expect(evaluateExpression(iff(f, createProposition('F2', false)))).toBe(true);
      expect(evaluateExpression(iff(t, f))).toBe(false);
    });

    it('evaluates XOR correctly', () => {
      const t = createProposition('T', true);
      const f = createProposition('F', false);

      expect(evaluateExpression(xor(t, f))).toBe(true);
      expect(evaluateExpression(xor(t, createProposition('T2', true)))).toBe(false);
    });

    it('evaluates nested expressions', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', false);
      const c = createProposition('C', true);

      // (A AND NOT(B)) OR C = (true AND true) OR true = true
      const expr = or(and(a, not(b)), c);
      expect(evaluateExpression(expr)).toBe(true);
    });
  });

  describe('Truth table generation', () => {
    it('generates truth table for simple AND', () => {
      const a = createProposition('A', null);
      const b = createProposition('B', null);
      const { assignments, results } = generateTruthTable(and(a, b));

      expect(assignments).toHaveLength(4);
      expect(results).toHaveLength(4);

      // AND truth table: only TT = T
      const ttIndex = assignments.findIndex((row) => row['A'] === true && row['B'] === true);
      expect(results[ttIndex]).toBe(true);

      const tfIndex = assignments.findIndex((row) => row['A'] === true && row['B'] === false);
      expect(results[tfIndex]).toBe(false);
    });

    it('generates truth table for OR', () => {
      const a = createProposition('A', null);
      const b = createProposition('B', null);
      const { assignments, results } = generateTruthTable(or(a, b));

      // OR: only FF = F
      const ffIndex = assignments.findIndex((row) => row['A'] === false && row['B'] === false);
      expect(results[ffIndex]).toBe(false);

      const ttIndex = assignments.findIndex((row) => row['A'] === true && row['B'] === true);
      expect(results[ttIndex]).toBe(true);
    });
  });

  describe('Evaluate with details', () => {
    it('returns evaluation path and truth table', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', false);
      const result = evaluateWithDetails(and(a, b));

      expect(result.result).toBe(false);
      expect(result.truthTable.get('A')).toBe(true);
      expect(result.truthTable.get('B')).toBe(false);
      expect(result.evaluationPath.length).toBeGreaterThan(0);
    });
  });

  describe('Forward chaining', () => {
    it('derives new facts from rules', () => {
      const hasCitizenship = createProposition('has citizenship', true);
      const hasPassport = createProposition('has passport', true);
      const canTravel = createProposition('can travel', null);

      const facts = new Map([
        [hasCitizenship.id, hasCitizenship],
        [hasPassport.id, hasPassport],
      ]);

      const rule = createRule(
        'Travel eligibility',
        'A citizen with passport can travel',
        and(hasCitizenship, hasPassport),
        canTravel,
        'high'
      );

      const steps = forwardChain([rule], facts);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].derivedProposition.label).toBe('can travel');
      expect(steps[0].derivedProposition.value).toBe(true);
    });

    it('does not fire rules when conditions are not met', () => {
      const a = createProposition('A', true);
      const b = createProposition('B', false);
      const c = createProposition('C', null);

      const facts = new Map([
        [a.id, a],
        [b.id, b],
      ]);

      const rule = createRule('Test', 'Test rule', and(a, b), c);
      const steps = forwardChain([rule], facts);
      expect(steps).toHaveLength(0);
    });
  });

  describe('Backward chaining', () => {
    it('proves a goal by working backward from rules', () => {
      const a = createProposition('A', true, 0.9);
      const b = createProposition('B', true, 0.85);
      const goal = createProposition('Goal', null);

      const facts = new Map([
        [a.id, a],
        [b.id, b],
      ]);

      const rule = createRule('Prove Goal', 'Derive goal from A and B', and(a, b), goal);
      const steps = backwardChain(goal, [rule], facts);
      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('Modus ponens', () => {
    it('derives consequent when antecedent is true', () => {
      const p = createProposition('P', true, 0.9);
      const q = createProposition('Q', null, 0.8);
      const implication = implies(p, q);

      const result = modusPonens(p, implication);
      expect(result).not.toBeNull();
      expect(result!.value).toBe(true);
      expect(result!.status).toBe('derived');
    });

    it('returns null for non-implication', () => {
      const p = createProposition('P', true);
      const result = modusPonens(p, and(p, p));
      expect(result).toBeNull();
    });

    it('returns null when antecedent is false', () => {
      const p = createProposition('P', false);
      const q = createProposition('Q', null);
      const result = modusPonens(p, implies(p, q));
      expect(result).toBeNull();
    });
  });

  describe('Proof chain builder', () => {
    it('builds a valid proof chain', () => {
      const a = createProposition('A', true, 0.95);
      const b = createProposition('B', true, 0.9);
      const goal = createProposition('Conclusion', null);

      const rule = createRule('Main Rule', 'Derive conclusion', and(a, b), goal);
      const facts = new Map([
        [a.id, a],
        [b.id, b],
      ]);

      const proof = buildProofChain(goal, [rule], facts, 'forward_chaining');
      expect(proof.id).toMatch(/^proof_/);
      expect(proof.isValid).toBe(true);
      expect(proof.overallConfidence).toBeGreaterThan(0);
      expect(proof.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Legal syllogism', () => {
    it('produces a valid syllogism when both premises are true', () => {
      const major = createProposition('All citizens have rights', true, 0.95);
      const minor = createProposition('John is a citizen', true, 0.9);

      const syllogism = analyzeLegalSyllogism(major, minor);
      expect(syllogism.conclusion.value).toBe(true);
      expect(syllogism.strength).toBeGreaterThan(0);
      expect(syllogism.conclusion.label).toContain('All citizens have rights');
    });

    it('produces weak syllogism when a premise is false', () => {
      const major = createProposition('Rule applies', true, 0.9);
      const minor = createProposition('Facts match', false, 0.8);

      const syllogism = analyzeLegalSyllogism(major, minor);
      expect(syllogism.conclusion.value).toBe(false);
      expect(syllogism.strength).toBeLessThan(0.5);
    });

    it('accounts for precedent relevance', () => {
      const major = createProposition('Statute X applies', true, 0.9);
      const minor = createProposition('Defendant meets criteria', true, 0.85);

      const withPrecedents = analyzeLegalSyllogism(major, minor, [
        {
          caseId: 'case-1',
          caseName: 'Smith v. State',
          jurisdiction: 'Federal',
          year: 2020,
          domain: 'statutory',
          holdingProposition: createProposition('Statute X upheld', true),
          relevanceScore: 0.9,
        },
      ]);

      const withoutPrecedents = analyzeLegalSyllogism(major, minor, []);
      expect(withPrecedents.strength).toBeGreaterThan(withoutPrecedents.strength);
    });
  });

  describe('Consistency checking', () => {
    it('detects consistent proposition set', () => {
      const a = createProposition('X', true);
      const b = createProposition('Y', false);
      const result = checkConsistency([a, b]);
      expect(result.isConsistent).toBe(true);
      expect(result.conflicts).toHaveLength(0);
    });

    it('detects contradictions', () => {
      const a = createProposition('X', true);
      const b = createProposition('X', false);
      const result = checkConsistency([a, b]);
      expect(result.isConsistent).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('Reasoning session', () => {
    it('manages a full reasoning session lifecycle', () => {
      const session = createReasoningSession();
      expect(session.status).toBe('active');

      const a = createProposition('Premise A', true, 0.9);
      const b = createProposition('Premise B', true, 0.85);
      const goal = createProposition('Session Goal', null);

      addPropositionToSession(session, a);
      addPropositionToSession(session, b);
      addPropositionToSession(session, goal);
      expect(session.propositions.size).toBe(3);

      const rule = createRule('Session Rule', 'Test', and(a, b), goal);
      addRuleToSession(session, rule);
      expect(session.rules).toHaveLength(1);

      const proof = runSessionInference(session, goal);
      expect(session.proofChains).toHaveLength(1);
      expect(proof.goal.label).toBe('Session Goal');

      completeSession(session);
      expect(session.status).toBe('completed');
    });
  });
});
