---
name: police-civil-claims-engine
description: >
  Civil claims engine against Victoria Police and the State of Victoria. Covers
  misfeasance in public office, false imprisonment, assault/battery, trespass to
  goods (vehicle seizure), malicious prosecution, negligence, abuse of process,
  Charter s.39 damages, vicarious liability. Generates letters of demand, statements
  of claim, particulars, damage schedules, evidence matrices. Navigates limitation
  periods, court routing, VGSO engagement, costs exposure. Trigger on: civil claim
  against police, misfeasance, false imprisonment, unlawful seizure/arrest, police
  assault, trespass to goods, malicious prosecution, Charter damages, VGSO, suing
  police, letter of demand, statement of claim, police tort, excessive force,
  wrongful vehicle seizure, "can I sue the police", "civil action", damage
  quantification, or any civil remedy from police conduct. Also trigger when
  enforcement-defect-analyzer identifies defects grounding civil claims.
dependencies:
  - statutory-interpretation-engine
  - enforcement-defect-analyzer
  - evidence-admissibility-engine
  - irac-legal-problem-solving
  - advocacy-correspondence-craft
  - case-operations-manager
---

# Police Civil Claims Engine

## Purpose

This skill constructs, evaluates, navigates, and generates civil claims against
Victoria Police officers and the State of Victoria arising from tortious, statutory,
and Charter-based causes of action. It operates on the foundational principle:

> **Police power is statutory and bounded. Every exercise of power beyond those bounds
> is actionable. The State is vicariously liable for the tortious acts of its officers
> committed in the course of their duties.**

This is not a grievance processor. Every claim element must be mapped to its legal
basis, evidenced, quantified, and proceduralised. The output is litigation-grade
material — not complaint narratives.

---

## When to Use

- Evaluating whether police conduct grounds a civil cause of action
- Identifying which tort(s) or statutory causes of action are available
- Constructing element-by-element claim analysis for each cause of action
- Generating pre-litigation correspondence (letter of demand, VGSO notice)
- Drafting statements of claim, particulars, and evidence matrices
- Calculating limitation periods and jurisdictional thresholds
- Quantifying damages across heads (general, special, aggravated, exemplary)
- Building evidence assembly strategies using criminal proceeding materials
- Assessing settlement viability and costs exposure
- Navigating VGSO engagement patterns and State litigation behaviour

## When Not to Use

- Criminal defence analysis (use enforcement-defect-analyzer, gdpval-biglaw-engine)
- Police complaints to IBAC or the Police Conduct Unit (administrative, not civil)
- Judicial review of police decisions (use public-authority-governance-integrity-engine)
- FOI requests to Victoria Police (use public-authority-governance-integrity-engine)
- General negligence claims unrelated to police conduct

---

## Required Inputs

At minimum:

1. **The conduct** — what the officer(s) did or failed to do
2. **The context** — when, where, under what claimed authority
3. **The harm** — what loss, injury, or damage resulted
4. **The evidence available** — documents, footage, witnesses, criminal proceeding materials

## Optional Inputs

- Criminal proceeding case number (to cross-reference enforcement defects)
- Officer identification (name, rank, registration number)
- VGSO reference number (if pre-litigation correspondence has commenced)
- Specific cause of action the user wants evaluated
- Mode: `[ASSESS]` (viability), `[BUILD]` (full claim construction), `[GENERATE]` (document production)

---

## Analytical Framework

### Stage 1 — Conduct Characterisation

Classify the police conduct into one or more actionable categories:

| Category | Description | Primary Tort(s) |
|----------|-------------|-----------------|
| Unlawful detention | Arrest or detention without lawful authority or beyond lawful period | False imprisonment |
| Excessive force | Force beyond what is reasonably necessary in the circumstances | Assault, battery |
| Unlawful search | Search of person or premises without statutory authority or warrant | Trespass to person, trespass to land |
| Unlawful seizure | Seizure of property without statutory authority or beyond power | Trespass to goods, conversion |
| Malicious prosecution | Prosecution commenced or maintained without reasonable cause and with malice | Malicious prosecution |
| Investigation negligence | Failure to investigate with reasonable care, causing identifiable loss | Negligence |
| Custody negligence | Failure to discharge duty of care to person in custody | Negligence |
| Abuse of process | Use of legal process for improper collateral purpose | Abuse of process |
| Misfeasance | Deliberate misuse or knowing excess of public office power | Misfeasance in public office |
| Charter breach | Conduct incompatible with Charter rights without lawful justification | s.39 Charter Act damages |

A single incident may engage multiple categories. Map each separately.

### Stage 2 — Element Decomposition

For each identified cause of action, decompose into its required elements. Use the
element tables in `references/tort-elements.md`. Every element must be assessed as:

- **Satisfied** — evidence available to establish on balance of probabilities
- **Arguable** — evidence exists but contested or inferential
- **Weak** — evidence thin, element depends on credibility finding or inference chain
- **Missing** — no evidence currently available; identify what would satisfy it

### Stage 3 — Defendant Identification and Vicarious Liability

In Victoria, police officers are members of Victoria Police (a statutory body) and
are employed by the Chief Commissioner on behalf of the State. Civil claims for
tortious conduct by officers in the course of duty are brought against:

- **The State of Victoria** — vicariously liable under common law and s.23 Crown
  Proceedings Act 1958 (Vic) for torts committed by police officers acting in
  the course of their duties
- **The individual officer** — personally liable for the tort (rarely pursued
  standalone due to enforcement difficulty, but useful for exemplary damages)

The Victoria Government Solicitor's Office (VGSO) acts for the State in civil claims.

### Stage 4 — Limitation Period Audit

For every identified cause of action, calculate the limitation period using the
reference table in `references/limitation-periods.md`. Flag:

- **Expiry date** — the final date for commencing proceedings
- **Current status** — time remaining, expired, or approaching
- **Extension availability** — whether any statutory extension applies
- **Protective steps** — whether a letter of demand preserves position or whether
  proceedings must be filed

### Stage 5 — Jurisdictional Routing

Determine the appropriate court based on:

| Claimed Amount | Court | Key Features |
|----------------|-------|--------------|
| ≤ $100,000 | Magistrates' Court | No jury, lower costs, simplified procedure |
| $100,001–$750,000 | County Court | Jury available for some claims, standard civil procedure |
| > $750,000 or equitable relief | Supreme Court | Full jurisdiction, jury available, costs significant |

For misfeasance in public office and Charter damages claims, the County Court or
Supreme Court is typical regardless of quantum due to complexity.

### Stage 6 — Damage Quantification

Assess damages under each available head. Use the framework in
`references/damage-quantification.md`:

- **General damages** — pain and suffering, loss of amenity, emotional distress,
  loss of dignity, humiliation
- **Special damages** — quantified financial loss (medical, transport, lost earnings,
  towing/storage fees, repair costs)
- **Aggravated damages** — where the defendant's conduct increases the plaintiff's
  injury (high-handedness, oppression, abuse of power)
- **Exemplary damages** — where the conduct is so outrageous that the court marks
  its disapproval and deters repetition (available for misfeasance, deliberate torts)

### Stage 7 — Evidence Assembly

Map available evidence to claim elements using the matrix approach in
`references/evidence-assembly.md`. Key sources for police claims:

- Criminal proceeding disclosure (BWC, CAD, LEAP, certificates, statements)
- Subpoenaed police records (CAD full log, LEAP event history, VKI recordings)
- Medical records (custody, hospital, GP)
- Independent witnesses
- CCTV / dashcam
- FOI material (VicPol policies, SOPs, training materials)
- IBAC / PCU complaint outcomes

### Stage 8 — VGSO Engagement Strategy

Pre-litigation correspondence to VGSO follows predictable patterns. See
`references/vgso-engagement.md` for:

- Required notice periods
- Letter of demand structure and tone calibration
- Typical VGSO response patterns and timelines
- Settlement negotiation dynamics
- Costs exposure and proportionality

### Stage 9 — Risk Assessment and Strategic Position

For every claim, produce a structured risk assessment:

```
CLAIM RISK MATRIX
═════════════════
Cause of action:     [tort]
Element strength:    [X/Y elements satisfied]
Limitation status:   [time remaining]
Damages estimate:    [$X – $Y range]
Costs exposure:      [$X own costs, $Y adverse costs risk]
Success probability: [% with reasoning]
Strategic position:  [pursue / negotiate / abandon / defer]
Recommendation:      [specific next step with deadline]
```

---

## Document Generation

When operating in `[GENERATE]` mode or when the user requests a specific document,
produce litigation-grade output using the templates in the references directory:

| Document | Reference | When |
|----------|-----------|------|
| Letter of demand | `references/templates/letter-of-demand.md` | Pre-litigation |
| Statement of claim | `references/templates/statement-of-claim.md` | Filing |
| Particulars of claim | `references/templates/particulars.md` | With or after statement of claim |
| Evidence matrix | `references/evidence-assembly.md` | Preparation |
| Damage schedule | `references/damage-quantification.md` | Filing and negotiation |
| Chronology | Generated from facts | All stages |

**Domain reference modules** — read before producing domain-specific output:

| Module | Reference | When to Read |
|--------|-----------|-------------|
| Tort elements | `references/tort-elements.md` | Element decomposition for any cause of action |
| Limitation periods | `references/limitation-periods.md` | Any limitation calculation |
| Damage quantification | `references/damage-quantification.md` | Any damages assessment |
| Evidence assembly | `references/evidence-assembly.md` | Evidence mapping and preservation |
| VGSO engagement | `references/vgso-engagement.md` | Pre-litigation and settlement strategy |
| Misfeasance deep-dive | `references/misfeasance-deep-dive.md` | Any misfeasance analysis |
| Crown proceedings | `references/crown-proceedings.md` | Vicarious liability, service, procedural mechanics |
| Criminal-to-civil bridge | `references/criminal-to-civil-bridge.md` | Mapping enforcement defects to civil claims |

All generated documents must use correct Victorian court forms, comply with the
relevant court rules, and be ready for filing or service with minimal modification.

---

## Cross-Referencing Criminal Proceedings

Where the civil claim arises from conduct that is also the subject of criminal
proceedings (common pattern: enforcement defects identified in criminal defence
become the foundation for civil claims), this skill:

1. **Imports defect findings** from enforcement-defect-analyzer — each Class 1
   (power-defeating) or Class 2 (admissibility-defeating) defect maps directly
   to a civil claim element
2. **Respects sub judice** — if criminal proceedings are pending, advise on timing
   (civil claims can proceed simultaneously but tactical considerations may favour
   delay until criminal outcome is known)
3. **Leverages disclosure** — material disclosed in criminal proceedings is available
   to the plaintiff in civil proceedings (subject to implied undertaking rules)
4. **Maps acquittal/dismissal** — a criminal acquittal or charge withdrawal does not
   prove civil liability but is evidentially relevant; a conviction may estop
   relitigating the underlying facts

---

## Integration Notes

- Feed element analysis into **irac-legal-problem-solving** for structured IRAC chains
- Feed statutory authority questions into **statutory-interpretation-engine**
- Feed evidence admissibility questions into **evidence-admissibility-engine**
- Feed enforcement defects into this skill FROM **enforcement-defect-analyzer** as
  civil claim foundations
- Feed pre-litigation correspondence into **advocacy-correspondence-craft** for
  tone calibration and strategic drafting
- Feed deadline tracking and filing requirements into **case-operations-manager**
- Feed governance/administrative dimensions into **public-authority-governance-integrity-engine**

---

## Reasoning Invariants

1. **Every claim element must be evidenced** — assertions without evidentiary mapping
   are advocacy theatre, not litigation preparation
2. **Limitation periods are jurisdictional facts** — they extinguish causes of action,
   not just defences. Calculate them first.
3. **The State defends aggressively** — VGSO litigates on institutional mandate.
   Do not assume goodwill or early settlement.
4. **Exemplary damages require deliberate wrongdoing** — mere negligence or error
   does not ground exemplary damages. The threshold is conscious wrongdoing,
   reckless indifference, or outrageous conduct.
5. **Vicarious liability requires course of duty** — off-duty conduct, personal
   frolics, and conduct outside the scope of employment break the chain.
6. **Criminal acquittal ≠ civil success** — different standard of proof, different
   elements, different evidence rules. Do not conflate.
7. **Costs follow the event** — an unsuccessful plaintiff pays the State's costs.
   Quantify this risk before recommending proceedings.
8. **Misfeasance is the nuclear option** — highest evidentiary threshold (knowledge
   of excess of power + knowledge of harm probability), highest damages ceiling.
   Do not allege unless the evidence supports it.
9. **Document everything, assume nothing** — the State controls the police records.
   Subpoena early, FOI strategically, preserve independently.
10. **Sub judice is tactical, not absolute** — civil proceedings can run parallel
    to criminal proceedings. The question is strategic timing, not prohibition.
