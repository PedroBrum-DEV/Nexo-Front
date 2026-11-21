import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { live, remote } from '../../lib/api';
import { useApp } from '../../lib/store';
import { useNotifs, type Notif } from '../../lib/notifs';
import { useTheme } from '../../lib/ThemeContext';
import { color } from '../../lib/theme';
import { leave } from '../../lib/nav';
import { Button, Card, Divider, Empty, ErrorState, Icon, Reveal, Segmented, Skeleton, T, Tap } from '../../components/ui';
import { Screen } from '../../components/Screen';

type IconName = React.ComponentProps<typeof Icon>['name'];
const ICON: Record<string, IconName> = { appointment: 'calendar', lead: 'user-plus', request: 'alert-circle', handoff: 'message-circle', connection: 'wifi-off' };

function ago(ms: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - ms) / 60_000));
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function Avisos() {
  useTheme();
  const { say } = useApp();
  const { items, unread, loaded, error, refresh, markRead } = useNotifs();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const shown = tab === 'unread' ? items.filter((n) => !n.read) : items;

  // abre o assunto do aviso; se não achar, ao menos marca como lido
  const open = async (n: Notif) => {
    if (!n.read) markRead([n.id]);
    try {
      if (n.type === 'appointment') router.navigate('/agenda');
      else if (n.type === 'connection' && n.ref) router.navigate({ pathname: '/agente/[id]', params: { id: n.ref } } as never);
      else if (n.ref && ['lead', 'request', 'handoff'].includes(n.type)) {
        const c = await remote.conversation(n.ref);
        router.push({ pathname: '/agente/[id]/conversa/[cid]', params: { id: c.agentId, cid: n.ref } });
      } else router.navigate('/registros');
    } catch { say('Não consegui abrir esse assunto. Ele pode ter sido apagado.'); }
  };

  return (
    <Screen back onBack={leave} title="Avisos" width={760}
      right={unread > 0 ? <Button label="Marcar todos como lidos" variant="secondary" small full={false} onPress={() => markRead()} /> : undefined}>
      <T c="muted" style={{ marginTop: -4 }}>{unread > 0 ? `${unread} ${unread === 1 ? 'aviso novo' : 'avisos novos'}.` : 'Tudo em dia.'}</T>
      {!live ? <Empty title="Os avisos chegam com o servidor ligado" text="Em demonstração não há avisos. Com o app ligado à API, cada reunião marcada, lead quente e cliente esperando atendente aparece aqui." /> : (
        <>
          <View style={{ maxWidth: 360 }}><Segmented value={tab} onChange={setTab} options={[['all', 'Todos'], ['unread', `Não lidos (${unread})`]]} /></View>
          {error && !items.length ? <ErrorState text={error} onRetry={refresh} /> : null}
          {!loaded && <View style={{ gap: 12 }}><Skeleton h={18} w="50%" /><Skeleton h={14} w="80%" /><Skeleton h={18} w="40%" /></View>}
          {loaded && !error && !shown.length && <Empty title={tab === 'unread' ? 'Nada novo por aqui' : 'Nenhum aviso ainda'} text="Reuniões e horários marcados, leads quentes, registros para a equipe e quedas do WhatsApp aparecem aqui." />}
          {shown.length > 0 && (
            <Card pad={0}>
              {shown.map((n, i) => (
                <Reveal key={n.id} i={Math.min(i, 8)}>
                  {i > 0 && <Divider />}
                  <Tap accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Não lido. '}${n.title}. ${n.text}`} onPress={() => open(n)} scale={0.99} style={{ flexDirection: 'row', gap: 14, padding: 18, alignItems: 'flex-start', backgroundColor: n.read ? undefined : color.soft }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: n.read ? color.subtle : color.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={ICON[n.type] ?? 'bell'} size={18} c={n.read ? 'muted' : 'primary'} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T v="label" style={{ flex: 1, fontWeight: n.read ? '500' : '700' }} numberOfLines={1}>{n.title}</T>
                        <T v="caption" c="muted">{ago(n.at)}</T>
                        {!n.read && <View accessibilityElementsHidden style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color.primary }} />}
                      </View>
                      <T v="small" c="muted" numberOfLines={3}>{n.text}</T>
                    </View>
                  </Tap>
                </Reveal>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
