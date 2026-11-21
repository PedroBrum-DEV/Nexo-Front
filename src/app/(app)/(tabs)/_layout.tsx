import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../../lib/store';
import { useLayout } from '../../../lib/layout';
import { useTheme } from '../../../lib/ThemeContext';
import { color, TABBAR } from '../../../lib/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];
// O ícone da aba ativa dá um pequeno pulo ao ser tocado.
function TabIcon({ name, c, focused }: { name: IconName; c: string; focused: boolean }) {
  const sc = useSharedValue(1);
  useEffect(() => { if (focused) sc.set(withSequence(withTiming(1.28, { duration: 160, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 320, easing: Easing.bezier(0.16, 1, 0.3, 1) }))); }, [focused, sc]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: sc.get() }] }));
  return <Animated.View style={a}><Feather name={name} size={22} color={c} /></Animated.View>;
}
const icon = (name: IconName) => ({ color: c, focused }: { color: unknown; focused: boolean }) => <TabIcon name={name} c={c as string} focused={focused} />;

// Abas são pares, não hierarquia: sem animação ao trocar (Emil Kowalski: troca de aba acontece dezenas de vezes por sessão).
export default function TabsLayout() {
  const { requests } = useApp();
  const open = requests.filter((r) => r.status === 'open').length;
  const { bottom } = useSafeAreaInsets();
  const { wide } = useLayout();
  useTheme(); // redesenha ao trocar o tema
  return (
    <Tabs screenOptions={{
      headerShown: false, tabBarActiveTintColor: color.primary, tabBarInactiveTintColor: color.muted,
      tabBarStyle: wide ? { display: 'none' } : { backgroundColor: color.bg, borderTopColor: color.line, elevation: 0, shadowOpacity: 0, height: TABBAR + 8 + bottom, paddingTop: 6, paddingBottom: bottom + 4 },
      tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' }, sceneStyle: { backgroundColor: color.bg },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="registros" options={{ title: 'Registros', tabBarIcon: icon('list'), tabBarBadge: open > 0 ? open : undefined, tabBarBadgeStyle: { backgroundColor: color.gold, color: color.ink, fontWeight: '700' } }} />
      <Tabs.Screen name="agentes" options={{ title: 'Agentes', tabBarIcon: icon('cpu') }} />
      <Tabs.Screen name="relatorios" options={{ title: 'Relatórios', tabBarIcon: icon('bar-chart-2') }} />
      <Tabs.Screen name="conta" options={{ title: 'Conta', tabBarIcon: icon('user') }} />
    </Tabs>
  );
}
