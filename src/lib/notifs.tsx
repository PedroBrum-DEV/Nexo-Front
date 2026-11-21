import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { live, remote } from './api';

export type Notif = { id: string; type: string; title: string; text: string; ref: string | null; at: number; read: boolean };
type Ctx = { items: Notif[]; unread: number; loaded: boolean; error: string; refresh: () => Promise<void>; markRead: (ids?: string[]) => Promise<void> };
const NONE: Ctx = { items: [], unread: 0, loaded: true, error: '', refresh: async () => {}, markRead: async () => {} };
const C = createContext<Ctx>(NONE);
export const useNotifs = () => useContext(C);

const EVERY_MS = 45_000;

/** Avisos da conta: carrega ao abrir, a cada 45 s e ao voltar para o app; o contador de não lidos alimenta o sino e o menu. */
export function NotifProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(!live);
  const [error, setError] = useState('');
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (!live || busy.current) return;
    busy.current = true;
    try {
      const r = await remote.notifications();
      setItems(r.items as Notif[]); setUnread(r.unread); setError('');
    } catch (e) { setError((e as Error).message); }
    finally { busy.current = false; setLoaded(true); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, EVERY_MS);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [refresh]);

  // marca na tela já e confirma no servidor; se falhar, recarrega a verdade
  const markRead = useCallback(async (ids?: string[]) => {
    if (!live) return;
    setItems((cur) => cur.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.length) : 0));
    try { await remote.readNotifications(ids); } catch { refresh(); }
  }, [refresh]);

  return <C.Provider value={{ items, unread, loaded, error, refresh, markRead }}>{children}</C.Provider>;
}
