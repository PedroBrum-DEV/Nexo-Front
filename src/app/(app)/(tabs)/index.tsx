import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../../lib/store';
import { useAuth } from '../../../lib/auth';
import { live } from '../../../lib/api';
import { useTheme } from '../../../lib/ThemeContext';
import { useLayout } from '../../../lib/layout';
import { KIND, SERVICES, WEEKS, totals, weekLabel } from '../../../lib/data';
import { color } from '../../../lib/theme';
import { Button, Card, Count, Divider, Icon, LinkButton, Pill, Reveal, SectionTitle, Segmented, T, Tap, haptic } from '../../../components/ui';
import { Screen } from '../../../components/Screen';
import { BarList, Heat, WeekBars } from '../../../components/charts';
import Onboarding from '../../../components/Onboarding';

const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);

function Delta({ v, good = 'up', unit = '%' }: { v: number | null; good?: 'up' | 'down'; unit?: string }) {
  if (v == null || v === 0) return <T v="small" c="muted" num>sem variação</T>;
  const better = good === 'up' ? v > 0 : v < 0;
  return <T v="small" c={better ? 'success' : 'danger'} num style={{ fontWeight: '600' }}>{v > 0 ? '+' : '−'}{Math.abs(v)}{unit}</T>;
}

export default function Home() {
  useTheme(); // a página se redesenha ao trocar o tema (parte do visual é montada aqui)
  const { requests, agents, sample, onboardingDismissed, loadSample } = useApp();
  const { user } = useAuth();
  const firstName = (user?.name || '').split(' ')[0] || '';
  const { wide } = useLayout();
  const [w, setW] = useState(7);
  const [detail, setDetail] = useState<'serv' | 'hor' | 'sem'>('serv');
  const wk = WEEKS[w]!, prev = WEEKS[w - 1];
  const n = wk.days.filter(Boolean).length; // dias já com dados (a semana atual está em andamento)
  const cur = totals(wk, n), old = prev ? totals(prev, n) : null;
  const rate = (t: ReturnType<typeof totals>) => (t.conv ? Math.round((t.agend / t.conv) * 100) : 0);
  const open = requests.filter((r) => r.status === 'open');
  const name = agents[0]?.name || 'O agente';
  const go = (d: number) => { haptic.select(); setW((x) => x + d); };
  const weeks8 = WEEKS.map((x, i) => [weekLabel(i), totals(x, 7).agend] as [string, number]);

  const rows: { label: string; value: number; suffix?: string; delta: React.ReactNode }[] = [
    { label: 'Agendamentos', value: cur.agend, delta: <Delta v={old ? pct(cur.agend, old.agend) : null} /> },
    { label: 'Conversas', value: cur.conv, delta: <Delta v={old ? pct(cur.conv, old.conv) : null} /> },
    { label: 'Conversão', value: rate(cur), suffix: '%', delta: <Delta v={old ? rate(cur) - rate(old) : null} unit=" p.p." /> },
    { label: 'Cancelamentos', value: cur.cancel, delta: <Delta v={old ? pct(cur.cancel, old.cancel) : null} good="down" /> },
  ];

  const nav = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, backgroundColor: color.bg, borderRadius: 12, borderWidth: 1, borderColor: color.line, padding: 4 }}>
      <Tap disabled={w === 0} onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Semana anterior" style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', opacity: w === 0 ? 0.3 : 1 }} scale={0.9}><Icon name="chevron-left" size={20} /></Tap>
      <View style={{ minWidth: 150, alignItems: 'center' }} accessibilityLiveRegion="polite"><T v="label" num>{weekLabel(w)}</T><T v="caption" c="muted">{w === 7 ? 'esta semana' : `${7 - w} ${7 - w === 1 ? 'semana atrás' : 'semanas atrás'}`}</T></View>
      <Tap disabled={w === 7} onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Próxima semana" style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center', opacity: w === 7 ? 0.3 : 1 }} scale={0.9}><Icon name="chevron-right" size={20} /></Tap>
    </View>
  );

  const badge = open.length > 0 ? <View style={{ backgroundColor: color.gold, borderRadius: 999, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><T v="label" style={{ fontSize: 13 }} num>{open.length}</T></View> : undefined;
  const limit = wide ? 3 : 2;
  const decide = (
    <Card style={{ flex: wide ? 1 : undefined, gap: 4 }}>
      <SectionTitle right={badge}>Para decidir</SectionTitle>
      {open.length === 0 && <T c="muted" style={{ marginTop: 8 }}>Nada aberto. Os agentes estão dando conta.</T>}
      {open.slice(0, limit).map((r) => (
        <View key={r.id}>
          <Divider />
          <Tap onPress={() => router.push('/registros')} accessibilityRole="button" accessibilityLabel={`${KIND[r.kind]}: ${r.title}`} scale={0.99} style={{ paddingVertical: 14, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Pill tone={r.kind === 'reclamacao' ? 'red' : 'gold'}>{KIND[r.kind]!}</Pill>{r.n > 1 && <T v="label" c="goldDeep" num>{r.n}×</T>}</View>
            <T v="label">{r.title}</T>
            <T v="small" c="muted" numberOfLines={2}>{r.text}</T>
          </Tap>
        </View>
      ))}
      {open.length > 0 && <LinkButton label={open.length > limit ? `Ver os ${open.length} registros` : 'Ver registros'} onPress={() => router.push('/registros')} />}
    </Card>
  );

  return (
    <Screen tabbed title={sample ? 'Resumo' : 'Início'} width={1280} right={wide && sample ? nav : undefined}>
      {sample
        ? <T c="muted" style={{ marginTop: wide ? -16 : -4 }}>{name} agendou <T v="label" num>{cur.agend} horários</T> {w === 7 ? 'até agora nesta semana' : `na semana de ${weekLabel(w)}`}.</T>
        : <T c="muted" style={{ marginTop: wide ? -16 : -4 }}>{firstName ? `Olá, ${firstName}. ` : ''}Vamos deixar o seu atendimento no ar.</T>}

      {!onboardingDismissed && <Reveal i={0}><Onboarding /></Reveal>}

      {live && (
        <Reveal i={1}>
          <Card style={{ gap: 12 }}>
            <SectionTitle>Radar de empresas</SectionTitle>
            <T c="muted">Encontre empresas que precisam de site ou de agendamento online e acompanhe as negociações.</T>
            <Button label="Abrir o Radar" icon="target" variant="secondary" small full={false} onPress={() => router.push('/radar')} />
          </Card>
        </Reveal>
      )}

      {!sample && (
        <Reveal i={1}>
          <Card style={{ gap: 12 }}>
            <SectionTitle>Números e conversas</SectionTitle>
            {live
              ? <T c="muted">Os indicadores, as conversas e os registros aparecem aqui assim que o servidor de métricas estiver ligado.</T>
              : <>
                  <T c="muted">Ainda não há atendimentos. Os números aparecem quando seus agentes começarem a conversar com clientes. Quer ver o painel funcionando antes?</T>
                  <Button label="Carregar dados de exemplo" variant="secondary" small full={false} onPress={loadSample} />
                </>}
          </Card>
        </Reveal>
      )}

      {sample && <>
      {!wide && nav}

      <Reveal i={0}>
        {wide ? (
          <Card pad={0} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {rows.map((r, i) => (
              <View key={r.label} style={{ flex: 1, minWidth: 210, padding: 24, gap: 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: color.line }} accessible accessibilityLabel={`${r.label}: ${r.value}${r.suffix ?? ''}`}>
                <T v="small" c="muted">{r.label}</T>
                <Count v="display" value={r.value} suffix={r.suffix} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{r.delta}<T v="caption" c="muted">vs. semana anterior</T></View>
              </View>
            ))}
          </Card>
        ) : (
          // celular: 2 × 2, cada indicador no seu cartão
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {rows.map((r) => (
              <Card key={r.label} pad={16} style={{ flexBasis: '45%', flexGrow: 1, gap: 4 }}>
                <View accessible accessibilityLabel={`${r.label}: ${r.value}${r.suffix ?? ''}`} style={{ gap: 4 }}>
                  <T v="small" c="muted" numberOfLines={1}>{r.label}</T>
                  <Count v="display" value={r.value} suffix={r.suffix} style={{ fontSize: 30, lineHeight: 36 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{r.delta}</View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </Reveal>

      <View style={wide ? { flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' } : { gap: 16 }}>
        <Reveal i={1} style={wide ? { flex: 2, minWidth: 440 } : undefined}>
          <Card style={{ flex: wide ? 1 : undefined, gap: 20 }}>
            <SectionTitle>Por dia da semana</SectionTitle>
            <WeekBars key={w} week={wk} prev={prev} h={wide ? 210 : 150} />
          </Card>
        </Reveal>
        <Reveal i={2} style={wide ? { flex: 1, minWidth: 320 } : undefined}>{decide}</Reveal>
      </View>

      {wide ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
          <Reveal i={3} style={{ flex: 1, minWidth: 300 }}><Card style={{ flex: 1, gap: 20 }}><SectionTitle>Serviços mais agendados</SectionTitle><BarList items={SERVICES} unit="%" /></Card></Reveal>
          <Reveal i={4} style={{ flex: 1, minWidth: 340 }}><Card style={{ flex: 1, gap: 20 }}><SectionTitle>Quando agendam</SectionTitle><Heat week={wk} /></Card></Reveal>
          <Reveal i={5} style={{ flex: 1, minWidth: 300 }}><Card style={{ flex: 1, gap: 20 }}><SectionTitle>Últimas 8 semanas</SectionTitle><BarList items={weeks8} /></Card></Reveal>
        </View>
      ) : (
        // celular: os três detalhes dividem o mesmo cartão (um por vez) em vez de empilhar
        <Reveal i={3}>
          <Card style={{ gap: 20 }}>
            <SectionTitle>Detalhes</SectionTitle>
            <Segmented value={detail} onChange={setDetail} options={[['serv', 'Serviços'], ['hor', 'Horários'], ['sem', '8 semanas']]} />
            {detail === 'serv' && <BarList items={SERVICES} unit="%" />}
            {detail === 'hor' && <Heat week={wk} />}
            {detail === 'sem' && <BarList items={weeks8} />}
          </Card>
        </Reveal>
      )}
      </>}
    </Screen>
  );
}
