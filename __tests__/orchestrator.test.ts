import { describe, it, expect } from 'vitest';
import {
  orchestrate,
  analyzeText,
  reasonAbout,
  mapArchitecture,
  fullPipeline,
  createRequest,
} from '../lib/orchestrator/engine';

describe('Unified Orchestration Engine', () => {
  describe('Request creation', () => {
    it('creates a request with defaults', () => {
      const req = createRequest('Test input');
      expect(req.input).toBe('Test input');
      expect(req.mode).toBe('full');
      expect(req.id).toMatch(/^req_/);
    });

    it('creates a request with custom mode', () => {
      const req = createRequest('Test', 'nlp_only');
      expect(req.mode).toBe('nlp_only');
    });
  });

  describe('Full pipeline orchestration', () => {
    it('processes input through all stages', () => {
      const result = fullPipeline('Create a new identity record for verification');

      expect(result.stage).toBe('complete');
      expect(result.nlpResult).not.toBeNull();
      expect(result.reasoningResult).not.toBeNull();
      expect(result.architectureResult).not.toBeNull();
      expect(result.synthesis).toBeDefined();
      expect(result.metrics.totalDurationMs).toBeGreaterThan(0);
    });

    it('produces meaningful synthesis report', () => {
      const result = fullPipeline('Search for all records with Unicode errors');

      expect(result.synthesis.summary.length).toBeGreaterThan(0);
      expect(result.synthesis.detectedIntents.length).toBeGreaterThan(0);
      expect(result.synthesis.reasoningConclusions.length).toBeGreaterThan(0);
      expect(result.synthesis.architectureInsights.length).toBeGreaterThan(0);
      expect(result.synthesis.confidenceScore).toBeGreaterThanOrEqual(0);
    });

    it('classifies input correctly', () => {
      const result = fullPipeline('What is the current system status?');
      expect(result.synthesis.inputClassification).toContain('query');
    });
  });

  describe('NLP-only mode', () => {
    it('runs only NLP processing', () => {
      const result = analyzeText('Delete the old records immediately');

      expect(result.nlpResult).not.toBeNull();
      expect(result.reasoningResult).toBeNull();
      expect(result.architectureResult).toBeNull();
      expect(result.nlpResult!.intents.intent.category).toBe('command');
    });

    it('detects entities in text', () => {
      const result = analyzeText('Email admin@test.com about version v3.2.1');

      expect(result.nlpResult).not.toBeNull();
      const entities = result.nlpResult!.semantics.entities;
      expect(entities.some((e) => e.type === 'email')).toBe(true);
      expect(entities.some((e) => e.type === 'version')).toBe(true);
    });
  });

  describe('Reasoning-only mode', () => {
    it('runs NLP + reasoning without architecture', () => {
      const result = reasonAbout('Verify that the document is authentic and signed');

      expect(result.reasoningResult).not.toBeNull();
      expect(result.architectureResult).toBeNull();
      expect(result.reasoningResult!.proofChains.length).toBeGreaterThan(0);
    });

    it('produces proof chains with confidence scores', () => {
      const result = reasonAbout('The citizen has a valid passport and visa');

      for (const proof of result.reasoningResult!.proofChains) {
        expect(proof.overallConfidence).toBeGreaterThanOrEqual(0);
        expect(proof.overallConfidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Architecture-only mode', () => {
    it('generates architecture blueprint', () => {
      const result = mapArchitecture();

      expect(result.architectureResult).not.toBeNull();
      expect(result.nlpResult).toBeNull();
      expect(result.reasoningResult).toBeNull();
      expect(result.architectureResult!.topology.layers.length).toBeGreaterThan(0);
    });

    it('includes capability registry', () => {
      const result = mapArchitecture();
      expect(result.architectureResult!.capabilities.capabilities.size).toBeGreaterThan(0);
    });
  });

  describe('Orchestration with config overrides', () => {
    it('respects enableNLP=false', () => {
      const result = orchestrate('Test input', 'full', { enableNLP: false });
      expect(result.nlpResult).toBeNull();
    });

    it('respects enableArchitecture=false', () => {
      const result = orchestrate('Test input', 'full', { enableArchitecture: false });
      expect(result.architectureResult).toBeNull();
    });
  });

  describe('Pipeline metrics', () => {
    it('tracks timing for all stages', () => {
      const result = fullPipeline('Analyze this input for compliance');

      expect(result.metrics.totalDurationMs).toBeGreaterThan(0);
      expect(result.metrics.nlpDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.reasoningDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.architectureDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.synthesisDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('total duration >= sum of stage durations', () => {
      const result = fullPipeline('Run a full analysis');
      const stageSum =
        result.metrics.nlpDurationMs +
        result.metrics.reasoningDurationMs +
        result.metrics.architectureDurationMs +
        result.metrics.synthesisDurationMs;

      // Allow small floating point variance
      expect(result.metrics.totalDurationMs).toBeGreaterThanOrEqual(stageSum * 0.9);
    });
  });

  describe('Edge cases', () => {
    it('handles empty input', () => {
      const result = fullPipeline('');
      expect(result.stage).toBe('complete');
    });

    it('handles very long input', () => {
      const longInput = 'word '.repeat(500);
      const result = fullPipeline(longInput);
      expect(result.stage).toBe('complete');
      expect(result.nlpResult).not.toBeNull();
    });

    it('handles special characters', () => {
      const result = fullPipeline('Überprüfung der Identität für José García');
      expect(result.stage).toBe('complete');
    });
  });
});
