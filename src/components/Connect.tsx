import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useApp } from '../lib/store';
import { DEMO_QR_N, live } from '../lib/api';
import type { Agent } from '../lib/data';
import { fmtPhone } from '../lib/format';
import { color } from '../lib/theme';
import { Button, Check, ErrorText, haptic, Icon, Notice, Skeleton, T } from './ui';
import { useTheme } from '../lib/ThemeContext';

const STEPS = ['Abra o WhatsApp no celular que será usado pelo agente.', 'Toque em Configurações e depois em Aparelhos conectados.', 'Toque em Conectar um aparelho.', 'Aponte a câmera para este código.'];
type Phase = 'idle' | 'loading' | 'qr' | 'open' | 'error';

// Gera o QR code, renova antes de expirar e avisa quando o WhatsApp é conectado.
export default function Connect({ agent, onOpen }: { agent: Agent; onOpen?: () => void }) {
  useTheme();
  const { connectAgent, pollConnection, simulateScan } = useApp();
  const [phase, setPhase] = useState<Phase>(agent.connection === 'open' ? 'open' : 'idle');
  const [ok, setOk] = useState(false);
  const [qr, setQr] = useState<{ uri?: string; matrix?: boolean[][] } | null>(null);
  const [secs, setSecs] = useState(60);
  const [err, setErr] = useState('');
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const gen = async () => {
    setErr(''); setPhase((p) => (p === 'qr' ? p : 'loading'));
    try { const r = await connectAgent(agent.id); if (!alive.current) return; setQr({ uri: r.qr, matrix: r.matrix }); setSecs(60); setPhase('qr'); }
    catch (e) { if (alive.current) { setErr((e as Error).message); setPhase('error'); } }
  };
  useEffect(() => { if (phase !== 'qr') return; const t = setInterval(() => setSecs((s) => s - 1), 1000); return () => clearInterval(t); }, [phase]);
  useEffect(() => { if (phase === 'qr' && secs <= 0) gen(); }, [secs, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'qr' || !live) return;
    const t = setInterval(async () => { try { const r = await pollConnection(agent.id); if (r.state === 'open' && alive.current) setPhase('open'); } catch { /* tenta de novo */ } }, 2500);
    return () => clearInterval(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'qr' && agent.connection === 'open') setPhase('open'); }, [agent.connection, phase]);
  useEffect(() => { if (phase === 'open') { haptic.success(); onOpen?.(); } }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'open') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityRole="alert">
        <Animated.View entering={ZoomIn.duration(300)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color.successSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={22} c="success" /></Animated.View>
        <View style={{ flex: 1 }}><T v="label">WhatsApp conectado</T><T v="small" c="muted">{agent.phone ? fmtPhone(agent.phone) : 'O agente já enxerga as conversas deste número.'}</T></View>
      </View>
    );
  }

  if (phase === 'idle' || phase === 'error') {
    return (
      <View style={{ gap: 16 }}>
        <Notice title="Antes de conectar">
          <T v="small" c="goldDeep">A conexão por QR code usa uma via não oficial do WhatsApp: existe risco de o número ser bloqueado. Use um número dedicado ao atendimento (de preferência WhatsApp Business) e evite mensagens em massa.</T>
          <T v="small" c="goldDeep" style={{ marginTop: 4 }}>Depois de conectado, o agente responde todas as mensagens desse número. Se for um número pessoal, liste abaixo os contatos que ele não deve atender.</T>
        </Notice>
        <Check checked={ok} onChange={setOk} label="Entendi os riscos e quero conectar" />
        <ErrorText>{err}</ErrorText>
        <Button label="Gerar QR code" disabled={!ok} onPress={gen} />
      </View>
    );
  }

  const size = 232;
  return (
    <View style={{ gap: 16 }} accessibilityLiveRegion="polite">
      <View style={{ alignSelf: 'center', width: size + 24, height: size + 24, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: color.line, backgroundColor: color.white, alignItems: 'center', justifyContent: 'center' }}>
        {phase === 'loading' ? <Skeleton h={size} w={size} /> : qr?.matrix ? (
          <Svg width={size} height={size} viewBox={`-2 -2 ${DEMO_QR_N + 4} ${DEMO_QR_N + 4}`} accessibilityLabel="QR code ilustrativo da demonstração">
            {qr.matrix.flatMap((row, r) => row.map((on, c) => (on ? <Rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color.ink} /> : null)))}
          </Svg>
        ) : qr?.uri ? <Image source={{ uri: qr.uri }} style={{ width: size, height: size }} accessibilityLabel="QR code para conectar o WhatsApp" /> : null}
      </View>
      <View style={{ gap: 6 }}>
        <T v="title">Escaneie para conectar</T>
        {STEPS.map((t, i) => <T key={t} c="muted" style={{ flexDirection: 'row' }}>{i + 1}. {t}</T>)}
        <T v="small" c="muted" style={{ marginTop: 4 }}>{phase === 'qr' ? `O código expira em ${Math.max(secs, 0)} s e é renovado sozinho.` : 'Aguarde um instante…'}</T>
      </View>
      {!live && phase === 'qr' && (
        <Notice title="Demonstração"><T v="small" c="goldDeep">Este QR é só ilustrativo e não conecta de verdade. Com a API ligada, ele vem do WhatsApp.</T></Notice>
      )}
      {!live && phase === 'qr' && <Button label="Simular leitura" variant="secondary" onPress={() => simulateScan(agent.id)} />}
      {phase === 'qr' && <Button label="Gerar novo QR code" variant="ghost" onPress={gen} />}
    </View>
  );
}
