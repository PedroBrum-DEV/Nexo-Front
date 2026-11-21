import { describe, expect, it } from 'vitest';
import { dayLabel, groupByDay, isLive, needsLink, queryFor, range, ymd, type Appt } from '../agenda';

const at = (y: number, m: number, d: number, h = 0, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const base = (over: Partial<Appt>): Appt => ({ id: 'a', kind: 'reuniao', status: 'booked', start: at(2026, 11, 20, 10), end: at(2026, 11, 20, 10, 30), durationMin: 30, name: 'Ana', agentId: 'ag', ...over });
const NOW = at(2026, 11, 20, 9);

describe('agenda', () => {
  it('rotula hoje, amanhã e ontem; outros dias com dia da semana', () => {
    expect(dayLabel(at(2026, 11, 20, 15), NOW)).toBe('Hoje');
    expect(dayLabel(at(2026, 11, 21, 8), NOW)).toBe('Amanhã');
    expect(dayLabel(at(2026, 11, 19, 8), NOW)).toBe('Ontem');
    expect(dayLabel(at(2026, 11, 25, 8), NOW)).toBe('qua, 25/11');
  });
  it('agrupa por dia mantendo a ordem', () => {
    const g = groupByDay([base({ id: '1' }), base({ id: '2', start: at(2026, 11, 20, 14), end: at(2026, 11, 20, 14, 30) }), base({ id: '3', start: at(2026, 11, 22, 9), end: at(2026, 11, 22, 9, 30) })], NOW);
    expect(g.map((x) => x.items.length)).toEqual([2, 1]);
    expect(g[0]!.label).toBe('Hoje');
  });
  it('mostra o intervalo do horário', () => { expect(range(base({}))).toBe('10:00–10:30'); });
  it('chamada "ao vivo" de 10 min antes até o fim', () => {
    expect(isLive(base({}), at(2026, 11, 20, 9, 49))).toBe(false);
    expect(isLive(base({}), at(2026, 11, 20, 9, 50))).toBe(true);
    expect(isLive(base({}), at(2026, 11, 20, 10, 31))).toBe(false);
    expect(isLive(base({ status: 'cancelled' }), at(2026, 11, 20, 10, 5))).toBe(false);
  });
  it('avisa quando reunião futura está sem link', () => {
    expect(needsLink(base({ meetUrl: null }), NOW)).toBe(true);
    expect(needsLink(base({ meetUrl: 'https://meet.google.com/x' }), NOW)).toBe(false);
    expect(needsLink(base({ kind: 'atendimento' }), NOW)).toBe(false);
    expect(needsLink(base({ meetUrl: null }), at(2026, 11, 20, 12))).toBe(false);
  });
  it('monta o filtro de cada aba', () => {
    expect(queryFor('next', NOW)).toBe('?from=2026-11-20&to=2027-02-18');
    expect(queryFor('past', NOW)).toBe('?from=2026-10-21&to=2026-11-19');
    expect(queryFor('cancelled', NOW)).toContain('status=cancelled');
    expect(ymd(NOW)).toBe('2026-11-20');
  });
});
