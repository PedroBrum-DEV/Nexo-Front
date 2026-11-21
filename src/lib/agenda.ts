// Agenda: agrupa os horários por dia e decide o que mostrar. Funções puras (testadas em __tests__/agenda.test.ts).
export type Appt = {
  id: string; kind: 'reuniao' | 'atendimento'; status: 'booked' | 'cancelled'; start: number; end: number; durationMin: number;
  name: string; service?: string | null; topic?: string | null; phone?: string | null; email?: string | null; meetUrl?: string | null;
  confirm?: string | null; agentId: string; agentName?: string | null; conversationId?: string | null;
};
export type DayGroup = { key: string; label: string; items: Appt[] };

const pad = (n: number) => String(n).padStart(2, '0');
/** AAAA-MM-DD no fuso do aparelho. */
export const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const hhmm = (ms: number) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const DAY = 86_400_000;

export function dayLabel(ms: number, now = Date.now()): string {
  const k = ymd(ms);
  if (k === ymd(now)) return 'Hoje';
  if (k === ymd(now + DAY)) return 'Amanhã';
  if (k === ymd(now - DAY)) return 'Ontem';
  const d = new Date(ms);
  const wd = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()]!;
  return `${wd}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Agrupa por dia, mantendo a ordem recebida. */
export function groupByDay(items: Appt[], now = Date.now()): DayGroup[] {
  const out: DayGroup[] = [];
  for (const a of items) {
    const key = ymd(a.start);
    let g = out[out.length - 1];
    if (!g || g.key !== key) { g = { key, label: dayLabel(a.start, now), items: [] }; out.push(g); }
    g.items.push(a);
  }
  return out;
}

/** A chamada está perto de começar ou em andamento (de 10 min antes até o fim)? */
export const isLive = (a: Appt, now = Date.now()) => a.status === 'booked' && now >= a.start - 10 * 60_000 && now <= a.end;
/** Reunião marcada, ainda por vir, sem link: o dono precisa mandar. */
export const needsLink = (a: Appt, now = Date.now()) => a.kind === 'reuniao' && a.status === 'booked' && !a.meetUrl && a.end > now;

export const range = (a: Appt) => `${hhmm(a.start)}–${hhmm(a.end)}`;

/** Filtros da API para cada aba da tela. */
export function queryFor(tab: 'next' | 'past' | 'cancelled', now = Date.now()): string {
  if (tab === 'next') return `?from=${ymd(now)}&to=${ymd(now + 90 * DAY)}`;
  if (tab === 'past') return `?from=${ymd(now - 30 * DAY)}&to=${ymd(now - DAY)}`;
  return `?status=cancelled&from=${ymd(now - 30 * DAY)}&to=${ymd(now + 90 * DAY)}`;
}
