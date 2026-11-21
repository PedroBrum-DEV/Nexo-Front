import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useApp } from '../../../lib/store';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { KIND, conversations, type Req } from '../../../lib/data';
import { Button, Card, Chip, Chips, Divider, Empty, ErrorState, Pill, Reveal, Segmented, Skeleton, T } from '../../../components/ui';
import { Screen } from '../../../components/Screen';

function RequestRow({ r, i }: { r: Req; i: number }) {
  const { resolve, reopen, openBase } = useApp();
  const { wide } = useLayout();
  const done = r.status === 'done';
  const c = conversations.find((x) => x.id === r.conv);
  const actions = done ? <View style={{ flex: 1 }}><Button label="Reabrir" variant="secondary" small onPress={() => reopen(r.id)} /></View> : (
    <>
      <View style={{ flex: 1 }}>
        {r.kind === 'pergunta'
          ? <Button label="Responder" small onPress={() => openBase(r.id)} hint="Abre as instruções do agente para escrever a resposta" />
          : <Button label="Ver conversa" small onPress={() => c && router.push({ pathname: '/agente/[id]/conversa/[cid]', params: { id: c.agent, cid: c.id } })} />}
      </View>
      <View style={{ flex: 1 }}><Button label="Resolver" variant="secondary" small onPress={() => resolve(r.id)} /></View>
    </>
  );
  const kindPill = <Pill tone={r.kind === 'reclamacao' ? 'red' : 'gold'}>{KIND[r.kind]!}</Pill>;
  return (
    <Animated.View layout={LinearTransition.duration(350)} exiting={FadeOut.duration(250)}>
      <Reveal i={i}>
        {wide ? (
          // computador: uma linha de tabela (tipo | assunto | quando | ações)
          <>
            <Divider />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 20, paddingHorizontal: 24 }}>
              <View style={{ width: 170, gap: 6 }}>{kindPill}{r.n > 1 && <T v="caption" c="muted" num>{r.n} ocorrências</T>}</View>
              <View style={{ flex: 1, gap: 2 }}><T v="title" style={{ fontSize: 17 }}>{r.title}</T><T v="small" c="muted" numberOfLines={2}>{r.text}</T></View>
              <T v="caption" c="muted" style={{ width: 90 }}>{r.when}</T>
              <View style={{ flexDirection: 'row', gap: 8, width: 300 }}>{actions}</View>
            </View>
          </>
        ) : (
          // celular: um cartão por registro, com o essencial em ordem de leitura
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>{kindPill}{r.n > 1 && <T v="label" c="goldDeep" num>{r.n} ocorrências</T>}</View>
            <T v="title">{r.title}</T>
            <T c="muted">{r.text}</T>
            <T v="caption" c="muted">{r.when}</T>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>{actions}</View>
          </Card>
        )}
      </Reveal>
    </Animated.View>
  );
}

export default function Registros() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { requests, loaded, loadError, reload } = useApp();
  const { wide } = useLayout();
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [kind, setKind] = useState('todos');
  const open = requests.filter((r) => r.status === 'open').length;
  const shown = requests.filter((r) => r.status === tab && (kind === 'todos' || r.kind === kind));
  const controls = (
    <>
      <View style={wide ? { maxWidth: 380 } : undefined}>
        <Segmented value={tab} onChange={setTab} options={[['open', `Abertos (${open})`], ['done', `Resolvidos (${requests.length - open})`]]} />
      </View>
      <Chips>{[['todos', 'Todos'], ...Object.entries(KIND)].map(([k, t]) => <Chip key={k} label={t} on={kind === k} onPress={() => setKind(k)} />)}</Chips>
    </>
  );
  const list = (
    <View style={wide ? undefined : { gap: 12 }}>
      {!loaded && <View style={{ gap: 12, padding: wide ? 24 : 0 }}><Skeleton h={18} w="50%" /><Skeleton h={14} w="80%" /><Skeleton h={18} w="40%" /></View>}
      {shown.map((r, i) => <RequestRow key={r.id} r={r} i={i} />)}
      {loaded && !loadError && !shown.length && (
        <View style={wide ? { padding: 24 } : undefined}>
          <Empty
            title={tab === 'open' ? 'Nada para decidir' : 'Nada resolvido ainda'}
            text={tab === 'open' ? 'Quando um agente não souber responder, receber uma reclamação ou um pedido fora do combinado, o registro aparece aqui.' : 'Os registros que você resolver ficam aqui, caso precise reabrir.'}
          />
        </View>
      )}
    </View>
  );
  return (
    <Screen tabbed title="Para decidir" width={1100}>
      <T c="muted" style={{ marginTop: wide ? -12 : -4 }}>O que o agente não soube resolver sozinho.</T>
      {loadError ? <ErrorState text={loadError} onRetry={reload} /> : null}
      {wide ? (
        <Card pad={0}>
          <View style={{ padding: 20, gap: 16 }}>{controls}</View>
          {list}
        </Card>
      ) : <>{controls}{list}</>}
    </Screen>
  );
}
