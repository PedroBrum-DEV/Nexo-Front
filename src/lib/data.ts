// Dados de DEMONSTRAÇÃO (nomes e números inventados). Troque por chamadas à API da IA quando ela expuser as rotas
// de listagem (veja o README: "Rotas que a API ainda precisa ter").
export type Note = [string, string, number?];
export type Msg = { t: string; w: 'c' | 's'; text: string; note?: Note };
export type Outcome = 'agendou' | 'registro' | 'andamento' | 'resolvida';
export type Conversation = { id: string; agent: string; name: string; day: string; time: string; out: Outcome; last: string; msgs: Msg[] };
export type Req = { id: string; kind: 'pergunta' | 'reclamacao' | 'pedido'; title: string; text: string; n: number; conv: string; when: string; status: 'open' | 'done' };
export type Agent = { id: string; name: string; area: string; status: 'active' | 'paused' | 'draft'; connection: string; phone: string | null; prompt: string; settings: { company?: string; contact?: string; slots?: { days: number[]; start: number; end: number; step: number }; ignoreNumbers?: string[]; meetings?: { enabled: boolean; link: string } } };
const m = (t: string, w: 'c' | 's', text: string, note?: Note): Msg => ({ t, w, text, note });
export const conversations: Conversation[] = [
  { id: 'ana', agent: 'sofia', name: 'Ana Paula', day: 'Hoje', time: '09:42', out: 'agendou', last: 'Marquei pra terça às 10h30. Leva a carteirinha.', msgs: [
    m('09:12', 'c', 'Oi, queria marcar uma consulta com dermatologista'), m('09:12', 's', 'Oi, Ana. Você quer pela Unimed ou particular?'),
    m('09:13', 'c', 'Unimed. De preferência terça de manhã'), m('09:13', 's', 'Terça tem 8h30, 9h30, 10h30 e 11h. Qual fica melhor?', ['Consultou horários', 'terça · 4 livres']),
    m('09:14', 'c', '10h30 tá ótimo'), m('09:14', 's', 'Marquei pra terça às 10h30. Leva a carteirinha da Unimed e um documento com foto, e chega uns 15 minutos antes.', ['Agendou', 'Ter 10:30 · Dermatologia', 1]),
    m('09:15', 'c', 'Perfeito, obrigada!', ['Registrou lead', 'quente · Unimed'])] },
  { id: 'marcos', agent: 'sofia', name: 'Marcos Lima', day: 'Hoje', time: '09:31', out: 'andamento', last: 'Essa eu não sei te dizer por aqui. A recepção confirma.', msgs: [
    m('09:25', 'c', 'Oi, queria marcar cardiologia na quinta'), m('09:26', 's', 'Oi, Marcos. Quinta tem 15h e 16h. Qual prefere?'),
    m('09:30', 'c', '15h. Vocês aceitam cartão corporativo?'), m('09:31', 's', 'Essa eu não sei te dizer por aqui. A recepção confirma no (11) 0000-1000. Quer que eu já deixe a quinta às 15h marcada?', ['Registrou pergunta', 'cartão corporativo', 1])] },
  { id: 'fernanda', agent: 'sofia', name: 'Fernanda Costa', day: 'Hoje', time: '09:12', out: 'registro', last: 'Cobraram meu retorno e era gratuito.', msgs: [
    m('09:10', 'c', 'Cobraram meu retorno e era gratuito, né?'),
    m('09:12', 's', 'Poxa, entendo o incômodo. Pela regra, retorno em até 30 dias não tem custo. Não consigo estornar por aqui, mas deixei registrado, e a recepção atende no (11) 0000-1000.', ['Registrou reclamação', 'cobrança de retorno', 1])] },
  { id: 'rafael', agent: 'sofia', name: 'Rafael Souza', day: 'Hoje', time: '08:50', out: 'agendou', last: 'Áudio: quero reagendar para sexta.', msgs: [
    m('08:46', 'c', 'Áudio: quero reagendar para sexta'), m('08:47', 's', 'Sexta tem 9h e 14h30. Qual prefere?', ['Consultou horários', 'sexta · 2 livres']),
    m('08:49', 'c', '14h30'), m('08:50', 's', 'Remarquei pra sexta às 14h30.', ['Remarcou', 'Sex 14:30 · Dermatologia', 1])] },
  { id: 'juliana', agent: 'sofia', name: 'Juliana Reis', day: 'Ontem', time: '17:55', out: 'resolvida', last: 'Até terça, Juliana.', msgs: [m('17:54', 'c', 'Obrigada! Até terça.'), m('17:55', 's', 'Até terça, Juliana.')] },
  { id: 'carlos', agent: 'sofia', name: 'Carlos Dias', day: 'Ontem', time: '17:40', out: 'registro', last: 'Aos sábados a clínica fecha.', msgs: [
    m('17:38', 'c', 'Vocês atendem aos sábados?'), m('17:40', 's', 'Aos sábados a clínica fecha. Atendemos de segunda a sexta, das 8h às 17h.', ['Registrou pedido', 'atendimento aos sábados', 1])] },
  { id: 'beatriz', agent: 'sofia', name: 'Beatriz Moura', day: 'Ontem', time: '11:05', out: 'registro', last: 'Essa eu não sei te dizer por aqui.', msgs: [
    m('11:03', 'c', 'Tem vaga para cadeirante no estacionamento?'), m('11:05', 's', 'Essa eu não sei te dizer por aqui. A recepção confirma no (11) 0000-1000.', ['Registrou pergunta', 'estacionamento para PCD', 1])] },
];
export const requests0: Req[] = [
  { id: 'r1', kind: 'pergunta', title: 'Pagamento corporativo', text: 'Aceitamos cartão corporativo?', n: 7, conv: 'marcos', when: 'hoje, 09:31', status: 'open' },
  { id: 'r2', kind: 'reclamacao', title: 'Cobrança de retorno', text: 'Cliente diz que cobraram um retorno que seria gratuito (até 30 dias).', n: 1, conv: 'fernanda', when: 'hoje, 09:12', status: 'open' },
  { id: 'r3', kind: 'pedido', title: 'Atendimento aos sábados', text: 'Pediu atendimento aos sábados, fora do horário da clínica.', n: 3, conv: 'carlos', when: 'ontem, 17:40', status: 'open' },
  { id: 'r4', kind: 'pergunta', title: 'Estacionamento para PCD', text: 'Tem vaga para pessoas com deficiência?', n: 4, conv: 'beatriz', when: 'ontem, 11:05', status: 'done' },
];
export const agents0: Agent[] = [{
  id: 'sofia', name: 'Sofia', area: 'agendamento', status: 'active', connection: 'open', phone: '5511999990000',
  settings: { company: 'Clínica Vida Plena', contact: 'Recepção (11) 0000-1000', slots: { days: [1, 2, 3, 4, 5], start: 8, end: 17, step: 30 }, ignoreNumbers: [] },
  prompt: 'Empresa: Clínica Vida Plena, clínica médica com consultas particulares e por convênio.\n\nHorários: segunda a sexta, das 8h às 17h. Fechado em sábados, domingos e feriados.\n\nValores (particular): clínica geral R$ 250. Dermatologia R$ 380. Cardiologia R$ 420. Pediatria R$ 300. Retorno em até 30 dias: sem custo.\n\nConvênios: Unimed, Bradesco Saúde e SulAmérica. Levar a carteirinha e um documento com foto.\n\nEstacionamento: conveniado ao lado, com vagas para pessoas com deficiência.',
}];
export const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ---------- Agendamentos por semana (demonstração) ----------
// 8 semanas, da mais antiga à atual. Cada dia (seg a dom): [agendados, remarcados, cancelados]. A semana atual vai até quarta (hoje).
const rnd = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const RAW: (number[] | null)[][] = [
  [[7, 1, 1], [8, 2, 1], [8, 1, 2], [9, 2, 1], [10, 2, 2], [4, 1, 0], [1, 0, 0]],
  [[8, 2, 1], [9, 1, 1], [9, 2, 1], [10, 2, 2], [11, 2, 1], [5, 1, 1], [2, 0, 0]],
  [[9, 2, 2], [9, 2, 1], [10, 3, 1], [10, 2, 2], [12, 3, 1], [5, 1, 0], [1, 0, 0]],
  [[9, 1, 1], [10, 2, 2], [11, 2, 1], [11, 3, 2], [12, 2, 2], [6, 1, 1], [2, 1, 0]],
  [[10, 2, 1], [11, 3, 1], [10, 2, 2], [12, 2, 1], [13, 3, 2], [6, 0, 1], [2, 0, 0]],
  [[10, 2, 2], [11, 2, 1], [11, 3, 1], [12, 3, 2], [13, 2, 1], [7, 1, 0], [2, 1, 0]],
  [[10, 3, 2], [12, 2, 1], [11, 2, 2], [12, 3, 1], [14, 3, 2], [6, 1, 1], [3, 0, 0]],
  [[11, 2, 1], [13, 3, 1], [12, 2, 0], null, null, null, null],
];
export type Week = { start: Date; days: (number[] | null)[]; heat: number[][] };
export const WEEKS: Week[] = (() => {
  const r = rnd(11);
  return RAW.map((days, w) => ({
    start: new Date(2026, 10, 2 - 7 * (7 - w)),
    days,
    heat: [0.35, 0.7, 0.55, 0.45].map((b, i) => [0, 1, 2, 3, 4, 5, 6].map((d) => Math.min(1, Math.max(0.04, b * (d > 4 ? 0.35 : 1) * (0.7 + r() * 0.6) * (i === 1 && d < 5 ? 1.25 : 1))))),
  }));
})();
export const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const BLOCKS = ['8h às 10h', '10h às 12h', '13h às 15h', '15h às 17h'];
export const SERVICES: [string, number][] = [['Dermatologia', 38], ['Clínica geral', 27], ['Cardiologia', 19], ['Pediatria', 16]];
export const weekLabel = (w: number) => { const a = WEEKS[w].start, b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6); const f = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', ''); return `${f(a)} a ${f(b)}`; };
// Soma dos primeiros n dias de uma semana. Conversas: estimativa a partir dos agendamentos (demonstração).
export const totals = (week: Week, n = 7) => { const t = { agend: 0, remar: 0, cancel: 0, conv: 0 }; week.days.slice(0, n).forEach((d) => { if (d) { t.agend += d[0]; t.remar += d[1]; t.cancel += d[2]; } }); t.conv = Math.round(t.agend * 2.15); return t; };

export const KIND: Record<string, string> = { pergunta: 'Pergunta sem resposta', reclamacao: 'Reclamação', pedido: 'Pedido especial' };
export const AGENT_STATE: Record<string, [string, string]> = { active: ['Atendendo', 'ia'], paused: ['Pausado', 'mute'], draft: ['Rascunho', 'gold'] };
export const OUT: Record<string, [string, string]> = { agendou: ['Agendou', 'ia'], registro: ['Registrou', 'gold'], andamento: ['Em andamento', 'ia'], resolvida: ['Resolvida', 'mute'] };
