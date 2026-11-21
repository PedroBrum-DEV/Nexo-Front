import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SERVICES, WEEKS, totals, weekLabel } from '../../lib/data';
import { useTheme } from '../../lib/ThemeContext';
import { leave } from '../../lib/nav';
import { useLayout } from '../../lib/layout';
import { BarList, Heat } from '../../components/charts';
import { SectionTitle, T } from '../../components/ui';
import { Screen } from '../../components/Screen';

export default function Detalhes() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { w: wp } = useLocalSearchParams<{ w?: string }>();
  const { wide } = useLayout();
  const w = Math.min(7, Math.max(0, Number(wp ?? 7) || 0));
  return (
    <Screen back onBack={leave} title="Detalhes">
      <T c="muted" style={{ marginTop: -12 }} num>Semana de {weekLabel(w)}</T>
      <View style={wide ? { flexDirection: 'row', gap: 56, alignItems: 'flex-start' } : { gap: 24 }}>
        <View style={{ flex: wide ? 1 : undefined, gap: 16, width: '100%' }}><SectionTitle>Serviços mais agendados</SectionTitle><BarList items={SERVICES} unit="%" /></View>
        <View style={{ flex: wide ? 1 : undefined, gap: 16, width: '100%' }}><SectionTitle>Quando agendam</SectionTitle><Heat week={WEEKS[w]!} /></View>
      </View>
      <View style={{ gap: 16 }}>
        <SectionTitle>Últimas 8 semanas</SectionTitle>
        <BarList items={WEEKS.map((wk, i) => [weekLabel(i), totals(wk, 7).agend] as [string, number])} />
        <T v="caption" c="muted">Agendamentos por semana. A semana atual ainda está em andamento.</T>
      </View>
    </Screen>
  );
}
