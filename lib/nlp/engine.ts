/**
 * Natural Language Protocol Engine
 *
 * Implements tokenization, intent recognition, semantic analysis,
 * entity extraction, discourse parsing, and protocol session management.
 * Operates as a rule-based NLP pipeline with no external ML dependencies.
 */

import type {
  Token,
  TokenType,
  Intent,
  IntentCategory,
  IntentMatch,
  SemanticRole,
  SemanticFrame,
  EntityMention,
  SemanticAnalysis,
  ProtocolCapability,
  ProtocolMessage,
  ProtocolSession,
  ProtocolPhase,
  DiscourseUnit,
  DiscourseTree,
  DiscourseRelation,
  NLPResult,
} from './types';

// --- Utility ---

let idCounter = 0;
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${++idCounter}`;
}

// --- Tokenizer ---

const TOKEN_PATTERNS: Array<{ type: TokenType; pattern: RegExp }> = [
  { type: 'number', pattern: /^\d+(\.\d+)?/ },
  { type: 'word', pattern: /^[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]+('[a-zA-Z]+)?/ },
  { type: 'punctuation', pattern: /^[.,;:!?()[\]{}"'`\-—]/ },
  { type: 'symbol', pattern: /^[@#$%^&*+=<>/\\|~]/ },
  { type: 'whitespace', pattern: /^\s+/ },
];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let position = 0;
  let remaining = input;

  while (remaining.length > 0) {
    let matched = false;

    for (const { type, pattern } of TOKEN_PATTERNS) {
      const match = remaining.match(pattern);
      if (match) {
        const value = match[0];
        tokens.push({
          value,
          type,
          position,
          length: value.length,
          normalized: value.toLowerCase().trim(),
        });
        position += value.length;
        remaining = remaining.slice(value.length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      tokens.push({
        value: remaining[0],
        type: 'unknown',
        position,
        length: 1,
        normalized: remaining[0],
      });
      position++;
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export function getWordTokens(tokens: Token[]): Token[] {
  return tokens.filter((t) => t.type === 'word');
}

// --- Intent Recognition ---

interface IntentPattern {
  category: IntentCategory;
  action: string;
  keywords: string[];
  requiredCount: number;
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  { category: 'query', action: 'search', keywords: ['find', 'search', 'look', 'where', 'which', 'locate'], requiredCount: 1, weight: 1.0 },
  { category: 'query', action: 'explain', keywords: ['what', 'how', 'why', 'explain', 'describe', 'define'], requiredCount: 1, weight: 0.9 },
  { category: 'query', action: 'compare', keywords: ['compare', 'difference', 'versus', 'vs', 'between', 'contrast'], requiredCount: 1, weight: 1.0 },
  { category: 'command', action: 'create', keywords: ['create', 'make', 'build', 'generate', 'new', 'add'], requiredCount: 1, weight: 1.0 },
  { category: 'command', action: 'delete', keywords: ['delete', 'remove', 'destroy', 'drop', 'clear', 'purge'], requiredCount: 1, weight: 1.0 },
  { category: 'command', action: 'update', keywords: ['update', 'modify', 'change', 'edit', 'set', 'configure'], requiredCount: 1, weight: 0.9 },
  { category: 'command', action: 'execute', keywords: ['run', 'execute', 'start', 'launch', 'trigger', 'invoke'], requiredCount: 1, weight: 1.0 },
  { category: 'assertion', action: 'state', keywords: ['is', 'are', 'was', 'were', 'has', 'have', 'should', 'must'], requiredCount: 2, weight: 0.6 },
  { category: 'request', action: 'help', keywords: ['help', 'assist', 'support', 'guide', 'please', 'could'], requiredCount: 1, weight: 0.8 },
  { category: 'clarification', action: 'clarify', keywords: ['mean', 'clarify', 'specify', 'elaborate', 'example'], requiredCount: 1, weight: 0.9 },
  { category: 'negotiation', action: 'negotiate', keywords: ['agree', 'propose', 'offer', 'accept', 'reject', 'counter', 'terms'], requiredCount: 1, weight: 1.0 },
  { category: 'acknowledgment', action: 'acknowledge', keywords: ['ok', 'okay', 'yes', 'no', 'understood', 'agreed', 'confirmed', 'thanks'], requiredCount: 1, weight: 0.7 },
  { category: 'error_report', action: 'report_error', keywords: ['error', 'bug', 'broken', 'fail', 'crash', 'issue', 'problem', 'wrong'], requiredCount: 1, weight: 1.0 },
];

export function recognizeIntent(tokens: Token[]): IntentMatch {
  const wordTokens = getWordTokens(tokens);
  const normalizedWords = wordTokens.map((t) => t.normalized);
  const rawInput = tokens.map((t) => t.value).join('');

  const scored: Array<{ pattern: IntentPattern; score: number }> = [];

  for (const pattern of INTENT_PATTERNS) {
    const matchCount = pattern.keywords.filter((kw) =>
      normalizedWords.includes(kw)
    ).length;

    if (matchCount >= pattern.requiredCount) {
      const coverage = matchCount / pattern.keywords.length;
      const score = coverage * pattern.weight;
      scored.push({ pattern, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const buildIntent = (item: { pattern: IntentPattern; score: number }): Intent => ({
    id: generateId('intent'),
    category: item.pattern.category,
    action: item.pattern.action,
    confidence: Math.min(1, item.score),
    parameters: extractParameters(normalizedWords, item.pattern),
    rawInput,
  });

  if (scored.length === 0) {
    const fallback: Intent = {
      id: generateId('intent'),
      category: 'query',
      action: 'unknown',
      confidence: 0.1,
      parameters: {},
      rawInput,
    };
    return { intent: fallback, score: 0.1, alternativeIntents: [] };
  }

  const primary = buildIntent(scored[0]);
  const alternatives = scored.slice(1, 4).map(buildIntent);

  return {
    intent: primary,
    score: scored[0].score,
    alternativeIntents: alternatives,
  };
}

function extractParameters(
  words: string[],
  pattern: IntentPattern
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  const nonKeywords = words.filter((w) => !pattern.keywords.includes(w));

  if (nonKeywords.length > 0) {
    params['subject'] = nonKeywords.join(' ');
  }

  params['matchedKeywords'] = pattern.keywords
    .filter((kw) => words.includes(kw))
    .join(',');

  return params;
}

// --- Entity Extraction ---

interface EntityPattern {
  type: string;
  pattern: RegExp;
}

const ENTITY_PATTERNS: EntityPattern[] = [
  { type: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
  { type: 'url', pattern: /https?:\/\/[^\s]+/ },
  { type: 'date', pattern: /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/ },
  { type: 'ip_address', pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/ },
  { type: 'version', pattern: /v?\d+\.\d+(\.\d+)?(-[a-zA-Z0-9.]+)?/ },
  { type: 'file_path', pattern: /(?:\/[\w.-]+)+\/?|[\w.-]+(?:\/[\w.-]+)+/ },
  { type: 'quoted_string', pattern: /"[^"]+"|'[^']+'/ },
  { type: 'percentage', pattern: /\d+(\.\d+)?%/ },
  { type: 'currency', pattern: /\$\d+(\.\d{2})?|\d+(\.\d{2})?\s*(USD|EUR|GBP)/ },
];

export function extractEntities(input: string): EntityMention[] {
  const entities: EntityMention[] = [];

  for (const { type, pattern } of ENTITY_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = globalPattern.exec(input)) !== null) {
      entities.push({
        text: match[0],
        type,
        startOffset: match.index,
        endOffset: match.index + match[0].length,
        confidence: 0.9,
      });
    }
  }

  return entities.sort((a, b) => a.startOffset - b.startOffset);
}

// --- Semantic Analysis ---

const ROLE_INDICATORS: Record<SemanticRole, string[]> = {
  agent: ['by', 'from'],
  patient: ['to', 'into', 'onto'],
  instrument: ['with', 'using', 'via', 'through'],
  beneficiary: ['for', 'on behalf of'],
  location: ['at', 'in', 'on', 'near', 'between'],
  temporal: ['when', 'before', 'after', 'during', 'until', 'since'],
  manner: ['quickly', 'slowly', 'carefully', 'efficiently'],
  cause: ['because', 'due to', 'since', 'as'],
  purpose: ['to', 'in order to', 'so that', 'for'],
};

const NEGATIVE_WORDS = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'nothing', 'nowhere',
  'nobody', 'hardly', 'barely', 'scarcely', "don't", "doesn't",
  "won't", "can't", "couldn't", "shouldn't", "wouldn't",
]);

const POSITIVE_WORDS = new Set([
  'good', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic',
  'perfect', 'love', 'like', 'enjoy', 'happy', 'success', 'best',
  'beautiful', 'brilliant', 'outstanding', 'superb',
]);

const NEGATIVE_SENTIMENT_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'worst',
  'ugly', 'broken', 'fail', 'failure', 'error', 'wrong', 'problem',
  'issue', 'bug', 'crash', 'slow', 'poor',
]);

export function analyzeSemantics(input: string, tokens: Token[]): SemanticAnalysis {
  const wordTokens = getWordTokens(tokens);
  const words = wordTokens.map((t) => t.normalized);

  // Build semantic frames
  const frames = buildSemanticFrames(input, words);

  // Extract entities
  const entities = extractEntities(input);

  // Compute sentiment
  const sentiment = computeSentiment(words);

  // Estimate complexity
  const complexity = estimateComplexity(tokens, frames);

  return { frames, entities, sentiment, complexity };
}

function buildSemanticFrames(input: string, words: string[]): SemanticFrame[] {
  const frames: SemanticFrame[] = [];
  const verbs = identifyVerbs(words);

  for (const verb of verbs) {
    const roles = new Map<SemanticRole, string>();

    for (const [role, indicators] of Object.entries(ROLE_INDICATORS)) {
      for (const indicator of indicators) {
        const idx = input.toLowerCase().indexOf(indicator);
        if (idx !== -1) {
          const afterIndicator = input.slice(idx + indicator.length).trim();
          const phrase = afterIndicator.split(/[.,;!?]|(?:\s{2,})/)[0].trim();
          if (phrase.length > 0) {
            roles.set(role as SemanticRole, phrase);
            break;
          }
        }
      }
    }

    const isNegated = words.some((w) => NEGATIVE_WORDS.has(w));
    const modality = detectModality(input);

    frames.push({ predicate: verb, roles, negated: isNegated, modality });
  }

  if (frames.length === 0) {
    frames.push({
      predicate: 'state',
      roles: new Map(),
      negated: false,
      modality: detectModality(input),
    });
  }

  return frames;
}

const COMMON_VERBS = new Set([
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'can', 'could',
  'get', 'set', 'make', 'create', 'find', 'search', 'run', 'build',
  'delete', 'update', 'send', 'receive', 'process', 'analyze', 'generate',
  'compare', 'validate', 'verify', 'check', 'test', 'deploy', 'configure',
]);

function identifyVerbs(words: string[]): string[] {
  return words.filter((w) => COMMON_VERBS.has(w));
}

function detectModality(input: string): 'declarative' | 'interrogative' | 'imperative' | 'conditional' {
  const trimmed = input.trim();
  if (trimmed.endsWith('?')) return 'interrogative';
  if (/^(if|when|unless|provided|assuming)\b/i.test(trimmed)) return 'conditional';
  if (/^(please|do|don't|let|make|run|create|delete|update)\b/i.test(trimmed)) return 'imperative';
  return 'declarative';
}

function computeSentiment(words: string[]): { polarity: number; magnitude: number } {
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positive++;
    if (NEGATIVE_SENTIMENT_WORDS.has(word)) negative++;
    if (NEGATIVE_WORDS.has(word)) negative += 0.5;
  }

  const total = positive + negative;
  if (total === 0) return { polarity: 0, magnitude: 0 };

  const polarity = (positive - negative) / Math.max(words.length, 1);
  const magnitude = total / Math.max(words.length, 1);

  return {
    polarity: Math.max(-1, Math.min(1, polarity)),
    magnitude: Math.min(1, magnitude),
  };
}

function estimateComplexity(tokens: Token[], frames: SemanticFrame[]): number {
  const wordCount = tokens.filter((t) => t.type === 'word').length;
  const uniqueWords = new Set(tokens.filter((t) => t.type === 'word').map((t) => t.normalized)).size;
  const lexicalDiversity = wordCount > 0 ? uniqueWords / wordCount : 0;
  const frameComplexity = Math.min(1, frames.length / 5);
  const lengthFactor = Math.min(1, wordCount / 50);

  return Math.min(1, (lexicalDiversity + frameComplexity + lengthFactor) / 3);
}

// --- Discourse Parsing ---

const DISCOURSE_MARKERS: Record<string, DiscourseRelation> = {
  'however': 'contrast',
  'but': 'contrast',
  'although': 'contrast',
  'yet': 'contrast',
  'nevertheless': 'contrast',
  'because': 'cause',
  'since': 'cause',
  'therefore': 'result',
  'thus': 'result',
  'consequently': 'result',
  'hence': 'result',
  'so': 'result',
  'if': 'condition',
  'unless': 'condition',
  'provided': 'condition',
  'when': 'temporal_sequence',
  'then': 'temporal_sequence',
  'after': 'temporal_sequence',
  'before': 'temporal_sequence',
  'next': 'temporal_sequence',
  'finally': 'temporal_sequence',
  'also': 'parallel',
  'additionally': 'parallel',
  'moreover': 'parallel',
  'furthermore': 'parallel',
  'specifically': 'elaboration',
  'namely': 'elaboration',
  'for example': 'elaboration',
  'in particular': 'elaboration',
};

export function parseDiscourse(input: string): DiscourseTree {
  const sentences = input
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const units: DiscourseUnit[] = [];
  let rootId = '';

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const relation = detectDiscourseRelation(sentence);

    const unit: DiscourseUnit = {
      id: generateId('du'),
      text: sentence,
      relation,
      parentId: i > 0 ? units[0].id : undefined,
      depth: i === 0 ? 0 : 1,
    };

    if (i === 0) rootId = unit.id;
    units.push(unit);
  }

  const coherenceScore = computeCoherence(units);
  const root = units.find((u) => u.id === rootId) ?? units[0] ?? {
    id: generateId('du'),
    text: input,
    relation: 'elaboration' as DiscourseRelation,
    depth: 0,
  };

  return { root, units, coherenceScore };
}

function detectDiscourseRelation(sentence: string): DiscourseRelation {
  const lower = sentence.toLowerCase();

  for (const [marker, relation] of Object.entries(DISCOURSE_MARKERS)) {
    if (lower.includes(marker)) return relation;
  }

  return 'elaboration';
}

function computeCoherence(units: DiscourseUnit[]): number {
  if (units.length <= 1) return 1.0;

  let linkedCount = 0;
  for (const unit of units) {
    if (unit.parentId) linkedCount++;
  }

  return linkedCount / (units.length - 1);
}

// --- Protocol Session Management ---

export function createProtocolSession(
  participants: string[],
  capabilities: ProtocolCapability[] = []
): ProtocolSession {
  return {
    id: generateId('proto'),
    phase: 'handshake',
    participants,
    capabilities,
    messages: [],
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    metadata: {},
  };
}

export function advancePhase(session: ProtocolSession): ProtocolPhase {
  const PHASE_ORDER: ProtocolPhase[] = [
    'handshake',
    'capability_exchange',
    'negotiation',
    'active_session',
    'closing',
  ];

  const currentIndex = PHASE_ORDER.indexOf(session.phase);
  if (currentIndex < PHASE_ORDER.length - 1) {
    session.phase = PHASE_ORDER[currentIndex + 1];
  }

  session.lastActivity = new Date().toISOString();
  return session.phase;
}

export function sendProtocolMessage(
  session: ProtocolSession,
  sender: string,
  recipient: string,
  content: string,
  replyTo?: string
): ProtocolMessage {
  const tokens = tokenize(content);
  const intentMatch = recognizeIntent(tokens);
  const semantics = analyzeSemantics(content, tokens);

  const message: ProtocolMessage = {
    id: generateId('msg'),
    phase: session.phase,
    sender,
    recipient,
    content,
    intent: intentMatch.intent,
    semantics,
    timestamp: new Date().toISOString(),
    replyTo,
  };

  session.messages.push(message);
  session.lastActivity = message.timestamp;

  return message;
}

export function negotiateCapabilities(
  offered: ProtocolCapability[],
  required: ProtocolCapability[]
): { agreed: ProtocolCapability[]; unmet: ProtocolCapability[] } {
  const agreed: ProtocolCapability[] = [];
  const unmet: ProtocolCapability[] = [];

  for (const req of required) {
    const match = offered.find(
      (o) => o.name === req.name && o.version >= req.version
    );
    if (match) {
      agreed.push(match);
    } else if (req.required) {
      unmet.push(req);
    }
  }

  return { agreed, unmet };
}

// --- Full NLP Pipeline ---

export function processNLP(input: string): NLPResult {
  const startTime = performance.now();

  const tokens = tokenize(input);
  const intents = recognizeIntent(tokens);
  const semantics = analyzeSemantics(input, tokens);
  const discourse = parseDiscourse(input);

  return {
    tokens,
    intents,
    semantics,
    discourse,
    processingTimeMs: performance.now() - startTime,
  };
}
