import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { agents0, requests0, type Agent, type Req } from './data';
import { demoQr, live, remote } from './api';
import { useAuth } from './auth';
import { workspaceKey } from './keys';
import type { ToastData } from '../components/ui';

type Slots = { days: number[]; start: number; end: number; step: number };
type Draft = { name: string; company: string; area: string; prompt: string; contact?: string; slots?: Slots };
// Uma versão salva das instruções de um agente (a última da lista é a que está valendo).
export type Version = { id: string; at: string; text: string; note: string };
// Tudo o que a conta guarda neste aparelho. Com API, `agents` vem do servidor e não é gravado aqui.
export type Workspace = {
  sample: boolean; // dados de exemplo carregados (Sofia, registros, números do Resumo)
  agents: Agent[]; requests: Req[];
  tested: Record<string, boolean>; // agentes que já foram testados no chat de teste
  history: Record<string, Version[]>; // versões das instruções, por agente
  onboardingDismissed: boolean;
};
const EMPTY: Workspace = { sample: false, agents: [], requests: [], tested: {}, history: {}, onboardingDismissed: false };
const KEY = workspaceKey;

type Store = {
  ws: Workspace; requests: Req[]; agents: Agent[]; sample: boolean; tested: Record<string, boolean>; history: Record<string, Version[]>; onboardingDismissed: boolean;
  loaded: boolean; loadError: string; reload: () => void; toast: ToastData; focus: string | null; setFocus: (id: string | null) => void;
  resolve: (id: string, msg?: string) => void; reopen: (id: string) => void; openBase: (reqId: string) => void;
  createAgent: (d: Draft) => Promise<Agent>; saveAgent: (id: string, p: Record<string, unknown>, note?: string) => Promise<void>;
  addToPrompt: (agentId: string, reqId: string, title: string, text: string) => Promise<void>; restoreVersion: (agentId: string, versionId: string) => Promise<void>;
  connectAgent: (id: string) => Promise<{ qr?: string; matrix?: boolean[][] }>; pollConnection: (id: string) => Promise<{ state: string }>; simulateScan: (id: string) => Promise<void>;
  disconnectAgent: (id: string) => Promise<void>; setAgentStatus: (id: string, status: Agent['status']) => Promise<void>; removeAgent: (id: string) => Promise<void>;
  markTested: (id: string) => void; dismissOnboarding: () => void; loadSample: () => void; resetWorkspace: () => void;
  say: (msg: string, undo?: () => void) => void; dismiss: () => void;
};
const Ctx = createContext<Store>(null as unknown as Store);
export const useApp = () => useContext(Ctx);
// o servidor devolve o registro com mais campos (agentId, at); a tela usa só estes
const fromServerReq = (r: any): Req => ({ id: r.id, kind: r.kind, title: r.title, text: r.text, n: r.n ?? 1, conv: r.conv ?? '', when: r.when ?? '', status: r.status });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Acrescenta uma versão ao histórico (ignora se o texto é igual ao da última).
function withVersion(w: Workspace, agentId: string, text: string, note: string, at = new Date().toISOString()): Workspace {
  const list = w.history[agentId] ?? [];
  if (list.length && list[list.length - 1]!.text === text) return w;
  return { ...w, history: { ...w.history, [agentId]: [...list, { id: uid(), at, text, note }].slice(-30) } };
}

// Versões de exemplo para a Sofia: duas anteriores (derivadas do texto atual) e a atual.
function sampleHistory(a: Agent): Version[] {
  const day = 86400000, now = Date.now();
  const lines = a.prompt.split('\n');
  const older = lines.slice(0, Math.max(3, lines.length - 3)).join('\n');
  const mid = a.prompt.replace(/R\$ 250/g, 'R$ 230').replace(/R\$ 380/g, 'R$ 350');
  return [
    { id: uid(), at: new Date(now - 21 * day).toISOString(), text: older, note: 'Versão inicial' },
    { id: uid(), at: new Date(now - 9 * day).toISOString(), text: mid, note: 'Convênios e estacionamento adicionados' },
    { id: uid(), at: new Date(now - 2 * day).toISOString(), text: a.prompt, note: 'Valores das consultas atualizados' },
  ];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const doc = user?.document ?? '';
  const [ws, setWs] = useState<Workspace>(EMPTY);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(!live);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<ToastData>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const save = useRef<ReturnType<typeof setTimeout>>(undefined);

  // abre o espaço de trabalho guardado desta conta
  useEffect(() => {
    let off = false;
    AsyncStorage.getItem(KEY(doc)).then((raw) => {
      if (off) return;
      try { setWs({ ...EMPTY, ...(raw ? (JSON.parse(raw) as Partial<Workspace>) : {}) }); } catch { setWs(EMPTY); }
    }).catch(() => {}).finally(() => { if (!off) setReady(true); });
    return () => { off = true; };
  }, [doc]);
  // com API, os agentes e os registros para a equipe vêm do servidor
  const reload = useCallback(() => {
    if (!live) return;
    setLoadError(''); setLoaded(false);
    Promise.all([remote.list(), remote.requests()])
      .then(([a, r]) => { setWs((w) => ({ ...w, agents: a, requests: (r as any[]).map(fromServerReq) })); setLoaded(true); })
      .catch((e: Error) => { setLoadError(e.message); setLoaded(true); });
  }, []);
  useEffect(() => { reload(); }, [reload]);
  // grava (com pequena espera) sempre que algo muda
  useEffect(() => {
    if (!ready) return;
    clearTimeout(save.current);
    save.current = setTimeout(() => { AsyncStorage.setItem(KEY(doc), JSON.stringify(live ? { ...ws, agents: [] } : ws)).catch(() => {}); }, 250);
    return () => clearTimeout(save.current);
  }, [ws, ready, doc]);

  const dismiss = useCallback(() => setToast(null), []);
  const say = useCallback((msg: string, undo?: () => void) => {
    setToast({ msg, undo: undo && (() => { undo(); setToast(null); }), k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5500);
  }, []);
  const patch = (id: string, p: Partial<Agent> & { settings?: Agent['settings'] }) =>
    setWs((w) => ({ ...w, agents: w.agents.map((a) => (a.id === id ? { ...a, ...p, settings: { ...a.settings, ...(p.settings || {}) } } : a)) }));

  // ---------- registros ----------
  const setStatus = (id: string, status: Req['status']) => setWs((w) => ({ ...w, requests: w.requests.map((r) => (r.id === id ? { ...r, status } : r)) }));
  // com API: muda na tela já e confirma no servidor; se falhar, volta e avisa
  const changeStatus = (id: string, status: Req['status']) => {
    const before = ws.requests.find((r) => r.id === id)?.status;
    setStatus(id, status);
    if (live) remote.patchRequest(id, status).catch((e: Error) => { if (before) setStatus(id, before); say(`Não consegui salvar: ${e.message}`); });
  };
  const resolve = (id: string, msg = 'Registro marcado como resolvido.') => { changeStatus(id, 'done'); say(msg, () => changeStatus(id, 'open')); };
  const reopen = (id: string) => { changeStatus(id, 'open'); say('Registro reaberto.'); };
  const openBase = (reqId: string) => {
    setFocus(reqId);
    const a = ws.agents[0];
    if (a) router.push({ pathname: '/agente/[id]', params: { id: a.id, tab: 'config' } }); else router.push('/agentes');
  };

  // ---------- agentes (demonstração local ou API real) ----------
  const createAgent = async (d: Draft) => {
    const body = { name: d.name, company: d.company, area: d.area, prompt: d.prompt, contact: d.contact, ...(d.slots ? { slots: d.slots } : {}) };
    const a: Agent = live ? await remote.create(body) : { id: `ag-${uid()}`, name: body.name, area: body.area, prompt: body.prompt.trim(), status: 'draft', connection: 'close', phone: null, settings: { company: body.company, contact: body.contact || '', slots: body.slots, ignoreNumbers: [] } };
    setWs((w) => withVersion({ ...w, agents: [...w.agents, a] }, a.id, a.prompt, 'Versão inicial'));
    return a;
  };
  const saveAgent = async (id: string, p: Record<string, unknown>, note?: string) => {
    if (live) { const a = await remote.update(id, p); patch(id, a); }
    else {
      const { name, prompt, ...rest } = p as { name?: string; prompt?: string };
      patch(id, { ...(name ? { name } : {}), ...(prompt ? { prompt } : {}), settings: rest });
    }
    if (typeof p.prompt === 'string' && p.prompt.trim()) setWs((w) => withVersion(w, id, (p.prompt as string).trim(), note ?? 'Instruções editadas'));
  };
  const addToPrompt = async (agentId: string, reqId: string, title: string, text: string) => {
    const a = ws.agents.find((x) => x.id === agentId);
    if (!a) return;
    await saveAgent(agentId, { prompt: `${a.prompt.trim()}\n\n${title}: ${text}` }, `Resposta adicionada: ${title}`);
    setFocus(null);
    resolve(reqId, 'Adicionado às instruções. O agente já usa isso na próxima conversa.');
  };
  // Volta às instruções de uma versão antiga (vira uma versão nova; dá para desfazer).
  const restoreVersion = async (agentId: string, versionId: string) => {
    const a = ws.agents.find((x) => x.id === agentId);
    const v = ws.history[agentId]?.find((x) => x.id === versionId);
    if (!a || !v) return;
    const before = a.prompt;
    await saveAgent(agentId, { prompt: v.text }, `Restaurada a versão de ${fmtWhen(v.at)}`);
    say('Versão restaurada. O agente já usa este texto.', () => { saveAgent(agentId, { prompt: before }, 'Restauração desfeita').catch(() => {}); });
  };
  const connectAgent = async (id: string) => {
    if (live) { const r = await remote.connect(id); patch(id, { connection: 'connecting' }); return r as { qr?: string }; }
    await sleep(900); patch(id, { connection: 'connecting' });
    return { matrix: demoQr(`${id}-${Date.now()}`) };
  };
  const pollConnection = async (id: string) => {
    if (live) { const r = await remote.connection(id); patch(id, { connection: r.state, phone: r.phone ?? null }); return r as { state: string }; }
    return { state: ws.agents.find((x) => x.id === id)?.connection || 'close' };
  };
  const simulateScan = async (id: string) => { await sleep(900); patch(id, { connection: 'open', phone: '5511987654321' }); };
  const disconnectAgent = async (id: string) => { if (live) await remote.disconnect(id); patch(id, { connection: 'close', status: 'paused', phone: null }); };
  const setAgentStatus = async (id: string, status: Agent['status']) => {
    if (live) await remote.setStatus(id, status);
    patch(id, { status });
    say(status === 'active' ? 'Atendimento iniciado.' : 'Atendimento pausado.');
  };
  const removeAgent = async (id: string) => {
    if (live) await remote.remove(id);
    setWs((w) => { const { [id]: _t, ...tested } = w.tested; const { [id]: _h, ...history } = w.history; return { ...w, agents: w.agents.filter((a) => a.id !== id), tested, history }; });
    say('Agente removido.');
  };

  // ---------- primeiros passos, dados de exemplo ----------
  const markTested = (id: string) => setWs((w) => (w.tested[id] ? w : { ...w, tested: { ...w.tested, [id]: true } }));
  const dismissOnboarding = () => setWs((w) => ({ ...w, onboardingDismissed: true }));
  const loadSample = () => {
    if (live) return;
    const a = agents0[0]!;
    setWs((w) => ({ ...w, sample: true, agents: [...w.agents.filter((x) => x.id !== a.id), a], requests: requests0, tested: { ...w.tested, [a.id]: true }, history: { ...w.history, [a.id]: sampleHistory(a) }, onboardingDismissed: true }));
    say('Dados de exemplo carregados. Você pode limpá-los em Privacidade e dados.');
  };
  const resetWorkspace = () => setWs(EMPTY);

  if (!ready) return null;
  return (
    <Ctx.Provider value={{ ws, requests: ws.requests, agents: ws.agents, sample: ws.sample, tested: ws.tested, history: ws.history, onboardingDismissed: ws.onboardingDismissed, loaded, loadError, reload, toast, focus, setFocus, resolve, reopen, openBase, createAgent, saveAgent, addToPrompt, restoreVersion, connectAgent, pollConnection, simulateScan, disconnectAgent, setAgentStatus, removeAgent, markTested, dismissOnboarding, loadSample, resetWorkspace, say, dismiss }}>
      {children}
    </Ctx.Provider>
  );
}
