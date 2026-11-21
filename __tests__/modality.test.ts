import { describe, it, expect } from 'vitest';
import { analyzeDeonticProvisions } from '../lib/nlp/modality';
import { processNLP } from '../lib/nlp/engine';

describe('Deontic provisions', () => {
  it('classifies must as mandatory', () => {
    const [p] = analyzeDeonticProvisions('The court must give reasons.');
    expect(p).toMatchObject({ operator: 'must', force: 'mandatory', subject: 'The court', action: 'give reasons' });
  });

  it('classifies must not as prohibitory, not must', () => {
    const ps = analyzeDeonticProvisions('A person must not destroy evidence.');
    expect(ps).toHaveLength(1);
    expect(ps[0]).toMatchObject({ operator: 'must not', force: 'prohibitory', ambiguous: false });
  });

  it('classifies may as directory', () => {
    const [p] = analyzeDeonticProvisions('The magistrate may adjourn the hearing.');
    expect(p).toMatchObject({ operator: 'may', force: 'directory', action: 'adjourn the hearing' });
  });

  it('flags may not as prohibitory but ambiguous', () => {
    const [p] = analyzeDeonticProvisions('The tribunal may not award costs.');
    expect(p).toMatchObject({ operator: 'may not', force: 'prohibitory', ambiguous: true });
  });

  it('binds a leading if to every modal in the sentence', () => {
    const ps = analyzeDeonticProvisions('If the accused is under 18, the court must close the court and may order a report.');
    expect(ps).toHaveLength(2);
    for (const p of ps) {
      expect(p.conditions).toHaveLength(1);
      expect(p.conditions[0]).toMatchObject({ kind: 'if', text: 'the accused is under 18' });
      expect(p.subject).toBe('the court');
    }
    expect(ps[0].action).toBe('close the court');
    expect(ps[1].action).toBe('order a report');
  });

  it('binds a trailing unless only to the preceding modal', () => {
    const ps = analyzeDeonticProvisions('The court must admit the evidence unless it is unfairly prejudicial and may exclude hearsay.');
    expect(ps[0].conditions).toEqual([expect.objectContaining({ kind: 'unless', text: 'it is unfairly prejudicial' })]);
    expect(ps[0].action).toBe('admit the evidence');
    expect(ps[1].conditions).toHaveLength(0);
  });

  it('recognises only if as a necessary condition', () => {
    const [p] = analyzeDeonticProvisions('The court may grant bail only if the surety is approved.');
    expect(p.conditions[0]).toMatchObject({ kind: 'only_if', text: 'the surety is approved' });
  });

  it('ignores the month May and as if / even if', () => {
    expect(analyzeDeonticProvisions('The hearing was on 1 May 2019 and in May 2020.')).toHaveLength(0);
    const [p] = analyzeDeonticProvisions('The court must proceed even if the party is absent.');
    expect(p.conditions).toHaveLength(0);
  });

  it('treats shall and shall not like must and must not', () => {
    expect(analyzeDeonticProvisions('The registrar shall file the notice.')[0]).toMatchObject({ operator: 'shall', force: 'mandatory' });
    expect(analyzeDeonticProvisions('A officer shall not disclose the report.')[0]).toMatchObject({ operator: 'shall not', force: 'prohibitory' });
  });

  it('flags the effect of exercise / power language', () => {
    expect(analyzeDeonticProvisions('The court may exercise its power to stay proceedings.')[0].power)
      .toEqual({ terms: ['exercise', 'power'], effect: 'discretionary' });
    expect(analyzeDeonticProvisions('The Minister must exercise the power within 28 days.')[0].power?.effect).toBe('duty_to_exercise');
    expect(analyzeDeonticProvisions('The delegate must not exercise the power of arrest.')[0].power?.effect).toBe('withheld');
    expect(analyzeDeonticProvisions('The court must give reasons.')[0].power).toBeUndefined();
  });

  it('is exposed on the NLP pipeline result', () => {
    expect(processNLP('The court must give reasons.').provisions).toHaveLength(1);
  });
});
