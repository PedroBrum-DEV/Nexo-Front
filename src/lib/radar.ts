// Radar de empresas: tipos da API e funções puras (testadas em __tests__/radar.test.ts).
// O servidor (nexo-back) descobre a necessidade de cada empresa; aqui só mostramos e filtramos.
export type Need = 'sem_site' | 'agendamento_online' | 'site_desatualizado';
export type Offer = 'site' | 'modernizacao' | 'agendamento' | 'outra' | 'nenhum';
export type Status = 'novo' | 'aprovado' | 'fila' | 'enviado' | 'respondeu' | 'fechou' | 'descartado' | 'nao_contatar';
export type NegState = '' | 'agendada' | 'ativa' | 'pausada';
export type PillTone = 'ia' | 'gold' | 'mute' | 'red' | 'green';
export type Channel = 'whatsapp' | 'email';

export type Company = {
  id: string; company: string; domain?: string | null; url?: string | null; snippet?: string | null; address?: string | null; segment?: string | null;
  email?: string | null; phone?: string | null; whatsapp?: string | null;
  score: number; reason?: string | null; subject?: string | null; message?: string | null; note?: string | null;
  status: Status; channel?: Channel | null; negState?: NegState | null; nextReplyAt?: number; lastInAt?: number; lastOutAt?: number; resumes?: number;
  offerType?: Offer | null; needs: Need[]; needNote?: string | null; hasSite: boolean; siteSignals?: string | null;
  logoUrl?: string | null; photos: string[]; themeColor?: string | null; demoUrl?: string | null;
  profile?: string | null; objection?: string | null; stage?: string | null; figures?: string | null;
};
export type NegItem = { id: string; company: string; state: NegState; stage?: string | null; nextReplyAt: number; lastInAt: number; lastOutAt: number; pausedAt: number; resumes: number };
export type RadarConfig = {
  location: string; problems: Need[]; segments: string[]; segment: string; offer: string; terms: string;
  auto: boolean; autoContact: boolean; firstContact: Channel; agentId?: string | null; everyMin: number; maxPerRun: number; nextRunAt: number;
};
export type RadarOverview = {
  config: RadarConfig;
  status: { running: boolean; lastRun?: string | null; lastRunAt: number; nextRunAt: number; searchOn: boolean };
  whatsapp: { provider: string; official: boolean; agentId?: string | null; agentName?: string | null; agentConnected: boolean; publicNumber?: string };
  limits: { maxPerDay: number; sentToday: number; whatsappFirstPerDay: number; contactGapMs: number };
  stats: { found: number; noNeed: number; discarded: number; pending: number; contacted: number; replied: number; negotiating: number; closed: number };
  companies: Company[];
  problemTypes: { id: Need; label: string }[];
  negotiation: { activeId: string | null; items: NegItem[] };
};

export const ALL_NEEDS: Need[] = ['sem_site', 'agendamento_online', 'site_desatualizado'];
export const NEED_LABEL: Record<Need, string> = { sem_site: 'Sem site', agendamento_online: 'Agenda só pelo WhatsApp', site_desatualizado: 'Site desatualizado' };
export const OFFER_LABEL: Record<Offer, string> = { site: 'Criar um site', modernizacao: 'Modernizar o site', agendamento: 'Página de agendamento', outra: 'Outra oportunidade', nenhum: 'Nada a oferecer' };
export const STATUS_LABEL: Record<Status, [string, PillTone]> = {
  novo: ['Para contatar', 'mute'], aprovado: ['Aprovada', 'mute'], fila: ['Na fila', 'gold'], enviado: ['Contatada', 'ia'], respondeu: ['Respondeu', 'green'],
  fechou: ['Fechou', 'green'], descartado: ['Descartada', 'red'], nao_contatar: ['Não contatar', 'red'],
};
export const NEG_LABEL: Record<Exclude<NegState, ''>, [string, PillTone]> = { agendada: ['Resposta agendada', 'gold'], ativa: ['Em atendimento', 'green'], pausada: ['Pausada', 'mute'] };

export type Filter = 'all' | 'pending' | 'contacted' | 'replied' | 'negotiating' | 'closed' | 'discarded';
export const FILTERS: [Filter, string][] = [['all', 'Todas'], ['pending', 'Para contatar'], ['contacted', 'Contatadas'], ['replied', 'Responderam'], ['negotiating', 'Em negociação'], ['closed', 'Fecharam'], ['discarded', 'Descartadas']];

/** Mesmas regras dos números do servidor (stats). */
export function matches(c: Company, f: Filter): boolean {
  switch (f) {
    case 'pending': return c.status === 'novo' || c.status === 'aprovado';
    case 'contacted': return c.status === 'enviado' || c.status === 'respondeu' || c.status === 'fechou';
    case 'replied': return c.status === 'respondeu' || c.status === 'fechou';
    case 'negotiating': return c.status === 'respondeu' && !!c.negState;
    case 'closed': return c.status === 'fechou';
    case 'discarded': return c.status === 'descartado';
    default: return true;
  }
}

/** Ainda dá para contatar (nunca foi contatada, não pediu para sair, não foi descartada)? */
export const canContact = (c: Company) => c.status === 'novo' || c.status === 'aprovado';
export const hasEmail = (c: Company) => !!c.email;
export const hasWhatsapp = (c: Company) => !!c.whatsapp;
/** Há esboço para gerar? (a empresa tem alguma necessidade identificada) */
export const canPreview = (c: Company) => !!c.offerType && c.offerType !== 'nenhum';

/** "agora", "em 3 min", "em 1 h 20 min". */
export function eta(ms: number, now = Date.now()): string {
  const diff = ms - now;
  if (diff <= 30_000) return 'agora';
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'em menos de 1 min';
  if (mins < 60) return `em ${mins} min`;
  const h = Math.floor(mins / 60), r = mins % 60;
  return r ? `em ${h} h ${r} min` : `em ${h} h`;
}

/** Texto de erro do formulário de pesquisa, ou '' se está tudo certo. */
export function searchError(location: string, problems: string[]): string {
  if (!location.trim()) return 'Informe a localização (cidade ou região).';
  if (!problems.length) return 'Marque pelo menos um tipo de problema.';
  return '';
}

export const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Data e hora curtas, no fuso do aparelho: "03/03, 10:00". */
export const when = (ms: number): string => (ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');

/** Linha com os contatos achados, na ordem WhatsApp, e-mail, telefone. */
export function contactLine(c: Company, fmt: (n?: string | null) => string): string {
  const parts: string[] = [];
  if (c.whatsapp) parts.push(`WhatsApp ${fmt(c.whatsapp)}`);
  if (c.email) parts.push(c.email);
  if (!c.whatsapp && c.phone) parts.push(`Tel. ${fmt(c.phone)}`);
  return parts.length ? parts.join(' · ') : 'Sem contato';
}
