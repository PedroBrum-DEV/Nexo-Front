import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { live, remote } from '../../../lib/api';
import { useApp } from '../../../lib/store';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { copyText } from '../../../lib/clipboard';
import { fmtPhone } from '../../../lib/format';
import { groupByDay, isLive, needsLink, queryFor, range, type Appt } from '../../../lib/agenda';
import { color } from '../../../lib/theme';
import { Button, Card, Chip, Chips, Empty, ErrorState, Icon, Notice, Pill, Reveal, Segmented, Skeleton, T } from '../../../components/ui';
import { Screen } from '../../../components/Screen';

type Tab = 'next' | 'past' | 'cancelled';
type Kind = 'all' | 'reuniao' | 'atendimento';

function Row({ a, i }: { a: Appt; i: number }) {
  const { say } = useApp();
  const { wide } = useLayout();
  const meeting = a.kind === 'reuniao';
  const cancelled = a.status === 'cancelled';
  const live_ = isLive(a);
  const noLink = needsLink(a);
  const title = meeting ? a.topic || a.service || 'Reunião' : a.service || 'Atendimento';
  const who = [a.name, a.phone ? fmtPhone(a.phone) : '', a.agentName ? `agente ${a.agentName}` : ''].filter(Boolean).join(' · ');
  const copy = async () => { if (a.meetUrl && (await copyText(a.meetUrl))) say('Link copiado.'); };
  const openConv = () => a.conversationId && router.push({ pathname: '/agente/[id]/conversa/[cid]', params: { id: a.agentId, cid: a.conversationId } });
  return (
    <Reveal i={Math.min(i, 8)}>
      <Card style={{ gap: 12, opacity: cancelled ? 0.7 : 1 }}>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 20 : 10, alignItems: wide ? 'center' : 'stretch' }}>
          <View style={{ width: wide ? 110 : undefined, flexDirection: wide ? 'column' : 'row', alignItems: wide ? 'flex-start' : 'center', gap: wide ? 4 : 10 }}>
            <T v="title" num style={{ fontSize: wide ? 22 : 20 }}>{range(a).split('–')[0]}</T>
            <T v="caption" c="muted" num>até {range(a).split('–')[1]}</T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Pill tone={meeting ? 'ia' : 'mute'}>{meeting ? 'Reunião' : 'Atendimento'}</Pill>
              {cancelled && <Pill tone="red">Cancelado</Pill>}
              {!cancelled && a.confirm === 'yes' && <Pill tone="green">Confirmado</Pill>}
              {!cancelled && a.confirm === 'pending' && <Pill tone="gold">Aguardando confirmação</Pill>}
              {noLink && <Pill tone="red">Sem link</Pill>}
              {live_ && <Pill tone="green">Agora</Pill>}
            </View>
            <T v="title" style={{ fontSize: 17 }}>{title}</T>
            <T v="small" c="muted">{who}</T>
            {a.email ? <T v="small" c="muted">{a.email}</T> : null}
            {noLink ? <T v="small" c="danger">O link não pôde ser gerado. Abra a conversa e mande o link ao cliente.</T> : null}
          </View>
        </View>
        {!cancelled && (a.meetUrl || a.conversationId) ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {a.meetUrl ? <Button label="Entrar na chamada" icon="video" small full={false} onPress={() => Linking.openURL(a.meetUrl!)} hint="Abre o link da videochamada" /> : null}
            {a.meetUrl ? <Button label="Copiar link" icon="copy" variant="secondary" small full={false} onPress={copy} /> : null}
            {a.conversationId ? <Button label="Ver conversa" icon="message-circle" variant="secondary" small full={false} onPress={openConv} /> : null}
          </View>
        ) : null}
      </Card>
    </Reveal>
  );
}

export default function Agenda() {
  useTheme();
  const { wide } = useLayout();
  const [tab, setTab] = useState<Tab>('next');
  const [kind, setKind] = useState<Kind>('all');
  const [items, setItems] = useState<Appt[]>([]);
  const [noLink, setNoLink] = useState(0);
  const [loaded, setLoaded] = useState(!live);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!live) return;
    setError('');
    remote.appointments(queryFor(tab) + (kind !== 'all' ? `&kind=${kind}` : ''))
      .then((r) => { setItems(r.items as Appt[]); setNoLink(r.withoutLink); setLoaded(true); })
      .catch((e: Error) => { setError(e.message); setLoaded(true); });
  }, [tab, kind]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { setLoaded(!live); }, [tab, kind]);
  useEffect(() => { if (!live) return; const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  const groups = useMemo(() => groupByDay(tab === 'past' ? [...items].reverse() : items), [items, tab]);
  let n = 0;
  return (
    <Screen tabbed title="Agenda" width={900}>
      <T c="muted" style={{ marginTop: wide ? -12 : -4 }}>Reuniões e horários que os agentes marcaram, com dia, horário e link da chamada.</T>
      {!live ? <Empty title="A agenda mostra o que os agentes marcam de verdade" text="Ligue o app ao servidor (EXPO_PUBLIC_API_URL). Quando um cliente pedir uma reunião, o agente marca, manda o link do Meet pelo WhatsApp e ela aparece aqui." /> : (
        <>
          {tab === 'next' && noLink > 0 ? <Notice title={`${noLink} ${noLink === 1 ? 'reunião está' : 'reuniões estão'} sem link`}>Ligue o Google Agenda no servidor ou defina uma sala fixa no agente, e mande o link ao cliente pela conversa.</Notice> : null}
          <View style={wide ? { maxWidth: 460 } : undefined}>
            <Segmented value={tab} onChange={setTab} options={[['next', 'Próximos'], ['past', 'Passados'], ['cancelled', 'Cancelados']]} />
          </View>
          <Chips>{([['all', 'Todos'], ['reuniao', 'Reuniões'], ['atendimento', 'Atendimentos']] as [Kind, string][]).map(([k, t]) => <Chip key={k} label={t} on={kind === k} onPress={() => setKind(k)} />)}</Chips>
          {error ? <ErrorState text={error} onRetry={load} /> : null}
          {!loaded && <View style={{ gap: 12 }}><Skeleton h={22} w="30%" /><Skeleton h={16} w="70%" /><Skeleton h={16} w="50%" /></View>}
          {loaded && !error && !items.length && (
            <Empty title={tab === 'next' ? 'Nada marcado nos próximos 90 dias' : tab === 'past' ? 'Nada nos últimos 30 dias' : 'Nenhum cancelamento'}
              text="Quando um cliente pedir uma reunião ou um horário, o agente marca e aparece aqui." />
          )}
          {groups.map((g) => (
            <View key={g.key} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Icon name="calendar" size={16} c="muted" /><T v="label" c="muted" accessibilityRole="header">{g.label}</T>
              </View>
              {g.items.map((a) => <Row key={a.id} a={a} i={n++} />)}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}
