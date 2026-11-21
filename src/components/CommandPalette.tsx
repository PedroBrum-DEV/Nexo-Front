import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { live } from '../lib/api';
import { conversations, KIND } from '../lib/data';
import { norm } from '../lib/format';
import { useLayout } from '../lib/layout';
import { useApp } from '../lib/store';
import { color, radius } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { Icon, T, Tap, haptic } from './ui';

type IconName = React.ComponentProps<typeof Icon>['name'];
type Item = { id: string; group: string; label: string; hint?: string; icon: IconName; run: () => void; keys?: string };
type Ctx = { show: () => void; hide: () => void; open: boolean };
const PaletteCtx = createContext<Ctx>({ show: () => {}, hide: () => {}, open: false });
export const usePalette = () => useContext(PaletteCtx);
const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const MOD_KEY = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || '') ? '⌘' : 'Ctrl';

// Busca global (Ctrl+K): páginas, agentes, conversas, registros e ações. No celular abre pelo ícone de lupa.
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { agents, requests, sample, loadSample } = useApp();
  const { logout } = useAuth();
  const { scheme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  const items = useMemo<Item[]>(() => {
    const go = (path: string) => () => router.navigate(path as never);
    const list: Item[] = [
      { id: 'p-home', group: 'Ir para', label: 'Início', icon: 'home', run: go('/'), keys: 'home resumo' },
      { id: 'p-agenda', group: 'Ir para', label: 'Agenda', hint: 'Reuniões e horários marcados', icon: 'calendar', run: go('/agenda'), keys: 'reunioes meet horarios calendario' },
      { id: 'p-avisos', group: 'Ir para', label: 'Avisos', hint: 'Central de notificações', icon: 'bell', run: go('/avisos'), keys: 'notificacoes alertas' },
      { id: 'p-reg', group: 'Ir para', label: 'Registros', hint: 'O que precisa de decisão', icon: 'list', run: go('/registros'), keys: 'decidir pendencias' },
      { id: 'p-ag', group: 'Ir para', label: 'Agentes', icon: 'cpu', run: go('/agentes') },
      { id: 'p-rel', group: 'Ir para', label: 'Relatórios', hint: 'Exportar CSV e PDF', icon: 'bar-chart-2', run: go('/relatorios'), keys: 'exportar csv pdf numeros' },
      { id: 'p-conta', group: 'Ir para', label: 'Conta', hint: 'Foto, senha e aparência', icon: 'user', run: go('/conta'), keys: 'perfil senha foto avatar tema' },
      { id: 'p-priv', group: 'Ir para', label: 'Privacidade e dados', hint: 'Baixar meus dados, excluir conta', icon: 'shield', run: go('/privacidade'), keys: 'lgpd exportar excluir apagar' },
      { id: 'p-sess', group: 'Ir para', label: 'Sessões ativas', hint: 'Aparelhos conectados', icon: 'smartphone', run: go('/sessoes'), keys: 'aparelhos dispositivos sair' },
      { id: 'a-new', group: 'Ações', label: 'Criar novo agente', icon: 'plus', run: () => router.push('/agente/novo'), keys: 'novo adicionar modelo' },
      { id: 'a-theme', group: 'Ações', label: scheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro', icon: scheme === 'dark' ? 'sun' : 'moon', run: toggle, keys: 'aparencia modo escuro claro' },
      ...(!live && !sample ? [{ id: 'a-sample', group: 'Ações', label: 'Carregar dados de exemplo', icon: 'download' as IconName, run: loadSample, keys: 'demonstracao' }] : []),
      { id: 'a-out', group: 'Ações', label: 'Sair da conta', icon: 'log-out', run: logout },
    ];
    agents.forEach((a) => {
      list.push({ id: `ag-${a.id}`, group: 'Agentes', label: a.name, hint: [a.settings.company, 'conversas'].filter(Boolean).join(' · '), icon: 'cpu', run: () => router.navigate({ pathname: '/agente/[id]', params: { id: a.id } } as never) });
      list.push({ id: `ac-${a.id}`, group: 'Agentes', label: `Configurações de ${a.name}`, hint: 'Instruções, WhatsApp e histórico de versões', icon: 'settings', run: () => router.navigate({ pathname: '/agente/[id]', params: { id: a.id, tab: 'config' } } as never), keys: 'instrucoes historico versoes whatsapp conectar teste' });
    });
    conversations.filter((c) => agents.some((a) => a.id === c.agent)).forEach((c) => list.push({ id: `c-${c.id}`, group: 'Conversas', label: c.name, hint: c.last, icon: 'message-circle', run: () => router.navigate({ pathname: '/agente/[id]/conversa/[cid]', params: { id: c.agent, cid: c.id } } as never) }));
    requests.filter((r) => r.status === 'open').forEach((r) => list.push({ id: `r-${r.id}`, group: 'Registros', label: r.title, hint: `${KIND[r.kind]} · ${r.text}`, icon: 'alert-circle', run: go('/registros') }));
    return list;
  }, [agents, requests, sample, scheme, toggle, logout, loadSample]);

  // atalhos de teclado (computador): Ctrl/⌘ + K abre a busca; "g" + letra navega; "n" cria agente; "t" troca o tema
  const chord = useRef(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); setOpen((v) => !v); return; }
      const el = e.target as HTMLElement | null;
      if (el && (/^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k === '/') { e.preventDefault(); setOpen(true); return; }
      if (Date.now() - chord.current < 1200) {
        chord.current = 0;
        const map: Record<string, string> = { h: '/', g: '/agenda', v: '/avisos', r: '/registros', a: '/agentes', l: '/relatorios', c: '/conta', p: '/privacidade', s: '/sessoes' };
        if (map[k]) { e.preventDefault(); router.navigate(map[k] as never); }
        return;
      }
      if (k === 'g') { chord.current = Date.now(); return; }
      if (k === 'n') { router.push('/agente/novo'); return; }
      if (k === 't') toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return (
    <PaletteCtx.Provider value={{ show, hide, open }}>
      {children}
      {open && <Palette items={items} onClose={hide} />}
    </PaletteCtx.Provider>
  );
}

function Palette({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const reduced = useReducedMotion();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const ys = useRef<number[]>([]); // posição de cada resultado, para manter o selecionado à vista
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { if (!reduced) p.set(withTiming(1, { duration: 240, easing: OUT })); }, [reduced, p]);
  const back = useAnimatedStyle(() => ({ opacity: p.get() }));
  const panel = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * -14 }, { scale: 0.98 + 0.02 * p.get() }] }));

  const results = useMemo(() => {
    const toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return items.filter((i) => i.group === 'Ir para' || i.group === 'Ações' || i.id.startsWith('ag-')).slice(0, 14);
    return items.map((i) => {
      const lab = norm(i.label), all = `${lab} ${norm(i.hint ?? '')} ${norm(i.keys ?? '')} ${norm(i.group)}`;
      if (!toks.every((t) => all.includes(t))) return null;
      return { i, s: (toks.some((t) => lab.startsWith(t)) ? 3 : 0) + (toks.every((t) => lab.includes(t)) ? 2 : 0) + (i.group === 'Ir para' ? 1 : 0) };
    }).filter((x): x is { i: Item; s: number } => !!x).sort((a, b) => b.s - a.s).slice(0, 20).map((x) => x.i);
  }, [q, items]);
  const idx = Math.min(sel, Math.max(results.length - 1, 0));
  useEffect(() => { const y = ys.current[idx]; if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 150), animated: true }); }, [idx]);
  const choose = (it?: Item) => { if (!it) return; haptic.select(); onClose(); setTimeout(it.run, 30); };

  const key = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const k = e.nativeEvent.key;
    if (k === 'ArrowDown') { e.preventDefault?.(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (k === 'ArrowUp') { e.preventDefault?.(); setSel((s) => Math.max(s - 1, 0)); }
    else if (k === 'Escape') onClose();
  };
  let lastGroup = '';
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal pointerEvents="box-none" role="dialog" accessibilityLabel="Busca">
      <Animated.View style={[StyleSheet.absoluteFill, back]}><Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,14,21,0.55)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar busca" /></Animated.View>
      <View pointerEvents="box-none" style={{ alignItems: 'center', paddingTop: wide ? 96 : insets.top + 12, paddingHorizontal: 16 }}>
        <Animated.View style={[{ width: '100%', maxWidth: 640, maxHeight: '86%', backgroundColor: color.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 12 }, panel]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, minHeight: 56, borderBottomWidth: 1, borderBottomColor: color.line }}>
            <Icon name="search" size={20} c="muted" />
            <TextInput autoFocus value={q} onChangeText={(v) => { setQ(v); setSel(0); }} onKeyPress={key} onSubmitEditing={() => choose(results[idx])} placeholder="Buscar agente, conversa, registro ou ação…" placeholderTextColor={color.placeholder}
              accessibilityLabel="Buscar" returnKeyType="go" autoCorrect={false} autoCapitalize="none" selectionColor={color.primary}
              style={[{ flex: 1, minHeight: 52, fontSize: 16, color: color.ink, fontWeight: '500' }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]} />
            <Tap onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" scale={0.92} style={{ minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{wide ? <T v="caption" c="muted" style={{ fontWeight: '700' }}>Esc</T> : <Icon name="x" size={20} c="muted" />}</Tap>
          </View>
          <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }} contentContainerStyle={{ paddingVertical: 6 }} accessibilityRole="list">
            <T v="caption" c="muted" style={{ position: 'absolute', opacity: 0, height: 0 }} accessibilityLiveRegion="polite">{results.length} {results.length === 1 ? 'resultado' : 'resultados'}</T>
            {results.length === 0 && <View style={{ padding: 24, gap: 4 }}><T v="label">Nada encontrado</T><T v="small" c="muted">Tente outra palavra, como o nome de um agente ou de um cliente.</T></View>}
            {results.map((it, i) => {
              const head = it.group !== lastGroup; lastGroup = it.group; const on = i === idx;
              return (
                <View key={it.id} onLayout={(e) => { ys.current[i] = e.nativeEvent.layout.y; }}>
                  {head && <T v="caption" c="muted" style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>{it.group}</T>}
                  <Pressable onPress={() => choose(it)} onHoverIn={() => setSel(i)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${it.label}${it.hint ? `. ${it.hint}` : ''}. ${it.group}`}
                    style={{ marginHorizontal: 8, minHeight: 48, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: on ? color.soft : 'transparent' }}>
                    <Icon name={it.icon} size={18} c={on ? 'deep' : 'muted'} />
                    <View style={{ flex: 1 }}><T v="label" c={on ? 'deep' : 'ink'} numberOfLines={1} style={{ fontSize: 15 }}>{it.label}</T>{it.hint ? <T v="caption" c="muted" numberOfLines={1}>{it.hint}</T> : null}</View>
                    {on && wide && <T v="caption" c="muted">Enter</T>}
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
          {wide && <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line, backgroundColor: color.subtle, flexWrap: 'wrap' }}>
            <T v="caption" c="muted">↑↓ navegar</T><T v="caption" c="muted">Enter abrir</T><T v="caption" c="muted">Esc fechar</T><T v="caption" c="muted">g + h/g/v/r/a/l/c: ir para · n: novo agente · t: tema</T>
          </View>}
        </Animated.View>
      </View>
    </View>
  );
}
