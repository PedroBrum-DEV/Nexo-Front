import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../../lib/store';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { AGENT_STATE, type Agent } from '../../../lib/data';
import areas from '../../../lib/areas.json';
import { fmtPhone } from '../../../lib/format';
import { color } from '../../../lib/theme';
import { Button, Card, Divider, Dot, Empty, ErrorState, Icon, Pill, Reveal, Skeleton, T, Tap, type Tone } from '../../../components/ui';
import { Screen } from '../../../components/Screen';

const AREAS = areas as Record<string, { label: string }>;

// Computador: grade de cartões com as ações principais à mão.
function AgentCard({ a }: { a: Agent }) {
  const { setAgentStatus, say } = useApp();
  const [label, tone] = AGENT_STATE[a.status]!;
  const on = a.connection === 'open';
  const go = () => router.push({ pathname: '/agente/[id]', params: { id: a.id } });
  return (
    <Card hover style={{ flex: 1 }}>
      <Tap onPress={go} accessibilityRole="button" accessibilityLabel={`${a.name}, ${label}`} scale={0.99} style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><T v="title" style={{ fontSize: 22 }}>{a.name}</T><Pill tone={tone as Tone}>{label}</Pill></View>
        <T c="muted" numberOfLines={1}>{[a.settings.company, AREAS[a.area]?.label].filter(Boolean).join(' · ')}</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}><Dot on={on} /><T v="small" c="muted">{on ? `WhatsApp conectado${a.phone ? ` · ${fmtPhone(a.phone)}` : ''}` : 'WhatsApp não conectado'}</T></View>
      </Tap>
      <View style={{ marginVertical: 18 }}><Divider /></View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button label="Abrir" small onPress={go} /></View>
        {on && <View style={{ flex: 1 }}><Button label={a.status === 'active' ? 'Pausar' : 'Iniciar'} variant="secondary" small onPress={() => setAgentStatus(a.id, a.status === 'active' ? 'paused' : 'active').catch((e: Error) => say(e.message))} /></View>}
        {!on && <View style={{ flex: 1 }}><Button label="Conectar" variant="secondary" small onPress={() => router.push({ pathname: '/agente/[id]', params: { id: a.id, tab: 'config' } })} /></View>}
      </View>
    </Card>
  );
}

export default function Agentes() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { agents, loaded, loadError, reload } = useApp();
  const { wide } = useLayout();
  return (
    <Screen tabbed width={1100} title="Agentes" right={agents.length > 0 ? <Button label="Novo agente" icon="plus" small full={false} onPress={() => router.push('/agente/novo')} /> : undefined}>
      <T c="muted" style={{ marginTop: wide ? -12 : -4 }}>Cada agente atende um número de WhatsApp com as instruções que você escreveu.</T>
      {loadError ? <ErrorState text={loadError} onRetry={reload} /> : null}
      {!loaded && <View style={{ gap: 16 }}><Skeleton h={20} w="40%" /><Skeleton h={14} w="70%" /><Skeleton h={20} w="50%" /><Skeleton h={14} w="60%" /></View>}
      {loaded && !loadError && agents.length === 0 && (
        <Empty title="Nenhum agente ainda" text="Um agente atende seus clientes no WhatsApp com as instruções que você escrever. Leva poucos minutos para criar o primeiro." action={<Button label="Criar agente" full={false} onPress={() => router.push('/agente/novo')} />} />
      )}
      <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' } : { gap: 16 }}>
        {agents.map((a, i) => <Reveal key={a.id} i={i} style={wide ? { flex: 1, minWidth: 320, maxWidth: 540 } : undefined}><AgentCard a={a} /></Reveal>)}
        {agents.length > 0 && (
          <Reveal i={agents.length} style={wide ? { flex: 1, minWidth: 320, maxWidth: 540 } : undefined}>
            <Tap onPress={() => router.push('/agente/novo')} accessibilityRole="button" accessibilityLabel="Criar novo agente" scale={0.98} style={{ flex: wide ? 1 : undefined, minHeight: wide ? 200 : 120, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderHover, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: color.ghost }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={22} c="deep" /></View>
              <T v="label" c="deep">Criar novo agente</T>
            </Tap>
          </Reveal>
        )}
      </View>
    </Screen>
  );
}
