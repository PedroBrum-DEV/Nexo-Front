import { SERVICES, WEEKS, agents0, totals, weekLabel } from './data';

export type Period = 'sem' | '4' | '8';
export const PERIODS: [Period, string][] = [['sem', 'Esta semana'], ['4', '4 semanas'], ['8', '8 semanas']];
export const PERIOD_LABEL: Record<Period, string> = { sem: 'Esta semana', '4': 'Últimas 4 semanas', '8': 'Últimas 8 semanas' };
export const SAMPLE_AGENT_ID = agents0[0]!.id; // na demonstração só este agente tem números

export type ReportRow = { label: string; conv: number; agend: number; remar: number; cancel: number; rate: number };
const rate = (a: number, c: number) => (c ? Math.round((a / c) * 1000) / 10 : 0);

// Números do período. `hasData` = o agente escolhido tem atendimentos (na demonstração, só os dados de exemplo).
export function buildReport(period: Period, hasData: boolean) {
  const idx = period === 'sem' ? [7] : period === '4' ? [4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const rows: ReportRow[] = idx.map((i) => {
    const wk = WEEKS[i]!;
    const n = i === 7 ? wk.days.filter(Boolean).length : 7; // a semana atual ainda está em andamento
    const t = hasData ? totals(wk, n) : { conv: 0, agend: 0, remar: 0, cancel: 0 };
    return { label: weekLabel(i), conv: t.conv, agend: t.agend, remar: t.remar, cancel: t.cancel, rate: rate(t.agend, t.conv) };
  });
  const sum = rows.reduce((a, r) => ({ conv: a.conv + r.conv, agend: a.agend + r.agend, remar: a.remar + r.remar, cancel: a.cancel + r.cancel }), { conv: 0, agend: 0, remar: 0, cancel: 0 });
  const total: ReportRow = { label: 'Total', ...sum, rate: rate(sum.agend, sum.conv) };
  const services: [string, number][] = SERVICES.map(([n, pct]) => [n, hasData ? Math.round((total.agend * pct) / 100) : 0]);
  return { rows, total, services };
}
export const pctText = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;
