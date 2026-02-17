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

# Quantum‑Inspired Model of Legal Conditions and Outcomes (for Project Agent)

> **Pedagogical aim:** Introduce quantum and mathematical concepts as needed; assume no prior knowledge.
> **Forward‑looking aim:** Provide a framework for quantifying ambiguity, intertextuality, and jurisprudential leaning; show how known quantum algorithms can model court bias and inconsistency.

---

## Abstract

I formalise a quantum‑inspired representation of legal conditions and outcomes using **qubits**. Multiple qubits model complex, probabilistic interpretations of rules; **entanglement** models intertextual dependence (cross‑references, definitions, precedent). I define metrics for **ambiguity**, **intertextuality**, and **inconsistency** and show how **phase** encodes secondary characteristics (e.g., jurisprudential leanings). Leveraging known quantum algorithms (amplitude amplification, phase estimation), I show how to incorporate potential court‑specific leanings into the probability that a legal interpretation will be deemed valid. I discuss practical limits and how **generative AI** can parameterise the model from statutory and case text. The framework is descriptive (for analysis) and strategic (for litigation planning), not prescriptive of judicial behaviour.

---

## 1. Introduction and Contributions

**Problem.** Legal rules are often under‑determinate. Courts resolve disputes by weighing text, purpose, precedent, evidentiary burdens, and institutional norms. We need a quantitative, compositional model that (i) isolates where ambiguity lives, (ii) quantifies intertextual reliance, and (iii) makes the role of jurisprudential leanings explicit.

**Solution sketch.**

* Represent each legal proposition (condition/exception/outcome) as a **qubit** $|\psi\rangle = \alpha\,|0\rangle + \beta\,|1\rangle$, where $|1\rangle$ denotes satisfaction/validity and $|0\rangle$ non‑satisfaction/invalidity. Probabilities are $|\alpha|^2, |\beta|^2$.
* Compose complex rules with multi‑qubit systems; model cross‑references and precedent via **correlations/entanglement** in the joint state $\rho$.
* Encode **jurisprudential leaning** via the **phase** of amplitudes (Bloch sphere angle $\phi$), enabling interference between competing interpretive styles.
* Quantify:

  * **Ambiguity** via interpretive entropy and coherence.
  * **Intertextuality** via quantum mutual information.
  * **Inconsistency** via phase‑conflict indices (reliance on mutually incompatible leanings).
* Use **amplitude amplification** to model bias‑aligned outcome probabilities; use **phase estimation** to infer leanings from observed decisions.

**Contributions.** (C1) A formal syntax/semantics for quantum‑inspired legal modelling; (C2) metrics for ambiguity/intertextuality/inconsistency; (C3) algorithmic treatment of court leanings; (C4) a practical pipeline using generative AI to estimate parameters.

---

## 2. Minimal Quantum Background (Pedagogical)

**Qubit.** A unit vector $|\psi\rangle = \alpha|0\rangle + \beta|1\rangle$, with $|\alpha|^2 + |\beta|^2 = 1$. The **Bloch sphere** parameterises pure states by two angles: $|\psi\rangle = \cos(\tfrac{\theta}{2})|0\rangle + e^{i\phi}\sin(\tfrac{\theta}{2})|1\rangle$. Here $\theta$ controls the baseline probability of satisfaction; $\phi$ will encode jurisprudential leaning.

**Measurement.** Measuring in the computational basis yields 0 or 1 with those probabilities. In our model, this corresponds to a legal fact‑finder adjudicating a condition as not satisfied/satisfied.

**Multi‑qubit states.** A system of $n$ qubits is described by a unit vector in $\mathbb{C}^{2^n}$ or a **density matrix** $\rho$ (to model uncertainty/mixed evidence). **Entanglement** is non‑separability: $\rho \neq \rho_A \otimes \rho_B$.

**Elementary gates.**

* $X$ (NOT) flips 0↔1 (negation).
* $R_y(\gamma)$ rotates probabilities (update by new evidence).
* $R_z(\lambda)$ shifts phase (update in jurisprudential leaning).
* Controlled operations (e.g., **CNOT**) implement dependencies (exceptions/defences that trigger conditionally).

---

## 3. Formal Model

### 3.1 Legal propositions as qubits

Let $p$ be a legal proposition (e.g., “Condition C holds”, “Defence D applies”). Model it as a qubit state

$$
|\psi_p\rangle \,=\, \alpha_p\,|0\rangle + e^{i\phi_p}\,\beta_p\,|1\rangle,\quad |\alpha_p|^2+|\beta_p|^2=1.
$$

* $|1\rangle$: proposition holds (satisfied/valid).
* $\phi_p$: jurisprudential “phase” (see §3.5) capturing the leaning of how $p$ is made true (textualist/purposive/precedent/rights‑centric, etc.).

**Evidence updates.** New evidence rotates $|\psi_p\rangle$ via $R_y(\gamma)$. Changes in the interpretive frame (e.g., court emphasises purpose) rotate phase via $R_z(\lambda)$.

### 3.2 Composition of rules

Let **AND**, **OR**, **NOT** be implemented by observables on the joint system.

* **Conjunction (AND).** For conditions $p_1,\dots,p_k$, define the outcome observable $\Pi_{\text{AND}} = |1\ldots1\rangle\langle1\ldots1|$. The probability that all hold equals $\mathrm{Tr}(\rho\,\Pi_{\text{AND}})$.
* **Disjunction (OR).** $\Pi_{\text{OR}} = I - |0\ldots0\rangle\langle0\ldots0|$.
* **Negation (NOT).** Apply $X$ to the relevant qubit.

**Exceptions/defences.** Model a defence $d$ that defeats condition $c$ as a controlled‑NOT from $d$ to the outcome qubit (or a controlled phase that cancels the contribution of $c$). This captures non‑monotonic structure.

**Burdens/standards.** Represent standards (balance of probabilities, beyond reasonable doubt) as threshold observables on posterior probabilities, or as required rotation magnitude $\gamma$ before measurement (§3.4).

### 3.3 Intertextual dependence and precedent as entanglement

Cross‑references and definitional chains induce correlations. Let $A,B$ index two instruments (e.g., statute and delegated rule), with reduced states $\rho_A,\rho_B$. Define **intertextual dependence** by the **quantum mutual information**:

$$
I(A\!:\!B) = S(\rho_A) + S(\rho_B) - S(\rho_{AB}),\quad S(\rho)= -\mathrm{Tr}(\rho\log\rho).
$$

High $I(A\!:\!B)$ indicates strong reliance of one text’s interpretation on the other (see §4.2).

### 3.4 Outcomes and evidential updates

Let $o$ be the outcome qubit (e.g., “liability established”). The global state $\rho$ evolves as evidence is admitted:

$$
\rho \mapsto U_E\,\rho\,U_E^\dagger,\quad U_E = \prod_j R_y^{(p_j)}(\gamma_j) \prod_k \text{(controlled gates)}.
$$

The adjudicated probability of liability is $\Pr[o{=}1] = \mathrm{Tr}(\rho\,\Pi_o)$, where $\Pi_o = |1\rangle\langle1|$ on the outcome register.

### 3.5 Jurisprudential phase

Let $\mathcal{J}$ be a vector of jurisprudential features (e.g., text, purpose, precedent, rights). Map it to a phase $\phi$ via a learned embedding $\Phi: \mathbb{R}^m \to [0,2\pi)$. Then $R_z(\lambda)$ shifts $\phi$ to reflect institutional leanings (court‑ or judge‑specific). Interference between qubits with different $\phi$ models how competing interpretive styles amplify/cancel.

---

## 4. Metrics: Ambiguity, Intertextuality, Inconsistency

### 4.1 Ambiguity

We separate **semantic ambiguity** (intrinsic) from **epistemic dispersion** (across interpreters).

1. **Interpretive entropy (intrinsic):** For a qubit $|\psi\rangle$, the measurement entropy
   $H(\psi) = -p\log p -(1-p)\log (1-p),\quad p=|\beta|^2.$
   High $H$ indicates under‑determination at the level of the proposition.

2. **Cross‑interpreter dispersion (epistemic):** Given a distribution of states $\{w_i, |\psi_i\rangle\}$ representing different interpreters, define the mean density matrix $\bar\rho = \sum_i w_i |\psi_i\rangle\langle\psi_i|$. Then define
   $A_{\text{disp}} = S(\bar\rho).$
   This rises as interpreters disagree about both probabilities and phases.

3. **Coherence (readiness to interfere):** Off‑diagonal magnitude $C(\rho) = \sum_{i\neq j} |\rho_{ij}|$ ($l_1$ coherence). High coherence means phase‑sensitive effects matter—jurisprudential leanings will affect outcomes.

### 4.2 Intertextuality

For sub‑systems $A,B$ encoding linked instruments or provisions, use **quantum mutual information** $I(A\!:\!B)$ (§3.3). Optionally decompose into **classical correlation** and **entanglement of formation** $E_F$ to separate mere correlation from genuine non‑separability.

Define a **Rule Intertextuality Index**:
$RII(A,B) = \frac{I(A\!:\!B)}{\min\{S(\rho_A), S(\rho_B)\} + \varepsilon}.$
This normalises dependence to each rule’s intrinsic uncertainty.

### 4.3 Inconsistency via phase conflict

Let $\phi_i$ denote phase for proposition $p_i$ materially relied on for outcome $o$. Define pairwise **phase conflict**
$\Delta_{ij} = 1 - \cos(\phi_i - \phi_j).$
Weight by their participation strengths $w_i, w_j$ (e.g., Shapley values or gradient‑based attributions on $\Pr[o{=}1]$). Define the **Inconsistency Index**
$\mathrm{INC}(o) = \sum_{i<j} w_i w_j\,\Delta_{ij}.$
High $\mathrm{INC}$ signals an outcome that leans simultaneously on incompatible jurisprudential characteristics.

---

## 5. Modelling Court Leanings with Quantum Algorithms

### 5.1 Leaning as a phase operator

Associate a court‑specific operator $B$ that applies phase shifts reflecting institutional preferences: $B = \prod_{i} R_z^{(p_i)}(\lambda_i)$. Pre‑measurement application of $B$ yields bias‑adjusted outcome probabilities $\Pr_B[o{=}1].$

### 5.2 Amplitude amplification (Grover‑style)

Define a predicate (oracle) $\mathcal{O}$ that marks states consistent with the court’s leanings (e.g., purposive‑aligned interpretations of pivotal provisions). One step of amplitude amplification rotates probability mass toward marked states. After $k$ iterations, the success probability is approximately
$\Pr_k \approx \sin^2\big((2k+1)\theta\big), \quad \sin^2\theta = P_0,$
where $P_0$ is the initial mass on marked states. This models how a leaning can systematically increase the likelihood of certain interpretations being accepted.

### 5.3 Phase estimation for inference

Given observed sequences of decisions, one can (in principle) infer the underlying $\phi$ (jurisprudential phase) by **phase estimation**: choose an evolution $U$ whose eigenphase carries $\phi$, then estimate $\phi$ from measurement statistics. In practice, we approximate via maximum likelihood over the embedding $\Phi$ (see §6).

---

## 6. Worked Toy Example

Consider a simplified charge requiring **(C1)** a statutory condition (e.g., prohibited act), **(C2)** mental element, with an **exception** **(D)** (e.g., reasonable excuse). Let the outcome be liability **(O)**.

1. **Encode.** Assign qubits $q_{C1}, q_{C2}, q_D, q_O$. Initialise $|\psi_{C1}\rangle, |\psi_{C2}\rangle$ from evidence ($R_y$ rotations). Initialise $|\psi_D\rangle$ from defence submissions.
2. **Compose.** Implement $O = C1 \land C2 \land \neg D$ via projectors and a controlled‑NOT from $D$ to $O$ (defeater).
3. **Phases.** Let $\phi_{C1}$ skew textual, $\phi_{C2}$ rights‑centric (due process), $\phi_D$ purposive. Compute $\mathrm{INC}(O)$ to test whether the outcome relies on incompatible leanings.
4. **Bias operator.** Apply court operator $B$ (e.g., $R_z^{(\cdot)}$ emphasising purposive readings), recompute $\Pr_B[O{=}1]$. This gives a bias‑adjusted forecast and highlights which provisions are most sensitive to leanings.
5. **Diagnostics.** Compute **Ambiguity** $H(\psi_{C2})$ to see if mens rea is under‑determined; compute **Intertextuality** between the definitional clause in $C1$ and delegated regulation $R$ to expose dependence.

**Strategic note.** If $RII(C1,R)$ is high, challenge the delegated instrument’s role (ultra vires/interpretive misstep). If $A_{\text{disp}}$ is high for $C2$, press for strict proof and expose the Crown’s failure to discharge the standard.

---

## 7. Practical Limits and a Generative‑AI Pipeline

### 7.1 Limits

* **Metaphor vs mechanism.** The framework is *inspired* by quantum formalisms; no claim of physical superposition in law.
* **Parameter identifiability.** Phases (leanings) and amplitudes (probabilities) may be confounded without sufficient observations.
* **Non‑unitary realities.** Real litigation includes non‑unitary steps (exclusions, discretionary rulings). We approximate with CPTP maps (noise channels) if needed.
* **Data availability.** Reported decisions may under‑represent negotiations/withdrawals, biasing estimates.

### 7.2 Pipeline (estimating amplitudes and phases)

1. **Text parsing.** Use a legal‑tuned LLM to extract propositions (conditions, exceptions), cross‑references, burdens, and standards from statutes, regulations, and cases.
2. **Graph build.** Construct a rule graph (nodes: propositions; edges: intertextual links). Initialise qubits per node.
3. **Evidence mapping.** From case facts, map items to $R_y$ rotations (likelihood contributions) using calibrated evidence models.
4. **Jurisprudence embedding.** Build a taxonomy (textual, purposive, precedent‑centric, rights‑centric). Train an embedding $\Phi$ that maps textual features of judicial reasons to a phase $\phi$. Calibrate by fitting to historical outcomes via maximum likelihood.
5. **Computation.** Evaluate $H, A_{\text{disp}}, C(\rho), I(A\!:\!B), RII, INC$ and perform bias‑adjusted forecasts with operator $B$.
6. **Explainability.** Attribute outcome probability to propositions (e.g., Shapley on $\Pr[o{=}1]$); report which provisions dominate ambiguity and inconsistency.

### 7.3 Governance and ethics

* Document mappings from legal sources; preserve audit trails (who/when/what texts).
* Avoid automating normative judgments; use metrics as diagnostic aids to focus submissions (e.g., where ambiguity/intertextuality is excessive or unlawful).
* Align with rights instruments by testing whether bias‑adjusted outcomes degrade fairness (e.g., probe $\mathrm{INC}$ spikes when rights phases are down‑weighted).

---

## 8. Discussion and Future Work

1. **Richer connectives.** Model burdens of proof as asymmetric thresholds; encode presumptions as prior rotations.
2. **Noise models.** Add dephasing to represent loss of jurisprudential coherence under time/resource pressure.
3. **Learning from sparse data.** Hierarchical priors sharing information across courts/bench compositions.
4. **Hybrid classical‑quantum computing.** Use classical optimisation to fit $\Phi$, then quantum‑style simulators for sensitivity analyses.
5. **Validation.** Compare forecasts to held‑out decisions; stress‑test with synthetic variations of facts.

---

## 9. Glossary (plain‑English)

* **Qubit:** A two‑level mathematical object—here, a way to encode uncertain propositions with both probability and a “leaning” (phase).
* **Phase:** A circular parameter (angle) encoding *how* a proposition tends to be satisfied (e.g., textual vs purposive reasoning). Phases can add or cancel.
* **Entanglement:** Statistical dependence that cannot be factored; models tight cross‑text reliance.
* **Amplitude amplification:** A procedure that increases probability on “favoured” interpretations marked by an oracle (e.g., a court’s preferences).

---

## 10. Appendix: Notation & Quick Recipes

**State encoding.** For proposition $p$, set $p=1$ if satisfied; initialise by $R_y(\gamma)$ with $\gamma = 2\arcsin(\sqrt{p})$. Set phase by $R_z(\phi)$.

**AND/OR measurement.** Use projectors $\Pi_{\text{AND}}$, $\Pi_{\text{OR}}$ on the joint register; compute probabilities via $\mathrm{Tr}(\rho\Pi)$.

**Metrics summary.**

* Ambiguity: $H(\psi)$, $A_{\text{disp}}$, $C(\rho)$.
* Intertextuality: $I(A\!:\!B)$, $RII$.
* Inconsistency: $\mathrm{INC}(o)$ via phase conflicts.

**Strategy prompts (diagnostic use).**

* *Where is the Crown’s case most ambiguous?* → Maximise $H(\psi_p)$ over pivotal propositions.
* *Which delegated instrument over‑drives the outcome?* → Identify edges with highest $RII$; press ultra vires or misinterpretation.
* *Is the outcome jurisprudentially unstable?* → Check $\mathrm{INC}(o)$ and explain conflicts in submissions.


## License

Private repository — All rights reserved
