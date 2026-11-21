import { useState } from 'react';
import { View } from 'react-native';
import { compactDiff, diffLines, diffStats } from '../lib/diff';
import { useApp } from '../lib/store';
import type { Agent } from '../lib/data';
import { color } from '../lib/theme';
import { Button, Divider, Icon, Pill, T, Tap, haptic } from './ui';
import { useTheme } from '../lib/ThemeContext';

const when = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Lista as versões salvas das instruções, mostra o que mudou em cada uma e deixa voltar a qualquer uma.
export default function VersionHistory({ agent }: { agent: Agent }) {
  useTheme();
  const { history, restoreVersion, say } = useApp();
  const versions = [...(history[agent.id] ?? [])].reverse(); // mais nova primeiro
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const current = versions[0];

  if (!versions.length) return <T c="muted">As versões aparecem aqui a cada vez que você salvar as instruções.</T>;
  return (
    <View accessibilityLabel="Histórico de versões das instruções">
      <Divider />
      {versions.map((v, idx) => {
        const isCurrent = idx === 0, isOpen = open === v.id;
        const base = isCurrent ? versions[1]?.text ?? '' : current!.text; // atual: o que mudou nela; antigas: diferença para a atual
        const lines = isOpen ? diffLines(base, v.text) : [];
        const st = diffStats(lines);
        return (
          <View key={v.id}>
            <Tap onPress={() => { haptic.select(); setOpen(isOpen ? null : v.id); }} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} accessibilityLabel={`${isCurrent ? 'Versão atual' : 'Versão'} de ${when(v.at)}. ${v.note}`} scale={0.99} style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><T v="label" num>{when(v.at)}</T>{isCurrent && <Pill tone="green">Atual</Pill>}</View>
                <T v="small" c="muted" numberOfLines={2}>{v.note}</T>
              </View>
              <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} c="muted" />
            </Tap>
            {isOpen && (
              <View style={{ gap: 12, paddingBottom: 16 }}>
                <T v="caption" c="muted">{isCurrent ? (versions[1] ? 'O que mudou nesta versão em relação à anterior:' : 'Primeira versão das instruções.') : 'O que muda se você voltar para esta versão (em relação à atual):'}</T>
                {(isCurrent && !versions[1]) ? null : lines.every((l) => l.t === 'same')
                  ? <T v="small" c="muted">Nenhuma diferença.</T>
                  : (
                    <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: color.line }}>
                      {compactDiff(lines).slice(0, 60).map((l, i) => l.t === 'gap'
                        ? <View key={i} style={{ paddingVertical: 4, paddingHorizontal: 10, backgroundColor: color.subtle }}><T v="caption" c="muted">… {l.n} {l.n === 1 ? 'linha igual' : 'linhas iguais'}</T></View>
                        : <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: l.t === 'add' ? color.successSoft : l.t === 'del' ? color.dangerSoft : color.bg }}>
                            <T v="small" c={l.t === 'add' ? 'success' : l.t === 'del' ? 'danger' : 'muted'} style={{ width: 14, fontWeight: '700' }} accessibilityElementsHidden importantForAccessibility="no">{l.t === 'add' ? '+' : l.t === 'del' ? '−' : ' '}</T>
                            <T v="small" c={l.t === 'same' ? 'muted' : l.t === 'add' ? 'success' : 'danger'} style={{ flex: 1 }} accessibilityLabel={`${l.t === 'add' ? 'Adicionado' : l.t === 'del' ? 'Removido' : 'Igual'}: ${l.text}`}>{l.text || ' '}</T>
                          </View>)}
                    </View>
                  )}
                {lines.length > 0 && <T v="caption" c="muted" num>{st.add} {st.add === 1 ? 'linha adicionada' : 'linhas adicionadas'}, {st.del} {st.del === 1 ? 'removida' : 'removidas'}</T>}
                {!isCurrent && <Button label="Restaurar esta versão" icon="rotate-ccw" small full={false} loading={busy} onPress={async () => { setBusy(true); try { await restoreVersion(agent.id, v.id); setOpen(null); } catch (e) { say((e as Error).message); } setBusy(false); }} hint="Volta às instruções desta versão. Dá para desfazer logo em seguida." />}
              </View>
            )}
            <Divider />
          </View>
        );
      })}
    </View>
  );
}
