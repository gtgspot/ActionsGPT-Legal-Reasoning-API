/**
 * Type definitions for the Natural Language Protocol layer.
 *
 * Covers intent detection, semantic analysis, entity extraction,
 * protocol negotiation, and discourse management.
 */

// --- Token & Lexical Types ---

export type TokenType =
  | 'word'
  | 'punctuation'
  | 'number'
  | 'whitespace'
  | 'symbol'
  | 'entity_reference'
  | 'unknown';

export interface Token {
  value: string;
  type: TokenType;
  position: number;
  length: number;
  normalized: string;
}

// --- Intent Recognition ---

export type IntentCategory =
  | 'query'
  | 'command'
  | 'assertion'
  | 'request'
  | 'clarification'
  | 'negotiation'
  | 'acknowledgment'
  | 'error_report';

export interface Intent {
  id: string;
  category: IntentCategory;
  action: string;
  confidence: number;
  parameters: Record<string, string | number | boolean>;
  rawInput: string;
}

export interface IntentMatch {
  intent: Intent;
  score: number;
  alternativeIntents: Intent[];
}

// --- Semantic Analysis ---

export type SemanticRole =
  | 'agent'
  | 'patient'
  | 'instrument'
  | 'beneficiary'
  | 'location'
  | 'temporal'
  | 'manner'
  | 'cause'
  | 'purpose';

export interface SemanticFrame {
  predicate: string;
  roles: Map<SemanticRole, string>;
  negated: boolean;
  modality: 'declarative' | 'interrogative' | 'imperative' | 'conditional';
}

export interface EntityMention {
  text: string;
  type: string;
  startOffset: number;
  endOffset: number;
  resolvedId?: string;
  confidence: number;
}

export interface SemanticAnalysis {
  frames: SemanticFrame[];
  entities: EntityMention[];
  sentiment: {
    polarity: number;  // -1.0 to 1.0
    magnitude: number; // 0.0 to 1.0
  };
  complexity: number;  // 0.0 to 1.0
}

// --- Protocol Negotiation ---

export type ProtocolPhase =
  | 'handshake'
  | 'capability_exchange'
  | 'negotiation'
  | 'active_session'
  | 'closing'
  | 'error_recovery';

export interface ProtocolCapability {
  name: string;
  version: string;
  parameters: Record<string, unknown>;
  required: boolean;
}

export interface ProtocolMessage {
  id: string;
  phase: ProtocolPhase;
  sender: string;
  recipient: string;
  content: string;
  intent: Intent;
  semantics: SemanticAnalysis;
  timestamp: string;
  replyTo?: string;
}

export interface ProtocolSession {
  id: string;
  phase: ProtocolPhase;
  participants: string[];
  capabilities: ProtocolCapability[];
  messages: ProtocolMessage[];
  startedAt: string;
  lastActivity: string;
  metadata: Record<string, unknown>;
}

// --- Discourse Management ---

export type DiscourseRelation =
  | 'elaboration'
  | 'contrast'
  | 'cause'
  | 'result'
  | 'condition'
  | 'temporal_sequence'
  | 'parallel';

export interface DiscourseUnit {
  id: string;
  text: string;
  relation: DiscourseRelation;
  parentId?: string;
  depth: number;
}

export interface DiscourseTree {
  root: DiscourseUnit;
  units: DiscourseUnit[];
  coherenceScore: number;
}

// --- NLP Pipeline Result ---

export interface NLPResult {
  tokens: Token[];
  intents: IntentMatch;
  semantics: SemanticAnalysis;
  discourse: DiscourseTree;
  processingTimeMs: number;
}
