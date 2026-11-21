import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth, type SessionInfo } from '../../lib/auth';
import { live } from '../../lib/api';
import { isMobileDevice } from '../../lib/device';
import { leave } from '../../lib/nav';
import { useApp } from '../../lib/store';
import { useTheme } from '../../lib/ThemeContext';
import { color } from '../../lib/theme';
import { Screen } from '../../components/Screen';
import { Button, Card, Divider, ErrorText, haptic, Icon, Pill, Reveal, SectionTitle, Skeleton, T } from '../../components/ui';

type Row = SessionInfo & { example?: boolean };
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return 'agora mesmo';
  if (m < 60) return `há ${m} min`;
  if (m < 60 * 24) return `há ${Math.round(m / 60)} h`;
  const d = Math.round(m / 1440);
  return d === 1 ? 'ontem' : `há ${d} dias`;
};
const day = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const examples = (): Row[] => {
  const now = Date.now(), d = 86400000;
  return [
    { id: 'ex-1', device: 'Chrome no Windows', createdAt: new Date(now - 3 * d).toISOString(), lastSeen: new Date(now - 2 * 3600000).toISOString(), current: false, example: true },
    { id: 'ex-2', device: 'iPhone 15 · app', createdAt: new Date(now - 9 * d).toISOString(), lastSeen: new Date(now - d).toISOString(), current: false, example: true },
  ];
};

export default function Sessoes() {
  useTheme();
  const { listSessions, revokeSession, revokeOthers, revokeAll } = useAuth();
  const { sample, say } = useApp();
  const [list, setList] = useState<Row[] | null>(null);
  const [fake, setFake] = useState<Row[]>(() => (sample && !live ? examples() : []));
  const [confirm, setConfirm] = useState<'others' | 'all' | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { listSessions().then((l) => { setList(l); setErr(''); }).catch((e: Error) => { setErr(e.message); setList([]); }); }, [listSessions]);
  useEffect(load, [load]);

  const rows: Row[] = [...(list ?? []), ...fake];
  const others = rows.filter((r) => !r.current);
  const run = async (fn: () => Promise<void>, ok: string) => { setBusy(true); setErr(''); try { await fn(); haptic.success(); say(ok); load(); } catch (e) { haptic.error(); setErr((e as Error).message); } setBusy(false); setConfirm(null); };

  const end = (r: Row) => r.example ? (setFake((f) => f.filter((x) => x.id !== r.id)), say('Sessão de exemplo encerrada.')) : run(() => revokeSession(r.id), 'Sessão encerrada.');
  const endOthers = () => run(async () => { await revokeOthers(); setFake([]); }, 'Os outros aparelhos foram desconectados.');

  return (
    <Screen back onBack={leave} title="Sessões ativas" width={760}>
      <T c="muted" style={{ marginTop: -4 }}>Os aparelhos em que sua conta está aberta. Se perder um aparelho ou não reconhecer algum, encerre a sessão dele e troque a senha.</T>
      <ErrorText>{err}</ErrorText>

      <Reveal i={0}>
        <Card pad={0}>
          {list === null ? <View style={{ padding: 20, gap: 14 }}><Skeleton h={18} w="50%" /><Skeleton h={14} w="70%" /></View> : rows.map((r, i) => (
            <View key={r.id}>
              {i > 0 && <Divider />}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }} accessible accessibilityLabel={`${r.device}${r.current ? ', este aparelho' : ''}. Último acesso ${ago(r.lastSeen)}.`}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: r.current ? color.soft : color.subtle, alignItems: 'center', justifyContent: 'center' }}><Icon name={isMobileDevice(r.device) ? 'smartphone' : 'monitor'} size={22} c={r.current ? 'deep' : 'muted'} /></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><T v="label" style={{ fontSize: 15 }}>{r.device}</T>{r.current && <Pill tone="green">Este aparelho</Pill>}{r.example && <Pill tone="mute">Exemplo</Pill>}</View>
                  <T v="small" c="muted">Último acesso {ago(r.lastSeen)} · entrou em {day(r.createdAt)}</T>
                </View>
                {!r.current && <Button label="Encerrar" variant="secondary" small full={false} disabled={busy} onPress={() => end(r)} hint={`Desconecta ${r.device}`} />}
              </View>
            </View>
          ))}
          {list !== null && rows.length === 0 && <View style={{ padding: 20 }}><T c="muted">Nenhuma sessão encontrada.</T></View>}
        </Card>
      </Reveal>

      {!live && <T v="small" c="muted">Modo demonstração: só este aparelho é real. As sessões marcadas “Exemplo” aparecem junto com os dados de exemplo para você ver como a lista funciona.</T>}

      <Reveal i={1}>
        <Card style={{ gap: 14 }}>
          <SectionTitle>Sair em vários aparelhos</SectionTitle>
          {confirm === 'others'
            ? <View style={{ gap: 8 }}><T c="muted">Isso desconecta {others.length} {others.length === 1 ? 'aparelho' : 'aparelhos'}. Este continua conectado.</T><Button label="Sim, desconectar os outros" loading={busy} onPress={endOthers} /><Button label="Cancelar" variant="ghost" onPress={() => setConfirm(null)} /></View>
            : <Button label="Sair dos outros aparelhos" variant="secondary" disabled={!others.length || busy} onPress={() => { haptic.select(); setConfirm('others'); }} />}
          {confirm === 'all'
            ? <View style={{ gap: 8 }}><T c="muted">Você será desconectado de todos os aparelhos, inclusive deste, e vai precisar entrar de novo.</T><Button label="Sim, sair de todos" variant="danger" loading={busy} onPress={() => run(revokeAll, 'Você saiu de todos os aparelhos.')} /><Button label="Cancelar" variant="ghost" onPress={() => setConfirm(null)} /></View>
            : <Button label="Sair de todos os aparelhos" variant="secondary" disabled={busy} onPress={() => { haptic.select(); setConfirm('all'); }} />}
        </Card>
      </Reveal>
    </Screen>
  );
}
