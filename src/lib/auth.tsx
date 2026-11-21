import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { live, remote, setOnUnauthorized, setSessionToken } from './api';
import { shouldRefresh } from './jwt';
import { readJSON, storage } from './storage';
import { clean, docType } from './validators';
import { deviceName } from './device';
import { profileKey, sessionsKey, workspaceKey } from './keys';

// Conta e login.
//  - Com API (EXPO_PUBLIC_API_URL): POST /api/auth/register e /api/auth/login devolvem { token, user }.
//  - Demonstração (sem API): as contas ficam neste aparelho, só para testar as telas.
//    NÃO é segurança de verdade: em produção a senha é verificada no servidor.
export type User = { type: 'cpf' | 'cnpj'; document: string; name: string; company?: string; email?: string };
type Session = { token: string | null; user: User; sid?: string };
export type SessionInfo = { id: string; device: string; createdAt: string; lastSeen: string; current: boolean };
type Account = User & { birthDate: string; salt: string; hash: string };
type LocalSession = { id: string; device: string; createdAt: string; lastSeen: string };
type ResetRec = { salt: string; codeHash: string; expires: number; tries: number; token?: string };
export type RegisterInput = { type: 'cpf' | 'cnpj'; document: string; name: string; email: string; company: string; birthISO: string; password: string };
export type ResetRequest = { maskedEmail?: string; demoCode?: string };

// Foto de perfil: foto enviada (guardada reduzida, como data URI) ou um dos avatares prontos.
export type AvatarChoice = { kind: 'photo'; uri: string } | { kind: 'preset'; id: string } | null;
type Ctx = { user: User | null; ready: boolean; avatar: AvatarChoice; register: (f: RegisterInput) => Promise<void>; login: (doc: string, pw: string) => Promise<void>; logout: () => void; setAvatar: (a: AvatarChoice) => Promise<void>; changePassword: (current: string, next: string) => Promise<void>; listSessions: () => Promise<SessionInfo[]>; revokeSession: (id: string) => Promise<void>; revokeOthers: () => Promise<void>; revokeAll: () => Promise<void>; deleteAccount: (password: string) => Promise<void>; requestReset: (email: string) => Promise<ResetRequest>; verifyReset: (email: string, code: string) => Promise<string>; resetPassword: (email: string, token: string, next: string) => Promise<void> };
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

const SESSION = 'sofia.session';
const ACCOUNTS = 'sofia.accounts';
const RESETS = 'nexo.resets';
const RESET_MIN = 10; // validade do código (minutos)
const MAX_TRIES = 5;
export const maskEmail = (e: string) => { const [u = '', d = ''] = e.split('@'); return `${u.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(6, u.length - 1)))}@${d}`; };
const PROFILE = profileKey;
const hash = (password: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
const normEmail = (e: string) => e.trim().toLowerCase();
// demonstração: a conta é achada pelo e-mail (na API, é o servidor que faz isso)
const findByEmail = (accounts: Record<string, Account>, e: string) => Object.values(accounts).find((a) => a.email && normEmail(a.email) === normEmail(e));
const publicUser = (a: Account): User => ({ type: a.type, document: a.document, name: a.name, ...(a.company ? { company: a.company } : {}), ...(a.email ? { email: a.email } : {}) });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [avatar, setAvatarState] = useState<AvatarChoice>(null);

  useEffect(() => {
    readJSON<Session | null>(SESSION, null).then(async (s) => {
      setSessionToken(s?.token); setSession(s);
      if (!live && s?.sid) { const l = await readJSON<LocalSession[]>(sessionsKey(s.user.document), []); const now = new Date().toISOString(); storage.set(sessionsKey(s.user.document), JSON.stringify(l.some((x) => x.id === s.sid) ? l.map((x) => (x.id === s.sid ? { ...x, lastSeen: now } : x)) : [...l, { id: s.sid, device: deviceName(), createdAt: now, lastSeen: now }])); }
      setReady(true);
    });
  }, []);

  const doc = session?.user.document;
  useEffect(() => {
    if (!doc) { setAvatarState(null); return; }
    AsyncStorage.getItem(PROFILE(doc)).then((raw) => { try { setAvatarState(raw ? (JSON.parse(raw) as AvatarChoice) : null); } catch { setAvatarState(null); } }).catch(() => setAvatarState(null));
  }, [doc]);

  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;
  const readLocal = async (d: string) => readJSON<LocalSession[]>(sessionsKey(d), []);
  const writeLocal = (d: string, l: LocalSession[]) => storage.set(sessionsKey(d), JSON.stringify(l));

  const start = useCallback(async (s: Session) => {
    // demonstração: cada entrada neste aparelho vira uma sessão na lista (com API, quem registra é o servidor)
    const sid = s.sid ?? (live ? undefined : Crypto.randomUUID());
    const full = { ...s, ...(sid ? { sid } : {}) };
    if (!live && sid) { const now = new Date().toISOString(); const l = await readLocal(s.user.document); await writeLocal(s.user.document, [...l.filter((x) => x.id !== sid), { id: sid, device: deviceName(), createdAt: now, lastSeen: now }]); }
    setSessionToken(full.token);
    await storage.set(SESSION, JSON.stringify(full));
    setSession(full);
    router.replace('/');
  }, []);
  const logout = useCallback(() => {
    const cur = sessionRef.current;
    if (!live && cur?.sid) readLocal(cur.user.document).then((l) => writeLocal(cur.user.document, l.filter((x) => x.id !== cur.sid))).catch(() => {});
    setSessionToken(null);
    storage.del(SESSION);
    setSession(null);
    router.replace('/login');
  }, []);
  useEffect(() => { setOnUnauthorized(logout); }, [logout]);

  // Renova o token (a sessão vale 7 dias) ao abrir o app, ao voltar para ele e a cada hora, quando o atual tem mais de 1 dia.
  // Falha de rede é ignorada (tenta de novo depois); token recusado (401) já derruba para o login em `call`.
  const refreshing = useRef(false);
  const refreshToken = useCallback(async () => {
    const cur = sessionRef.current;
    if (!live || !cur?.token || refreshing.current || !shouldRefresh(cur.token)) return;
    refreshing.current = true;
    try {
      const r = await remote.refresh();
      if (sessionRef.current?.sid === cur.sid && r.token) {
        const next = { ...cur, token: r.token };
        setSessionToken(next.token); await storage.set(SESSION, JSON.stringify(next)); setSession(next);
      }
    } catch { /* sem rede agora: fica para a próxima */ } finally { refreshing.current = false; }
  }, []);
  useEffect(() => {
    if (!live || !ready || !session?.token) return;
    refreshToken();
    const t = setInterval(refreshToken, 60 * 60 * 1000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refreshToken(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [ready, session?.token, refreshToken]);

  const register = async (f: RegisterInput) => {
    const document = clean(f.document);
    const body = { device: deviceName(), type: f.type, document, name: f.name.trim(), email: f.email.trim().toLowerCase(), birthDate: f.birthISO, password: f.password, ...(f.type === 'cnpj' ? { company: f.company.trim() } : {}) };
    if (live) return start(await remote.register(body));
    const accounts = await readJSON<Record<string, Account>>(ACCOUNTS, {});
    if (accounts[document]) throw new Error(`Já existe uma conta com este ${f.type === 'cpf' ? 'CPF' : 'CNPJ'}. Entre com a sua senha.`);
    if (findByEmail(accounts, body.email)) throw new Error('Já existe uma conta com este e-mail. Entre ou recupere a senha.');
    const salt = Crypto.randomUUID();
    const acc: Account = { type: f.type, document, name: body.name, email: body.email, company: (body as { company?: string }).company, birthDate: f.birthISO, salt, hash: await hash(f.password, salt) };
    await storage.set(ACCOUNTS, JSON.stringify({ ...accounts, [document]: acc }));
    await start({ token: null, user: publicUser(acc) });
  };

  const login = async (rawDoc: string, password: string) => {
    const document = clean(rawDoc);
    if (live) return start(await remote.login({ document, type: docType(document), password, device: deviceName() }));
    const acc = (await readJSON<Record<string, Account>>(ACCOUNTS, {}))[document];
    if (!acc || (await hash(password, acc.salt)) !== acc.hash) throw new Error('CPF/CNPJ ou senha incorretos.');
    await start({ token: null, user: publicUser(acc) });
  };

  const setAvatar = async (a: AvatarChoice) => {
    if (!doc) return;
    setAvatarState(a);
    await (a ? AsyncStorage.setItem(PROFILE(doc), JSON.stringify(a)) : AsyncStorage.removeItem(PROFILE(doc)));
  };

  // Troca de senha: na demonstração confere a senha atual no aparelho; com API, PUT /api/auth/password.
  const changePassword = async (current: string, next: string) => {
    if (live) { await remote.changePassword({ currentPassword: current, newPassword: next }); return; }
    if (!doc) throw new Error('Entre na conta para trocar a senha.');
    const accounts = await readJSON<Record<string, Account>>(ACCOUNTS, {});
    const acc = accounts[doc];
    if (!acc || (await hash(current, acc.salt)) !== acc.hash) throw new Error('A senha atual não confere.');
    const salt = Crypto.randomUUID();
    await storage.set(ACCOUNTS, JSON.stringify({ ...accounts, [doc]: { ...acc, salt, hash: await hash(next, salt) } }));
  };

  // ---- Sessões ativas: com API, o servidor; na demonstração, só este aparelho ----
  const listSessions = async (): Promise<SessionInfo[]> => {
    if (live) return (await remote.sessions()) as SessionInfo[];
    const cur = sessionRef.current; if (!cur) return [];
    const l = await readLocal(cur.user.document);
    return l.map((x) => ({ ...x, current: x.id === cur.sid })).sort((a, b) => Number(b.current) - Number(a.current) || b.lastSeen.localeCompare(a.lastSeen));
  };
  const revokeSession = async (id: string) => {
    const cur = sessionRef.current; if (!cur) return;
    if (live) await remote.revokeSession(id); else await writeLocal(cur.user.document, (await readLocal(cur.user.document)).filter((x) => x.id !== id));
    if (id === cur.sid) logout();
  };
  const revokeOthers = async () => {
    const cur = sessionRef.current; if (!cur) return;
    if (live) await remote.revokeOthers(); else await writeLocal(cur.user.document, (await readLocal(cur.user.document)).filter((x) => x.id === cur.sid));
  };
  const revokeAll = async () => {
    const cur = sessionRef.current; if (!cur) return;
    if (live) await remote.revokeAll(); else await writeLocal(cur.user.document, []);
    logout();
  };
  // Excluir a conta: confere a senha e apaga a conta e tudo que ela guardou (com API, o servidor também apaga os dados dele)
  const deleteAccount = async (password: string) => {
    const cur = sessionRef.current; if (!cur) return;
    const d = cur.user.document;
    if (live) await remote.deleteAccount({ password });
    else {
      const accounts = await readJSON<Record<string, Account>>(ACCOUNTS, {});
      const acc = accounts[d];
      if (!acc || (await hash(password, acc.salt)) !== acc.hash) throw new Error('A senha não confere.');
      const { [d]: _gone, ...rest } = accounts;
      await storage.set(ACCOUNTS, JSON.stringify(rest));
      const resets = await readJSON<Record<string, ResetRec>>(RESETS, {}); delete resets[d]; await storage.set(RESETS, JSON.stringify(resets));
    }
    await Promise.all([AsyncStorage.removeItem(PROFILE(d)), AsyncStorage.removeItem(workspaceKey(d)), storage.del(sessionsKey(d))]);
    setSessionToken(null); await storage.del(SESSION); setSession(null);
    router.replace({ pathname: '/login', params: { msg: 'excluida' } });
  };

  // ---- Esqueci a senha: e-mail -> código por e-mail -> nova senha ----
  // Com API: POST /api/auth/forgot, /forgot/verify e /reset (o servidor acha a conta pelo e-mail e envia o código).
  // Demonstração: não há envio real; o código é gerado no aparelho e mostrado na tela.
  const requestReset = async (rawEmail: string): Promise<ResetRequest> => {
    const email = normEmail(rawEmail);
    if (live) { await remote.forgot({ email }); return { maskedEmail: maskEmail(email) }; }
    const acc = findByEmail(await readJSON<Record<string, Account>>(ACCOUNTS, {}), email);
    if (!acc) return { maskedEmail: maskEmail(email) }; // resposta igual à de uma conta real (não revela se o e-mail existe)
    const n = new DataView(Crypto.getRandomBytes(4).buffer).getUint32(0);
    const code = String(100000 + (n % 900000));
    const salt = Crypto.randomUUID();
    const resets = await readJSON<Record<string, ResetRec>>(RESETS, {});
    resets[acc.document] = { salt, codeHash: await hash(code, salt), expires: Date.now() + RESET_MIN * 60000, tries: 0 };
    await storage.set(RESETS, JSON.stringify(resets));
    return { maskedEmail: maskEmail(email), demoCode: code };
  };
  const verifyReset = async (rawEmail: string, code: string): Promise<string> => {
    const email = normEmail(rawEmail);
    if (live) { const r = await remote.verifyReset({ email, code }); return r.resetToken as string; }
    const document = findByEmail(await readJSON<Record<string, Account>>(ACCOUNTS, {}), email)?.document;
    const resets = await readJSON<Record<string, ResetRec>>(RESETS, {});
    const rec = document ? resets[document] : undefined;
    if (!rec) throw new Error('Código inválido ou expirado. Peça um novo.');
    if (Date.now() > rec.expires) throw new Error('O código expirou. Peça um novo.');
    if (rec.tries >= MAX_TRIES) throw new Error('Muitas tentativas. Peça um novo código.');
    if ((await hash(code, rec.salt)) !== rec.codeHash) {
      rec.tries += 1; await storage.set(RESETS, JSON.stringify(resets));
      const left = MAX_TRIES - rec.tries;
      throw new Error(left > 0 ? `Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.` : 'Muitas tentativas. Peça um novo código.');
    }
    rec.token = Crypto.randomUUID(); rec.expires = Date.now() + RESET_MIN * 60000;
    await storage.set(RESETS, JSON.stringify(resets));
    return rec.token;
  };
  const resetPassword = async (rawEmail: string, token: string, next: string): Promise<void> => {
    if (live) { await remote.reset({ resetToken: token, newPassword: next }); return; }
    const accounts = await readJSON<Record<string, Account>>(ACCOUNTS, {});
    const acc = findByEmail(accounts, rawEmail);
    const resets = await readJSON<Record<string, ResetRec>>(RESETS, {});
    const rec = acc ? resets[acc.document] : undefined;
    if (!acc || !rec || rec.token !== token || Date.now() > rec.expires) throw new Error('Esta etapa expirou. Comece de novo.');
    const salt = Crypto.randomUUID();
    await storage.set(ACCOUNTS, JSON.stringify({ ...accounts, [acc.document]: { ...acc, salt, hash: await hash(next, salt) } }));
    delete resets[acc.document]; await storage.set(RESETS, JSON.stringify(resets)); // o código vale uma vez só
  };

  return <AuthCtx.Provider value={{ user: session?.user ?? null, ready, avatar, register, login, logout, setAvatar, changePassword, listSessions, revokeSession, revokeOthers, revokeAll, deleteAccount, requestReset, verifyReset, resetPassword }}>{children}</AuthCtx.Provider>;
}
