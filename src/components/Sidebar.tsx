import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import { useNotifs } from '../lib/notifs';
import { color, radius, themed } from '../lib/theme';
import { Logo } from './Logo';
import { Icon, T, Tap } from './ui';
import UserAvatar from './UserAvatar';
import ThemeToggle from './ThemeToggle';
import { MOD_KEY, usePalette } from './CommandPalette';
import { useTheme } from '../lib/ThemeContext';

type IconName = React.ComponentProps<typeof Icon>['name'];
const ITEMS: { label: string; path: string; icon: IconName; match: (p: string) => boolean }[] = [
  { label: 'Home', path: '/', icon: 'home', match: (p) => p === '/' || p.startsWith('/detalhes') },
  { label: 'Agenda', path: '/agenda', icon: 'calendar', match: (p) => p.startsWith('/agenda') },
  { label: 'Avisos', path: '/avisos', icon: 'bell', match: (p) => p.startsWith('/avisos') },
  { label: 'Registros', path: '/registros', icon: 'list', match: (p) => p.startsWith('/registros') },
  { label: 'Agentes', path: '/agentes', icon: 'cpu', match: (p) => p.startsWith('/agente') },
  { label: 'Relatórios', path: '/relatorios', icon: 'bar-chart-2', match: (p) => p.startsWith('/relatorios') },
  { label: 'Conta', path: '/conta', icon: 'user', match: (p) => p.startsWith('/conta') || p.startsWith('/privacidade') || p.startsWith('/sessoes') },
];
const ROW = 46, GAP = 4;
const OUT = Easing.bezier(0.16, 1, 0.3, 1);

// Menu lateral do computador: fundo azul-marinho, o destaque desliza até o item ativo.
export default function Sidebar() {
  useTheme(); // redesenha ao trocar o tema
  const pathname = usePathname();
  const palette = usePalette();
  const { requests } = useApp();
  const { user, logout } = useAuth();
  const open = requests.filter((r) => r.status === 'open').length;
  const { unread } = useNotifs();
  const shown = user?.type === 'cnpj' ? user.company || user.name : user?.name || '';
  const idx = ITEMS.findIndex((it) => it.match(pathname));
  const y = useSharedValue(Math.max(idx, 0) * (ROW + GAP));
  const vis = useSharedValue(idx >= 0 ? 1 : 0);
  useEffect(() => {
    if (idx >= 0) y.set(withTiming(idx * (ROW + GAP), { duration: 520, easing: OUT }));
    vis.set(withTiming(idx >= 0 ? 1 : 0, { duration: 250 }));
  }, [idx, y, vis]);
  const hl = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }], opacity: vis.get() }));
  return (
    <View style={s.side}>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="link" accessibilityLabel="Nexo, início" style={s.brand}>
        <Logo size={34} animate inverse />
      </Pressable>
      <Pressable onPress={palette.show} accessibilityRole="search" accessibilityLabel={`Buscar. Atalho: ${MOD_KEY} K`} style={(st) => [s.search, (st as { hovered?: boolean }).hovered ? { backgroundColor: 'rgba(255,255,255,0.12)' } : null]}>
        <Icon name="search" size={18} c="onNavyMuted" />
        <T v="small" c="onNavyMuted" style={{ flex: 1 }}>Buscar…</T>
        <View style={s.kbd}><T v="caption" c="onNavyMuted" style={{ fontWeight: '700' }}>{MOD_KEY} K</T></View>
      </Pressable>
      <View style={{ gap: GAP }} accessibilityRole="navigation" accessibilityLabel="Menu principal">
        <Animated.View style={[s.hl, hl]} pointerEvents="none" importantForAccessibility="no-hide-descendants" aria-hidden><View style={s.bar} /></Animated.View>
        {ITEMS.map((it, i) => {
          const on = i === idx;
          return (
            <Pressable key={it.path} onPress={() => router.navigate(it.path as never)} accessibilityRole="link" accessibilityState={{ selected: on }} accessibilityLabel={it.label} {...({ 'aria-current': on ? 'page' : undefined } as object)}
              style={(st) => [s.item, !on && (st as { hovered?: boolean }).hovered ? { backgroundColor: 'rgba(255,255,255,0.05)' } : null]}>
              <Icon name={it.icon} size={20} c={on ? 'onNavy' : 'onNavyMuted'} />
              <T v="label" c={on ? 'onNavy' : 'onNavyMuted'} style={{ flex: 1, fontSize: 15 }}>{it.label}</T>
              {it.path === '/registros' && open > 0 && <View style={s.badge}><T v="caption" style={{ fontWeight: '800' }} num>{open}</T></View>}
              {it.path === '/avisos' && unread > 0 && <View style={s.badge} accessibilityLabel={`${unread} não lidos`}><T v="caption" style={{ fontWeight: '800' }} num>{unread > 99 ? '99+' : unread}</T></View>}
            </Pressable>
          );
        })}
      </View>
      <View style={s.acct}>
        <UserAvatar size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T v="label" c="onNavy" numberOfLines={1}>{shown}</T>
          <T v="caption" c="onNavyMuted">{user?.type === 'cnpj' ? 'Conta de empresa' : 'Conta pessoal'}</T>
        </View>
        <ThemeToggle onNavy />
        <Tap onPress={logout} accessibilityRole="button" accessibilityLabel="Sair da conta" style={s.out} scale={0.9}><Icon name="log-out" size={20} c="onNavyMuted" /></Tap>
      </View>
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  side: { width: 256, paddingHorizontal: 16, paddingVertical: 24, gap: 32, backgroundColor: color.navy },
  search: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', marginTop: -12 },
  kbd: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  brand: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
  hl: { position: 'absolute', left: 0, right: 0, top: 0, height: ROW, borderRadius: 12, backgroundColor: color.navySoft, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 3, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: color.gold },
  item: { height: ROW, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { minWidth: 22, height: 22, borderRadius: radius.pill, backgroundColor: color.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  acct: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
  av: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  out: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
}));
