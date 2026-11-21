import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BLOCKS, DAY_LABELS, type Week } from '../lib/data';
import { color, radius } from '../lib/theme';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Tap, T, haptic } from './ui';
import { useTheme } from '../lib/ThemeContext';

// Gráficos sem biblioteca: barras e células de View. Sem animação de entrada (o painel carrega direto na tarefa).
const H = 120;

// Barra que cresce da base (scaleY, sem mexer no layout), em cascata.
function GrowBar({ h, i, on }: { h: number; i: number; on: boolean }) {
  useTheme();
  const reduced = useReducedMotion();
  const g = useSharedValue(reduced ? 1 : 0);
  useEffect(() => { if (!reduced) g.set(withDelay(i * 80, withTiming(1, { duration: 900, easing: Easing.bezier(0.23, 1, 0.32, 1) }))); }, [reduced, i, g]);
  const a = useAnimatedStyle(() => ({ transform: [{ scaleY: g.get() }] }));
  return <Animated.View style={[{ width: '70%', maxWidth: 56, height: h, backgroundColor: on ? color.primary : color.barSoft, borderTopLeftRadius: 6, borderTopRightRadius: 6, transformOrigin: 'bottom' }, a]} />;
}

export function WeekBars({ week, prev, h = H }: { week: Week; prev?: Week; h?: number }) {
  useTheme();
  const lastWith = week.days.reduce<number>((a, d, i) => (d ? i : a), 0);
  const [sel, setSel] = useState(lastWith);
  const idx = week.days[sel] ? sel : lastWith;
  const max = Math.max(1, ...week.days.map((d) => d?.[0] ?? 0), ...(prev?.days.map((d) => d?.[0] ?? 0) ?? []));
  const cur = week.days[idx];
  const old = prev?.days[idx];
  return (
    <View style={{ gap: 12 }}>
      <T v="small" c="muted" accessibilityLiveRegion="polite" num>
        {DAY_LABELS[idx]}: <T v="label" num>{cur?.[0] ?? 0} agendados</T>
        {cur ? `, ${cur[2]} ${cur[2] === 1 ? 'cancelado' : 'cancelados'}` : ''}{old ? `. Semana anterior: ${old[0]}` : ''}
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {week.days.map((d, i) => {
          const v = d?.[0] ?? 0, pv = prev?.days[i]?.[0];
          return (
            <Tap key={i} disabled={!d} onPress={() => { haptic.select(); setSel(i); }} accessibilityRole="button" accessibilityState={{ selected: i === idx }}
              accessibilityLabel={d ? `${DAY_LABELS[i]}: ${v} agendados${pv != null ? `, semana anterior ${pv}` : ''}` : `${DAY_LABELS[i]}: ainda sem dados`} scale={0.96} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ height: h, width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                {pv != null && <View style={{ position: 'absolute', bottom: (pv / max) * h, left: 2, right: 2, height: 2, backgroundColor: color.muted, opacity: 0.55 }} />}
                {d ? <GrowBar h={Math.max(3, (v / max) * h)} i={i} on={i === idx} /> : <View style={{ width: '70%', height: 3, backgroundColor: color.line, borderRadius: 2 }} />}
              </View>
              <T v="caption" c={i === idx ? 'ink' : 'muted'} style={{ fontWeight: i === idx ? '700' : '500' }}>{DAY_LABELS[i]}</T>
            </Tap>
          );
        })}
      </View>
      <T v="caption" c="muted">Barras: esta semana. Traço: semana anterior. Toque num dia para ver os números.</T>
    </View>
  );
}

export function BarList({ items, unit = '' }: { items: [string, number][]; unit?: string }) {
  useTheme();
  const max = Math.max(1, ...items.map((i) => i[1]));
  return (
    <View style={{ gap: 16 }}>
      {items.map(([label, v]) => (
        <View key={label} style={{ gap: 6 }} accessible accessibilityLabel={`${label}: ${v}${unit}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><T v="label">{label}</T><T v="label" num>{v}{unit}</T></View>
          <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: color.subtle }}><View style={{ height: 8, width: `${(v / max) * 100}%`, borderRadius: radius.pill, backgroundColor: color.primary }} /></View>
        </View>
      ))}
    </View>
  );
}

export function Heat({ week }: { week: Week }) {
  useTheme();
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel="Mapa de calor: procura por dia da semana e faixa de horário. Mais escuro, mais procura.">
      <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 78 }}>{DAY_LABELS.map((d) => <T key={d} v="caption" c="muted" style={{ flex: 1, textAlign: 'center' }}>{d}</T>)}</View>
      {BLOCKS.map((b, bi) => (
        <View key={b} style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <T v="caption" c="muted" style={{ width: 72 }} numberOfLines={1}>{b}</T>
          {week.heat[bi]!.map((v, di) => <View key={di} style={{ flex: 1, height: 30, borderRadius: 6, backgroundColor: color.primary, opacity: 0.08 + v * 0.92 }} />)}
        </View>
      ))}
    </View>
  );
}
