import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { live } from '../lib/api';
import { OUT, conversations, type Agent } from '../lib/data';
import { norm } from '../lib/format';
import { Avatar, Card, Chip, Reveal, Chips, Divider, Empty, Notice, Pill, T, Tap, TextField, LinkButton, type Tone } from './ui';

const FILTERS = [['todas', 'Todas'], ['agendou', 'Agendaram'], ['registro', 'Registraram'], ['andamento', 'Em andamento'], ['resolvida', 'Resolvidas']];

export default function AgentConversas({ agent, onConnect }: { agent: Agent; onConnect: () => void }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState('todas');
  const all = useMemo(() => (live ? [] : conversations.filter((c) => c.agent === agent.id)), [agent.id]);
  const list = all.filter((c) => (f === 'todas' || c.out === f) && norm(`${c.name} ${c.last}`).includes(norm(q)));
  const groups = ['Hoje', 'Ontem'].map((day) => [day, list.filter((c) => c.day === day)] as const).filter(([, l]) => l.length);

  return (
    <Card style={{ gap: 20 }}>
      {agent.connection !== 'open' && <Notice title="WhatsApp não conectado"><T v="small" c="goldDeep">Este agente ainda não recebe mensagens.</T><LinkButton label="Conectar o WhatsApp" onPress={onConnect} c="goldDeep" /></Notice>}
      {live && <T v="small" c="muted">A lista de conversas ligada à API ainda não existe: por enquanto, só a demonstração mostra conversas.</T>}
      {all.length > 0 && (
        <>
          <TextField label="Buscar" value={q} onChangeText={setQ} placeholder="Nome ou assunto…" autoCorrect={false} returnKeyType="search" />
          <Chips>{FILTERS.map(([k, t]) => <Chip key={k} label={t!} on={f === k} onPress={() => setF(k!)} />)}</Chips>
        </>
      )}
      {groups.map(([day, l]) => (
        <View key={day}>
          <T v="label" c="muted" style={{ marginBottom: 4 }}>{day}</T>
          <Divider />
          {l.map((c, idx) => (
            <Reveal key={c.id} i={idx}>
              <Tap onPress={() => router.push({ pathname: '/agente/[id]/conversa/[cid]', params: { id: agent.id, cid: c.id } })} accessibilityRole="button" accessibilityLabel={`${c.name}, ${OUT[c.out]![0]}, ${c.time}. ${c.last}`} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                <Avatar name={c.name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><T v="label" numberOfLines={1} style={{ flex: 1 }}>{c.name}</T><T v="caption" c="muted" num>{c.time}</T></View>
                  <T v="small" c="muted" numberOfLines={1}>{c.last}</T>
                  <View style={{ marginTop: 4 }}><Pill tone={OUT[c.out]![1] as Tone}>{OUT[c.out]![0]}</Pill></View>
                </View>
              </Tap>
              <Divider />
            </Reveal>
          ))}
        </View>
      ))}
      {all.length > 0 && !list.length && <T c="muted">Nenhuma conversa com esse filtro.</T>}
      {!all.length && !live && <Empty title="Ainda sem conversas" text="Quando o agente começar a atender, as conversas aparecem aqui." />}
    </Card>
  );
}
