import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '../../../lib/store';
import { useLayout } from '../../../lib/layout';
import { useTheme } from '../../../lib/ThemeContext';
import { live } from '../../../lib/api';
import { color } from '../../../lib/theme';
import { PERIODS, PERIOD_LABEL, SAMPLE_AGENT_ID, buildReport, pctText, type Period } from '../../../lib/reports';
import { reportHtml, saveFile, savePdf, stamp, toCSV } from '../../../lib/export';
import { BarList } from '../../../components/charts';
import { Screen } from '../../../components/Screen';
import { Button, Card, Chip, Chips, Count, Divider, haptic, Reveal, SectionTitle, Segmented, T } from '../../../components/ui';

export default function Relatorios() {
  useTheme();
  const { agents, sample, loadSample, say } = useApp();
  const { wide } = useLayout();
  const [period, setPeriod] = useState<Period>('4');
  const [agent, setAgent] = useState('todos');
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);

  const agentName = agent === 'todos' ? 'Todos os agentes' : agents.find((a) => a.id === agent)?.name ?? 'Agente';
  const hasData = sample && (agent === 'todos' || agent === SAMPLE_AGENT_ID);
  const { rows, total, services } = buildReport(period, hasData);
  const headers = ['Semana', 'Conversas', 'Agendamentos', 'Remarcações', 'Cancelamentos', 'Conversão'];
  const asArray = (r: typeof total) => [r.label, r.conv, r.agend, r.remar, r.cancel, pctText(r.rate)];

  const run = async (kind: 'csv' | 'pdf') => {
    setBusy(kind);
    try {
      if (kind === 'csv') {
        await saveFile(`relatorio-nexo-${stamp()}.csv`, toCSV(headers, [...rows.map(asArray), asArray(total)]), 'text/csv');
        haptic.success(); say('Relatório CSV exportado.');
      } else {
        await savePdf(reportHtml({
          title: 'Relatório de atendimento', subtitle: 'Resultados dos agentes no período', periodLabel: PERIOD_LABEL[period], agentLabel: agentName,
          kpis: [['Conversas', String(total.conv)], ['Agendamentos', String(total.agend)], ['Conversão', pctText(total.rate)], ['Cancelamentos', String(total.cancel)]],
          headers, rows: [...rows.map(asArray), asArray(total)], services,
        }));
        haptic.success();
      }
    } catch (e) { haptic.error(); say((e as Error).message || 'Não consegui exportar o relatório.'); }
    setBusy(null);
  };

  const kpis: [string, number, string?][] = [['Conversas', total.conv], ['Agendamentos', total.agend], ['Conversão', Math.round(total.rate), '%'], ['Cancelamentos', total.cancel]];
  const cols = wide ? [1.7, 1, 1.2, 1.1, 1.2, 1] : [1.6, 1, 1, 0.9];
  const cells = (r: typeof total) => (wide ? [r.label, r.conv, r.agend, r.remar, r.cancel, pctText(r.rate)] : [r.label, r.conv, r.agend, pctText(r.rate)]);
  const heads = wide ? headers : ['Semana', 'Conv.', 'Agend.', 'Taxa'];

  return (
    <Screen tabbed title="Relatórios" width={1100}>
      <T c="muted" style={{ marginTop: wide ? -12 : -4 }}>Resultados por período e por agente. Exporte para planilha ou PDF.</T>

      <Reveal i={0}>
        <Card style={{ gap: 16 }}>
          <View style={wide ? { maxWidth: 420 } : undefined}><Segmented value={period} onChange={setPeriod} options={PERIODS} /></View>
          {agents.length > 0 && <Chips><Chip label="Todos os agentes" on={agent === 'todos'} onPress={() => setAgent('todos')} />{agents.map((a) => <Chip key={a.id} label={a.name} on={agent === a.id} onPress={() => setAgent(a.id)} />)}</Chips>}
        </Card>
      </Reveal>

      {!hasData ? (
        <Reveal i={1}>
          <Card style={{ gap: 12 }}>
            <SectionTitle>Ainda sem números</SectionTitle>
            <T c="muted">{!sample ? (live ? 'Os relatórios aparecem aqui assim que o servidor de métricas estiver ligado.' : 'Os relatórios mostram os atendimentos dos seus agentes. Ainda não há atendimentos; quer ver como fica com dados de exemplo?') : `${agentName} ainda não tem atendimentos neste período.`}</T>
            {!sample && !live && <Button label="Carregar dados de exemplo" variant="secondary" small full={false} onPress={loadSample} />}
          </Card>
        </Reveal>
      ) : (
        <>
          <Reveal i={1}>
            {wide ? (
              <Card pad={0} style={{ flexDirection: 'row' }}>
                {kpis.map(([l, v, suf], i) => (
                  <View key={l} style={{ flex: 1, padding: 24, gap: 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: color.line }} accessible accessibilityLabel={`${l}: ${v}${suf ?? ''}`}><T v="small" c="muted">{l}</T><Count v="display" value={v} suffix={suf} /></View>
                ))}
              </Card>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {kpis.map(([l, v, suf]) => <Card key={l} pad={16} style={{ flexBasis: '45%', flexGrow: 1 }}><View accessible accessibilityLabel={`${l}: ${v}${suf ?? ''}`} style={{ gap: 4 }}><T v="small" c="muted" numberOfLines={1}>{l}</T><Count v="display" value={v} suffix={suf} style={{ fontSize: 30, lineHeight: 36 }} /></View></Card>)}
              </View>
            )}
          </Reveal>

          <Reveal i={2}>
            <Card style={{ gap: 12 }}>
              <SectionTitle>Por semana</SectionTitle>
              <View accessibilityRole="table">
                <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 10 }}>{heads.map((x, i) => <T key={x} v="caption" c="muted" style={{ flex: cols[i], textAlign: i ? 'right' : 'left', fontWeight: '700' }} numberOfLines={1}>{x}</T>)}</View>
                {[...rows, total].map((r, ri) => {
                  const last = ri === rows.length;
                  return (
                    <View key={r.label}><Divider /><View style={{ flexDirection: 'row', gap: 8, paddingVertical: 12 }}>{cells(r).map((c, i) => <T key={i} v={i && !last ? 'small' : 'label'} c={last ? 'ink' : 'ink'} num numberOfLines={i ? 1 : 2} style={{ flex: cols[i], textAlign: i ? 'right' : 'left', fontWeight: last ? '700' : i ? '500' : '600' }}>{c}</T>)}</View></View>
                  );
                })}
              </View>
            </Card>
          </Reveal>

          <Reveal i={3}><Card style={{ gap: 20 }}><SectionTitle>Serviços mais agendados</SectionTitle><BarList items={services} /></Card></Reveal>
        </>
      )}

      <Reveal i={4}>
        <Card style={{ gap: 14 }}>
          <SectionTitle>Exportar</SectionTitle>
          <T v="small" c="muted">O arquivo usa os filtros acima. A planilha (CSV) abre no Excel e no Google Planilhas; no PDF, no computador, escolha “Salvar como PDF” na janela de impressão.</T>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 150 }}><Button label={busy === 'csv' ? 'Gerando…' : 'Exportar CSV'} icon="file-text" variant="secondary" loading={busy === 'csv'} disabled={!hasData} onPress={() => run('csv')} /></View>
            <View style={{ flex: 1, minWidth: 150 }}><Button label={busy === 'pdf' ? 'Gerando…' : 'Exportar PDF'} icon="download" loading={busy === 'pdf'} disabled={!hasData} onPress={() => run('pdf')} /></View>
          </View>
        </Card>
      </Reveal>
    </Screen>
  );
}
