import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../../../lib/store';
import { useTheme } from '../../../../lib/ThemeContext';
import { leave } from '../../../../lib/nav';
import { AGENT_STATE } from '../../../../lib/data';
import areas from '../../../../lib/areas.json';
import AgentConfig from '../../../../components/AgentConfig';
import AgentConversas from '../../../../components/AgentConversas';
import { Button, Empty, Pill, Segmented, Skeleton, T, type Tone } from '../../../../components/ui';
import { Screen } from '../../../../components/Screen';

const AREAS = areas as Record<string, { label: string }>;

export default function AgentScreen() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { agents, loaded, setAgentStatus, say } = useApp();
  const [tab, setTab] = useState<'conversas' | 'config'>(tabParam === 'config' ? 'config' : 'conversas');
  const a = agents.find((x) => x.id === id);
  if (!a) {
    return <Screen back onBack={leave}>{loaded ? <Empty title="Agente não encontrado" text="Ele pode ter sido removido." action={<Button label="Voltar aos agentes" full={false} onPress={() => router.replace('/agentes')} />} /> : <Skeleton h={28} w="50%" />}</Screen>;
  }
  const [label, tone] = AGENT_STATE[a.status]!;
  const open = a.connection === 'open';
  return (
    <Screen back onBack={leave} width={1100} title={a.name} right={open ? <Button label={a.status === 'active' ? 'Pausar' : 'Iniciar'} variant={a.status === 'active' ? 'secondary' : 'primary'} small full={false} onPress={() => setAgentStatus(a.id, a.status === 'active' ? 'paused' : 'active').catch((e: Error) => say(e.message))} hint={a.status === 'active' ? 'Pausa o atendimento' : 'Inicia o atendimento'} /> : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -12, flexWrap: 'wrap' }}>
        <T c="muted">{a.settings.company}</T><Pill>{AREAS[a.area]?.label ?? a.area}</Pill><Pill tone={tone as Tone}>{label}</Pill>
      </View>
      <View style={{ maxWidth: 380 }}><Segmented value={tab} onChange={setTab} options={[['conversas', 'Conversas'], ['config', 'Configurações']]} /></View>
      {tab === 'conversas' ? <AgentConversas agent={a} onConnect={() => setTab('config')} /> : <AgentConfig agent={a} />}
    </Screen>
  );
}
