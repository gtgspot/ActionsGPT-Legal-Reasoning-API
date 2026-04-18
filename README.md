# ActionsGPT — Legal Reasoning API

Minimal, typed FastAPI service for legal reasoning primitives: ingest, structure extraction, citation‑aware legislative mapping, AGLC4 citation synthesis, salience scoring, argument atoms, compliance checks, precedent search, and a small docs UI.

## Features

- Document ingest (text/URLs), offline‑safe helpers
- Extraction (parties, charges, issues, prelim. citations)
- Sequential mapping: document → cited statutes/rules (with pinpoints, provenance, and time facets)
- AGLC4 citation generation
- Salience scoring with simple explainability
- Argument atoms (IRAC/FIRAC) with admissibility focus
- Compliance checks (e.g., CPA 2009 (Vic), Evidence 2008 (Vic), MCCR 2019)
- Precedent search (best‑effort HTML parsing)
- Static docs site: landing, explorer, citations map, API docs, knowledge base
  - Chat Q&A page (simple chat UI backed by /chat)

---

## Modern Technology Modules

Three new computational modules demonstrate the intersection of logical reasoning, natural language understanding, and distributed system architecture — integrated with the existing legal identity management platform.

### Logical Reasoning Engine (`lib/reasoning/`)

A pure computational inference engine supporting propositional logic, multi-step proof generation, and legal syllogism analysis.

- **Propositional Logic**: AND, OR, NOT, IMPLIES, IFF, XOR operators with nested expression evaluation
- **Truth Table Generation**: Exhaustive enumeration of all variable assignments
- **Forward Chaining**: Priority-sorted rule firing with confidence decay propagation
- **Backward Chaining**: Goal-directed proof search with recursive sub-goal resolution
- **Modus Ponens**: Classical inference from implications
- **Proof Chains**: Multi-step derivation with confidence scoring and timing metrics
- **Legal Syllogisms**: Major/minor premise analysis with precedent-weighted strength scoring
- **Consistency Checking**: Contradiction detection across proposition sets
- **Session Management**: Stateful reasoning sessions with proposition/rule/proof lifecycle

```ts
import { createProposition, and, buildProofChain, analyzeLegalSyllogism } from '@/lib/reasoning';

const premise = createProposition('All citizens have rights', true, 0.95);
const fact = createProposition('John is a citizen', true, 0.9);
const syllogism = analyzeLegalSyllogism(premise, fact);
// syllogism.strength → 0.855
```

### Natural Language Protocol Engine (`lib/nlp/`)

A rule-based NLP pipeline for tokenization, intent recognition, semantic analysis, and protocol session management — no external ML dependencies required.

- **Tokenizer**: Pattern-based tokenization for words, numbers, punctuation, symbols with position tracking
- **Intent Recognition**: 13 intent patterns across 8 categories (query, command, assertion, request, clarification, negotiation, acknowledgment, error_report)
- **Entity Extraction**: Regex-based extraction for emails, URLs, dates, IPs, versions, file paths, quoted strings, percentages, currency
- **Semantic Analysis**: Frame-based semantic role labeling (agent, patient, instrument, beneficiary, location, temporal, manner, cause, purpose)
- **Sentiment Analysis**: Lexicon-based polarity and magnitude scoring
- **Discourse Parsing**: Sentence-level discourse tree construction with relation detection (elaboration, contrast, cause, result, condition, temporal_sequence, parallel)
- **Protocol Sessions**: Multi-phase communication sessions (handshake → capability_exchange → negotiation → active_session → closing)
- **Capability Negotiation**: Version-aware capability matching between protocol participants

```ts
import { processNLP, createProtocolSession, sendProtocolMessage } from '@/lib/nlp';

const result = processNLP('Find identity records with Unicode errors');
// result.intents.intent → { category: 'query', action: 'search', confidence: 0.83 }

const session = createProtocolSession(['client', 'server']);
sendProtocolMessage(session, 'client', 'server', 'Help me verify this document');
```

### High-Level Architecture Engine (`lib/architecture/`)

A blueprint-first approach to modeling distributed system topology, service mesh connectivity, capability registration, and event-driven pipelines.

- **Service Definitions**: Typed service definitions with endpoints, health checks, dependency declarations
- **Topology Builder**: Layered topology construction (edge → application → platform → core) with service connections
- **Dependency Analysis**: Directed graph construction with circular dependency detection
- **Capability Registry**: Service capability registration with SLA guarantees (latency, availability, throughput)
- **Event System**: Event creation, handler registration, pipeline composition, and event routing
- **Health Monitoring**: Per-service health checks with response time tracking and system-wide metric aggregation
- **Blueprint Assembly**: Full architecture blueprints combining topology, capabilities, pipelines, and metrics
- **Pre-built Templates**: Microservices architecture template with 10 services across 4 tiers

```ts
import { createMicroservicesTemplate, computeSystemMetrics } from '@/lib/architecture';

const blueprint = createMicroservicesTemplate();
// 10 services, 9 connections, 10 capabilities, 1 event pipeline
const metrics = computeSystemMetrics(blueprint.topology);
```

### Unified Orchestrator (`lib/orchestrator/`)

Ties all three modules together into a single coordinated pipeline that accepts natural language input and produces reasoning proofs contextualized within an architecture model.

- **Full Pipeline**: NL input → NLP analysis → Intent-to-Reasoning mapping → Proof chain generation → Architecture contextualization → Synthesis report
- **Selective Modes**: `full`, `nlp_only`, `reasoning_only`, `architecture_only`
- **Synthesis Reports**: Combined summaries with detected intents, reasoning conclusions, architecture insights, and recommendations
- **Pipeline Metrics**: Per-stage timing with total duration tracking

```ts
import { fullPipeline } from '@/lib/orchestrator';

const result = fullPipeline('Verify that the citizen identity is authentic');
// result.synthesis.reasoningConclusions → ['Proved "input query resolved" in 1 steps (confidence: 80.7%)']
// result.synthesis.architectureInsights → ['System topology: 10 services across 4 layers']
```

### Dashboard Pages

- `/dashboard/reasoning` — Interactive proposition builder, expression evaluator with truth tables, forward chaining inference, legal syllogism builder, consistency checker
- `/dashboard/nlp` — Full NLP analysis console with tokenization display, intent/entity/sentiment results, semantic frame viewer, and protocol session manager
- `/dashboard/architecture` — System topology visualization, capability registry browser, event pipeline viewer, and health metrics dashboard

### Test Coverage

106 tests across 4 test suites covering all modules:

```bash
npx vitest run
```

---


## Authentication API and Webhook Setup

The repository keeps the existing UI pages at `/auth/login` and `/auth/sign-up`, and routes authentication through server API endpoints:

- `POST /api/auth/register` — registers a user with email/password and triggers email verification via Supabase Auth.
- `POST /api/auth/login` — authenticates credentials and returns session tokens for client session setup.
- `POST /api/webhooks/auth` — receives signed auth lifecycle events and updates `public.user_permissions`.

### Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for webhook permission upserts)
- `AUTH_WEBHOOK_SECRET` (HMAC SHA-256 signature verification for `/api/webhooks/auth`)

### Database setup

Run `scripts/004_create_auth_permissions_tables.sql` in your Supabase SQL editor. Credentials remain in `auth.users` (managed by Supabase), while `public.user_permissions` stores explicit registration/login permissions.

## Codex PR Review Helper

Use the PR review script to collect GitHub pull request data, summarize file changes, and
produce a Codex-ready review bundle.

```bash
node scripts/review-prs.js --repo owner/name --state open --max-prs 5 --output pr-review.md
pnpm review-prs -- --repo owner/name --state open --max-prs 5 --output pr-review.md
```

### Requirements

- `GITHUB_TOKEN` set with read access to the repository.
- Optional: `GITHUB_REPOSITORY` to avoid passing `--repo`.
- Optional: `--timeout` to override the default request timeout (15s).
