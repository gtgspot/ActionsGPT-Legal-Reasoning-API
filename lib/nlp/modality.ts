/**
 * Deontic / conditional language analysis for legal text.
 *
 * Classifies the modal operators used in legislation and rules and binds each
 * one to the clause it governs, together with any condition attached to it:
 *
 *   must      -> mandatory   (absolute duty)
 *   shall     -> mandatory   (traditional form of "must")
 *   must not  -> prohibitory (absolute prohibition)
 *   shall not -> prohibitory (traditional form of "must not")
 *   may       -> directory   (permission / discretion; no duty to act)
 *   may not   -> prohibitory, flagged ambiguous (denial of power vs. discretion
 *                not to act - drafters discourage it, so it is surfaced for review)
 *   if        -> condition (the provision applies when the condition holds)
 *   only if   -> condition (the condition is necessary)
 *   exercise / power -> flags a power-conferring provision (see `power`): "may"
 *                       leaves the exercise discretionary, "must"/"shall" makes the
 *                       exercise of the power a duty, and a prohibition removes it
 *   unless    -> exception (the provision applies except when the condition holds)
 */

export type ModalOperator = 'must' | 'must not' | 'shall' | 'shall not' | 'may' | 'may not';

export type DeonticForce = 'mandatory' | 'prohibitory' | 'directory';

export type ConditionKind = 'if' | 'only_if' | 'unless';

export interface ProvisionCondition {
  kind: ConditionKind;
  marker: string;
  text: string;
  startOffset: number;
  endOffset: number;
}

export interface PowerContext {
  /** The "exercise" / "power" words found in the provision. */
  terms: string[];
  /** Whether the power is discretionary, a duty to exercise, or withheld. */
  effect: 'discretionary' | 'duty_to_exercise' | 'withheld';
}

export interface DeonticProvision {
  operator: ModalOperator;
  force: DeonticForce;
  subject: string;
  action: string;
  conditions: ProvisionCondition[];
  /** Plain-language reading of the operator + conditions. */
  reading: string;
  /** Set where the provision confers, or removes, a power ("exercise" / "power"). */
  power?: PowerContext;
  /** True where the operator has more than one accepted meaning ("may not"). */
  ambiguous: boolean;
  sentence: string;
  startOffset: number;
  endOffset: number;
}

const OPERATOR_FORCE: Record<ModalOperator, DeonticForce> = {
  must: 'mandatory',
  'must not': 'prohibitory',
  shall: 'mandatory',
  'shall not': 'prohibitory',
  may: 'directory',
  'may not': 'prohibitory',
};

// Longest alternatives first so "must not" is never read as "must" + "not".
const MARKER_PATTERN = /\b(must\s+not|shall\s+not|may\s+not|must|shall|may|only\s+if|if|unless)\b/gi;

const TRAILING_CONNECTIVES = /[\s,;:]*\b(and|or|but)\s*$/i;

interface Marker {
  kind: 'modal' | ConditionKind;
  text: string;
  start: number;
  end: number;
}

function normalise(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ');
}

function clean(text: string): string {
  return text.replace(TRAILING_CONNECTIVES, '').replace(/^[\s,;:]+|[\s,;:.]+$/g, '').trim();
}

function findMarkers(sentence: string): Marker[] {
  const markers: Marker[] = [];
  for (const match of sentence.matchAll(MARKER_PATTERN)) {
    const text = normalise(match[0]);
    const start = match.index ?? 0;
    const end = start + match[0].length;

    // "May" the month ("1 May 2019", "May 2019") is not a modal verb.
    if (text === 'may' && (/^\s+\d/.test(sentence.slice(end)) || /\d\s+$/.test(sentence.slice(0, start)))) {
      continue;
    }
    // "as if" / "even if" introduce a comparison or concession, not a condition.
    if (text === 'if' && /\b(as|even)\s+$/i.test(sentence.slice(0, start))) {
      continue;
    }

    const kind: Marker['kind'] =
      text === 'if' ? 'if' : text === 'only if' ? 'only_if' : text === 'unless' ? 'unless' : 'modal';
    markers.push({ kind, text, start, end });
  }
  return markers;
}

function describe(operator: ModalOperator, conditions: ProvisionCondition[]): string {
  const base: Record<ModalOperator, string> = {
    must: 'Mandatory: the duty is absolute',
    'must not': 'Prohibited: the act is absolutely forbidden',
    shall: 'Mandatory: the duty is absolute',
    'shall not': 'Prohibited: the act is absolutely forbidden',
    may: 'Directory: permitted, with discretion whether to act',
    'may not': 'Prohibited or not entitled (ambiguous: confirm against the enabling provision)',
  };
  const parts = [base[operator]];
  for (const c of conditions) {
    if (c.kind === 'if') parts.push(`only when: ${c.text}`);
    else if (c.kind === 'only_if') parts.push(`only when (necessary condition): ${c.text}`);
    else parts.push(`except when: ${c.text}`);
  }
  return parts.join('; ');
}

const POWER_TERMS = /\b(exercis(?:e|es|ed|ing)|powers?)\b/gi;

function detectPower(force: DeonticForce, text: string): PowerContext | undefined {
  const terms = [...new Set([...text.matchAll(POWER_TERMS)].map((m) => m[1].toLowerCase()))];
  if (terms.length === 0) return undefined;
  const effect = force === 'directory' ? 'discretionary' : force === 'mandatory' ? 'duty_to_exercise' : 'withheld';
  return { terms, effect };
}

function splitSentences(input: string): Array<{ text: string; offset: number }> {
  const sentences: Array<{ text: string; offset: number }> = [];
  const pattern = /[^.;!?]+(?:[.;!?]+|$)/g;
  for (const match of input.matchAll(pattern)) {
    if (match[0].trim().length > 0) sentences.push({ text: match[0], offset: match.index ?? 0 });
  }
  return sentences;
}

/**
 * Extract every modal provision from `input`, binding each operator to its
 * subject, action and the conditions ("if", "only if", "unless") that qualify it.
 *
 * Conditions placed before the first modal ("If X, the court must Y") qualify
 * every provision in the sentence; conditions placed after a modal qualify
 * only that modal.
 */
export function analyzeDeonticProvisions(input: string): DeonticProvision[] {
  const provisions: DeonticProvision[] = [];

  for (const { text: sentence, offset } of splitSentences(input)) {
    const markers = findMarkers(sentence);
    const firstModal = markers.findIndex((m) => m.kind === 'modal');
    if (firstModal === -1) continue;

    // Text span owned by each marker: up to the next marker (or sentence end).
    const spanEnd = (i: number) => (i + 1 < markers.length ? markers[i + 1].start : sentence.length);
    const toCondition = (m: Marker, i: number): ProvisionCondition => ({
      kind: m.kind as ConditionKind,
      marker: m.text,
      text: clean(sentence.slice(m.end, spanEnd(i))),
      startOffset: offset + m.start,
      endOffset: offset + spanEnd(i),
    });

    // Leading conditions: the clause after the final comma is the subject.
    const leading: ProvisionCondition[] = [];
    let leadingSubject = '';
    for (let i = 0; i < firstModal; i++) {
      const cond = toCondition(markers[i], i);
      if (i === firstModal - 1) {
        const lastComma = cond.text.lastIndexOf(',');
        if (lastComma !== -1) {
          leadingSubject = clean(cond.text.slice(lastComma + 1));
          cond.text = clean(cond.text.slice(0, lastComma));
        }
      }
      leading.push(cond);
    }

    let subject = leadingSubject || clean(sentence.slice(0, markers[firstModal].start));
    if (!leadingSubject && firstModal > 0) subject = '';

    for (let i = firstModal; i < markers.length; i++) {
      if (markers[i].kind !== 'modal') continue;
      const operator = markers[i].text as ModalOperator;

      const conditions = [...leading];
      let j = i + 1;
      while (j < markers.length && markers[j].kind !== 'modal') {
        conditions.push(toCondition(markers[j], j));
        j++;
      }

      const actionEnd = i + 1 < markers.length ? markers[i + 1].start : sentence.length;
      const force = OPERATOR_FORCE[operator];
      const action = clean(sentence.slice(markers[i].end, actionEnd));
      provisions.push({
        operator,
        force,
        subject,
        action,
        power: detectPower(force, action),
        conditions,
        reading: describe(operator, conditions),
        ambiguous: operator === 'may not',
        sentence: sentence.trim(),
        startOffset: offset + markers[i].start,
        endOffset: offset + spanEnd(j - 1),
      });
    }
  }

  return provisions;
}
