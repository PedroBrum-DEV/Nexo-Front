import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '../../../../../lib/store';
import { useTheme } from '../../../../../lib/ThemeContext';
import { conversations } from '../../../../../lib/data';
import { color } from '../../../../../lib/theme';
import { Button, Card, Empty, Pill, T } from '../../../../../components/ui';
import { Screen } from '../../../../../components/Screen';
import { leave } from '../../../../../lib/nav';

// Uma conversa do agente, com as ações da IA anotadas abaixo da mensagem. Somente leitura.
export default function Conversa() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { id, cid } = useLocalSearchParams<{ id: string; cid: string }>();
  const { agents } = useApp();
  const a = agents.find((x) => x.id === id);
  const c = conversations.find((x) => x.id === cid && x.agent === id);
  if (!a || !c) return <Screen back onBack={leave}><Empty title="Conversa não encontrada" text="Ela pode ter sido removida." /></Screen>;
  const first = c.name.split(' ')[0]!;
  return (
    <Screen back onBack={leave} width={720} title={c.name}>
      <Card style={{ gap: 24 }}>
      <T c="muted" style={{ marginTop: -12 }} num>WhatsApp · {c.day.toLowerCase()}, {c.msgs[0]!.t} · {c.msgs.length} {c.msgs.length === 1 ? 'mensagem' : 'mensagens'}</T>
      <View style={{ gap: 14 }}>
        {c.msgs.map((m, i) => (
          <View key={i} style={{ alignItems: m.w === 'c' ? 'flex-start' : 'flex-end', gap: 6 }} accessible accessibilityLabel={`${m.w === 'c' ? first : a.name}, ${m.t}: ${m.text}${m.note ? `. ${m.note[0]}: ${m.note[1]}` : ''}`}>
            <T v="caption" c="muted" num>{m.w === 'c' ? first : `${a.name} · IA`} · {m.t}</T>
            <View style={{ maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: m.w === 'c' ? color.subtle : color.soft }}><T>{m.text}</T></View>
            {m.note && <Pill tone={m.note[2] ? 'gold' : 'mute'}>{`${m.note[0]} · ${m.note[1]}`}</Pill>}
          </View>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <T v="small" c="muted">Somente leitura. A IA conduz a conversa sozinha: para mudar como ela responde, ajuste as instruções do agente.</T>
        <Button label="Abrir as configurações" variant="secondary" onPress={() => router.replace({ pathname: '/agente/[id]', params: { id: a.id, tab: 'config' } })} />
      </View>
      </Card>
    </Screen>
  );
}
