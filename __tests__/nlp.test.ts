import { describe, it, expect } from 'vitest';
import {
  tokenize,
  getWordTokens,
  recognizeIntent,
  extractEntities,
  analyzeSemantics,
  parseDiscourse,
  processNLP,
  createProtocolSession,
  advancePhase,
  sendProtocolMessage,
  negotiateCapabilities,
} from '../lib/nlp/engine';

describe('Natural Language Protocol Engine', () => {
  describe('Tokenizer', () => {
    it('tokenizes simple text', () => {
      const tokens = tokenize('Hello world');
      const words = getWordTokens(tokens);
      expect(words).toHaveLength(2);
      expect(words[0].value).toBe('Hello');
      expect(words[1].value).toBe('world');
    });

    it('tokenizes mixed content', () => {
      const tokens = tokenize('Create 5 items!');
      expect(tokens.some((t) => t.type === 'word')).toBe(true);
      expect(tokens.some((t) => t.type === 'number')).toBe(true);
      expect(tokens.some((t) => t.type === 'punctuation')).toBe(true);
    });

    it('preserves positions', () => {
      const tokens = tokenize('a b');
      const words = getWordTokens(tokens);
      expect(words[0].position).toBe(0);
      expect(words[1].position).toBe(2);
    });

    it('normalizes tokens to lowercase', () => {
      const tokens = tokenize('UPPERCASE');
      expect(tokens[0].normalized).toBe('uppercase');
    });

    it('handles empty input', () => {
      const tokens = tokenize('');
      expect(tokens).toHaveLength(0);
    });
  });

  describe('Intent recognition', () => {
    it('recognizes query intents', () => {
      const tokens = tokenize('Find the nearest location');
      const match = recognizeIntent(tokens);
      expect(match.intent.category).toBe('query');
      expect(match.intent.action).toBe('search');
      expect(match.score).toBeGreaterThan(0);
    });

    it('recognizes command intents', () => {
      const tokens = tokenize('Create a new document');
      const match = recognizeIntent(tokens);
      expect(match.intent.category).toBe('command');
      expect(match.intent.action).toBe('create');
    });

    it('recognizes error report intents', () => {
      const tokens = tokenize('There is an error in the system');
      const match = recognizeIntent(tokens);
      expect(match.intent.category).toBe('error_report');
    });

    it('provides alternative intents', () => {
      const tokens = tokenize('Help me find and create a report');
      const match = recognizeIntent(tokens);
      expect(match.alternativeIntents.length).toBeGreaterThan(0);
    });

    it('handles unrecognizable input', () => {
      const tokens = tokenize('xyz qwerty asdf');
      const match = recognizeIntent(tokens);
      expect(match.intent.action).toBe('unknown');
      expect(match.score).toBeLessThanOrEqual(0.2);
    });
  });

  describe('Entity extraction', () => {
    it('extracts email addresses', () => {
      const entities = extractEntities('Contact us at admin@example.com');
      const emails = entities.filter((e) => e.type === 'email');
      expect(emails).toHaveLength(1);
      expect(emails[0].text).toBe('admin@example.com');
    });

    it('extracts dates', () => {
      const entities = extractEntities('Meeting on 2024-01-15');
      const dates = entities.filter((e) => e.type === 'date');
      expect(dates).toHaveLength(1);
      expect(dates[0].text).toBe('2024-01-15');
    });

    it('extracts version numbers', () => {
      const entities = extractEntities('Upgraded to v2.1.3');
      const versions = entities.filter((e) => e.type === 'version');
      expect(versions).toHaveLength(1);
      expect(versions[0].text).toBe('v2.1.3');
    });

    it('extracts URLs', () => {
      const entities = extractEntities('Visit https://example.com/page');
      const urls = entities.filter((e) => e.type === 'url');
      expect(urls).toHaveLength(1);
    });

    it('extracts quoted strings', () => {
      const entities = extractEntities('Search for "legal precedent"');
      const quoted = entities.filter((e) => e.type === 'quoted_string');
      expect(quoted).toHaveLength(1);
      expect(quoted[0].text).toBe('"legal precedent"');
    });

    it('extracts percentages', () => {
      const entities = extractEntities('Confidence is 95.5%');
      const pct = entities.filter((e) => e.type === 'percentage');
      expect(pct).toHaveLength(1);
      expect(pct[0].text).toBe('95.5%');
    });

    it('returns entities sorted by offset', () => {
      const entities = extractEntities('Email admin@test.com and visit https://test.com');
      for (let i = 1; i < entities.length; i++) {
        expect(entities[i].startOffset).toBeGreaterThanOrEqual(entities[i - 1].startOffset);
      }
    });
  });

  describe('Semantic analysis', () => {
    it('detects interrogative modality', () => {
      const tokens = tokenize('What is the status?');
      const analysis = analyzeSemantics('What is the status?', tokens);
      expect(analysis.frames[0].modality).toBe('interrogative');
    });

    it('detects imperative modality', () => {
      const tokens = tokenize('Please create a report');
      const analysis = analyzeSemantics('Please create a report', tokens);
      expect(analysis.frames[0].modality).toBe('imperative');
    });

    it('detects conditional modality', () => {
      const tokens = tokenize('If the test passes, deploy');
      const analysis = analyzeSemantics('If the test passes, deploy', tokens);
      expect(analysis.frames[0].modality).toBe('conditional');
    });

    it('detects negation', () => {
      const tokens = tokenize('This is not valid');
      const analysis = analyzeSemantics('This is not valid', tokens);
      expect(analysis.frames.some((f) => f.negated)).toBe(true);
    });

    it('computes positive sentiment', () => {
      const tokens = tokenize('This is a great and excellent solution');
      const analysis = analyzeSemantics('This is a great and excellent solution', tokens);
      expect(analysis.sentiment.polarity).toBeGreaterThan(0);
    });

    it('computes negative sentiment', () => {
      const tokens = tokenize('This is terrible and broken');
      const analysis = analyzeSemantics('This is terrible and broken', tokens);
      expect(analysis.sentiment.polarity).toBeLessThan(0);
    });

    it('computes complexity score between 0 and 1', () => {
      const tokens = tokenize('Analyze the complex multilingual identity records with cryptographic verification and Unicode normalization');
      const analysis = analyzeSemantics('Analyze the complex multilingual identity records', tokens);
      expect(analysis.complexity).toBeGreaterThanOrEqual(0);
      expect(analysis.complexity).toBeLessThanOrEqual(1);
    });
  });

  describe('Discourse parsing', () => {
    it('parses single sentence', () => {
      const tree = parseDiscourse('The system is running.');
      expect(tree.units).toHaveLength(1);
      expect(tree.root.text).toBe('The system is running');
    });

    it('parses multiple sentences with relations', () => {
      const tree = parseDiscourse('The test failed. However, the system recovered. Therefore, we can proceed.');
      expect(tree.units).toHaveLength(3);
    });

    it('detects contrast discourse relation', () => {
      const tree = parseDiscourse('First step done. However the second step failed.');
      const contrastUnit = tree.units.find((u) => u.relation === 'contrast');
      expect(contrastUnit).toBeDefined();
    });

    it('detects causal discourse relation', () => {
      const tree = parseDiscourse('Step one. Because this happened, step two.');
      const causalUnit = tree.units.find((u) => u.relation === 'cause');
      expect(causalUnit).toBeDefined();
    });

    it('computes coherence score', () => {
      const tree = parseDiscourse('Start. Then continue. Finally finish.');
      expect(tree.coherenceScore).toBeGreaterThanOrEqual(0);
      expect(tree.coherenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Protocol session management', () => {
    it('creates a session in handshake phase', () => {
      const session = createProtocolSession(['alice', 'bob']);
      expect(session.phase).toBe('handshake');
      expect(session.participants).toEqual(['alice', 'bob']);
      expect(session.messages).toHaveLength(0);
    });

    it('advances through protocol phases', () => {
      const session = createProtocolSession(['alice', 'bob']);
      expect(session.phase).toBe('handshake');

      advancePhase(session);
      expect(session.phase).toBe('capability_exchange');

      advancePhase(session);
      expect(session.phase).toBe('negotiation');

      advancePhase(session);
      expect(session.phase).toBe('active_session');

      advancePhase(session);
      expect(session.phase).toBe('closing');
    });

    it('sends and stores protocol messages', () => {
      const session = createProtocolSession(['alice', 'bob']);
      const msg = sendProtocolMessage(session, 'alice', 'bob', 'Hello, can you help?');

      expect(session.messages).toHaveLength(1);
      expect(msg.sender).toBe('alice');
      expect(msg.recipient).toBe('bob');
      expect(msg.intent.category).toBe('request');
      expect(msg.semantics).toBeDefined();
    });

    it('negotiates capabilities', () => {
      const offered = [
        { name: 'reasoning', version: '2.0', parameters: {}, required: false },
        { name: 'nlp', version: '1.5', parameters: {}, required: false },
      ];

      const required = [
        { name: 'reasoning', version: '1.0', parameters: {}, required: true },
        { name: 'storage', version: '1.0', parameters: {}, required: true },
      ];

      const { agreed, unmet } = negotiateCapabilities(offered, required);
      expect(agreed).toHaveLength(1);
      expect(agreed[0].name).toBe('reasoning');
      expect(unmet).toHaveLength(1);
      expect(unmet[0].name).toBe('storage');
    });
  });

  describe('Full NLP pipeline', () => {
    it('processes input through all stages', () => {
      const result = processNLP('Find all identity records with Unicode errors');

      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.intents.intent.category).toBeDefined();
      expect(result.semantics.frames.length).toBeGreaterThan(0);
      expect(result.discourse.units.length).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('processes complex multi-sentence input', () => {
      const result = processNLP(
        'Create a new identity record. Then verify the Unicode normalization. Finally, generate a court exhibit.'
      );

      expect(result.intents.intent.category).toBe('command');
      expect(result.discourse.units.length).toBe(3);
    });
  });
});
