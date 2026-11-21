import { forwardRef, useEffect, useState, type ReactNode } from 'react';
import { useRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, interpolateColor, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { color, radius, space, themed, TOUCH, type, type ColorName, type TypeName } from '../lib/theme';
import { initials } from '../lib/format';
import { useLayout } from '../lib/layout';
import { useTheme } from '../lib/ThemeContext';

// ---------- háptico: nunca é o único feedback, e não existe na web ----------
const hx = (fn: () => Promise<void>) => { if (Platform.OS !== 'web') fn().catch(() => {}); };
export const haptic = {
  select: () => hx(() => Haptics.selectionAsync()),
  light: () => hx(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => hx(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => hx(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

// ---------- texto ----------
type TProps = { v?: TypeName; c?: ColorName; num?: boolean; children?: ReactNode; style?: StyleProp<TextStyle> } & Omit<React.ComponentProps<typeof Text>, 'style'>;
export function T({ v = 'body', c = 'ink', num, style, children, ...rest }: TProps) { useTheme();
  return <Text {...rest} style={[type[v], { color: color[c] }, num && { fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}

export function Icon({ name, size = 20, c = 'ink' }: { name: React.ComponentProps<typeof Feather>['name']; size?: number; c?: ColorName }) { useTheme();
  return <Feather name={name} size={size} color={color[c]} accessible={false} importantForAccessibility="no-hide-descendants" />;
}

// ---------- toque: escala 0,97 em 100 ms na pressão (Emil Kowalski, animate-expo) ----------
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const APressable = Animated.createAnimatedComponent(Pressable);
type TapProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number };
export function Tap({ style, scale = 0.96, disabled, onPressIn, onPressOut, hitSlop = 6, ...rest }: TapProps) {
  const s = useSharedValue(1);
  const reduced = useReducedMotion();
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <APressable
      {...rest} disabled={disabled} hitSlop={hitSlop} style={[style, a]}
      onPressIn={(e) => { if (!reduced && !disabled) s.set(withTiming(scale, { duration: 130, easing: EASE_OUT })); onPressIn?.(e); }}
      onPressOut={(e) => { s.set(withTiming(1, { duration: 260, easing: EASE_OUT })); onPressOut?.(e); }}
    />
  );
}

// ---------- botões: mesmo formato em todas as telas ----------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ label, onPress, variant = 'primary', disabled, loading, full = true, small, icon, hint }: {
  label: string; onPress?: () => void; variant?: Variant; disabled?: boolean; loading?: boolean; full?: boolean; small?: boolean; icon?: React.ComponentProps<typeof Feather>['name']; hint?: string;
}) {
  useTheme();
  const [down, setDown] = useState(false);
  const off = disabled || loading;
  const bg = variant === 'primary' ? (down ? color.primaryPressed : color.primary) : variant === 'danger' ? color.danger : down ? color.subtle : 'transparent';
  const fg: ColorName = variant === 'primary' || variant === 'danger' ? 'onPrimary' : variant === 'ghost' ? 'deep' : 'ink';
  return (
    <Tap
      accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off} onPress={onPress} onPressIn={() => setDown(true)} onPressOut={() => setDown(false)}
      style={[s.btn, small && s.btnSmall, !full && { alignSelf: 'flex-start' }, { backgroundColor: bg, borderColor: variant === 'secondary' ? color.line : bg }, off && { opacity: 0.45 }]}
    >
      {icon && <Icon name={icon} size={18} c={fg} />}
      <T v="label" c={fg} style={{ fontSize: small ? 14 : 16 }}>{label}</T>
    </Tap>
  );
}

// ---------- campos ----------
export type InputRef = React.ComponentRef<typeof TextInput>;
type FieldProps = TextInputProps & { label: string; error?: string; hint?: string; right?: ReactNode };
export const TextField = forwardRef<InputRef, FieldProps>(function TextField({ label, error, hint, right, style, onFocus, onBlur, multiline, ...p }, ref) {
  useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">{label}</T>
      <View style={[s.input, multiline && { alignItems: 'flex-start' }, focus && { borderColor: color.primary }, !!error && { borderColor: color.danger }]}>
        <TextInput
          ref={ref} {...p} multiline={multiline} accessibilityLabel={label}
          placeholderTextColor={color.placeholder} selectionColor={color.primary} cursorColor={color.primary}
          onFocus={(e) => { setFocus(true); onFocus?.(e); }} onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          style={[s.inputText, multiline && { minHeight: 140, textAlignVertical: 'top', paddingTop: 12 }, style]}
        />
        {right}
      </View>
      {error ? <T v="small" c="danger" role="alert" accessibilityLiveRegion="polite">{error}</T> : hint ? <T v="small" c="muted">{hint}</T> : null}
    </View>
  );
});

// Olho que fecha e abre: a pálpebra se move (fechado = senha escondida; aberto = senha à mostra) e a pupila aparece.
const AnimPath = Animated.createAnimatedComponent(Path);
const AnimCircle = Animated.createAnimatedComponent(Circle);
// Desenho da pálpebra para t (0 = fechado, 1 = aberto). Usado no estado inicial e pela animação.
function eyePath(t: number) {
  'worklet';
  const yt = 15 + (4.5 - 15) * t, yb = 15 + (19.5 - 15) * t;
  const a = 12 + (yt - 12) * 0.55, b = 12 + (yb - 12) * 0.55;
  return `M2 12 C5 ${a} 8.5 ${yt} 12 ${yt} C15.5 ${yt} 19 ${a} 22 12 C19 ${b} 15.5 ${yb} 12 ${yb} C8.5 ${yb} 5 ${b} 2 12 Z`;
}
export function EyeIcon({ open, size = 24 }: { open: boolean; size?: number }) { useTheme();
  const reduced = useReducedMotion();
  const p = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    // com "reduzir movimento" a troca continua, só que curta (160 ms), para o toque ter resposta
    p.set(withTiming(open ? 1 : 0, { duration: reduced ? 160 : open ? 520 : 380, easing: open ? Easing.bezier(0.34, 1.45, 0.64, 1) : Easing.bezier(0.16, 1, 0.3, 1) }));
  }, [open, reduced, p]);
  const lid = useAnimatedProps(() => { const t = p.get(); return { d: eyePath(t) }; });
  const pupil = useAnimatedProps(() => { const t = Math.min(1, Math.max(0, p.get())); return { r: 3.3 * t, opacity: Math.min(1, t * 1.5) }; });
  const lashes = useAnimatedProps(() => ({ opacity: 1 - Math.min(1, Math.max(0, p.get()) * 1.8) }));
  const t0 = open ? 1 : 0; // desenho estático (vale também se a animação não rodar)
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimPath animatedProps={lid} d={eyePath(t0)} stroke={open ? color.primary : color.muted} fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <AnimCircle animatedProps={pupil} cx={12} cy={12} r={3.3 * t0} stroke={open ? color.primary : color.muted} opacity={t0} fill="none" strokeWidth={1.9} />
      <AnimPath animatedProps={lashes} d="M6.6 15.9l-1.4 2.4M12 16.9v2.9M17.4 15.9l1.4 2.4" stroke={color.muted} opacity={1 - t0} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

// Senha com o "olho" para mostrar ou esconder o que foi digitado.
export const PasswordField = forwardRef<InputRef, Omit<FieldProps, 'right' | 'secureTextEntry'>>(function PasswordField(p, ref) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      ref={ref} {...p} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} spellCheck={false} maxLength={72}
      right={
        <Tap onPress={() => { setShow((v) => !v); haptic.select(); }} accessibilityRole="button" accessibilityLabel={show ? 'Ocultar senha' : 'Mostrar senha'} accessibilityState={{ selected: show }} hitSlop={4} scale={0.88} style={s.eye}>
          <EyeIcon open={show} />
        </Tap>
      }
    />
  );
});

// ---------- seleção ----------
export function Segmented<K extends string>({ value, onChange, options }: { value: K; onChange: (k: K) => void; options: [K, string][] }) {
  useTheme();
  return (
    <View style={s.seg} accessibilityRole="tablist">
      {options.map(([k, label]) => {
        const on = k === value;
        return (
          <Tap key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { if (!on) { haptic.select(); onChange(k); } }} style={[s.segItem, on && s.segOn]} scale={0.98}>
            <T v="label" c={on ? 'ink' : 'muted'} numberOfLines={1}>{label}</T>
          </Tap>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) { useTheme();
  return (
    <Tap accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { haptic.select(); onPress(); }} style={[s.chip, on && { backgroundColor: color.primary, borderColor: color.primary }]}>
      <T v="label" c={on ? 'onPrimary' : 'ink'}>{label}</T>
    </Tap>
  );
}
export function Chips({ children }: { children: ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, flexGrow: 0 }}>{children}</ScrollView>;
}

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) { useTheme();
  return (
    <Tap accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => { haptic.select(); onChange(!checked); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: TOUCH }} scale={0.99}>
      <View style={[s.box, checked && { backgroundColor: color.primary, borderColor: color.primary }]}>{checked && <Icon name="check" size={16} c="onPrimary" />}</View>
      <T style={{ flex: 1 }}>{label}</T>
    </Tap>
  );
}

// ---------- etiquetas e linhas ----------
const TONES = themed(() => ({ ia: [color.soft, color.deep], gold: [color.goldSoft, color.goldDeep], mute: [color.subtle, color.muted], red: [color.dangerSoft, color.danger], green: [color.successSoft, color.success] }) as const);
export type Tone = keyof typeof TONES;
export function Pill({ tone = 'ia', children }: { tone?: Tone; children: ReactNode }) { useTheme();
  return <View style={{ alignSelf: 'flex-start', backgroundColor: TONES[tone][0], paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}><Text style={[type.caption, { color: TONES[tone][1], fontWeight: '600' }]}>{children}</Text></View>;
}
export function Divider() { useTheme(); return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color.line }} />; }
export function Avatar({ name, size = 40 }: { name: string; size?: number }) { useTheme();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center' }}><Text style={[type.label, { color: color.deep }]}>{initials(name)}</Text></View>;
}
export function Dot({ on }: { on?: boolean }) { useTheme();
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? color.success : color.line }} />;
}
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}><T v="title">{children}</T>{right}</View>;
}
export function LinkButton({ label, onPress, c = 'primary' }: { label: string; onPress: () => void; c?: ColorName }) {
  return <Tap accessibilityRole="link" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }} scale={0.98}><T v="label" c={c}>{label}</T></Tap>;
}

// ---------- cartão: no computador é uma superfície branca sobre o fundo do painel; no celular é só um agrupador ----------
export function Card({ children, style, pad, hover }: { children: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; hover?: boolean }) {
  const { wide } = useLayout();
  useTheme();
  const h = useSharedValue(0);
  // valores simples, lidos aqui: o `color` é um objeto mutado e a thread de animação guardaria uma cópia antiga dele (borda clara no escuro)
  const from = color.line, to = color.borderHover;
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * h.get() }], borderColor: interpolateColor(h.get(), [0, 1], [from, to]) }), [from, to]);
  const base: ViewStyle = { backgroundColor: color.bg, borderRadius: radius.lg, borderWidth: 1, borderColor: color.line, padding: pad ?? (wide ? 24 : 20), shadowColor: '#0A2A40', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } };
  if (!hover) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable onHoverIn={() => h.set(withTiming(1, { duration: 260, easing: EASE_OUT }))} onHoverOut={() => h.set(withTiming(0, { duration: 320, easing: EASE_OUT }))} style={style as StyleProp<ViewStyle>}>
      <Animated.View style={[base, { flex: 1 }, a]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- estados ----------
export function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <View style={{ paddingVertical: space.xxl, gap: 8, alignItems: 'flex-start' }}><T v="title">{title}</T><T c="muted">{text}</T>{action && <View style={{ marginTop: 8 }}>{action}</View>}</View>;
}
/** Erro ao carregar uma lista ou tela: diz o que houve e oferece tentar de novo. */
export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) { useTheme();
  return (
    <View accessibilityRole="alert" style={{ borderRadius: 14, borderWidth: 1, borderColor: color.danger, backgroundColor: color.dangerSoft, padding: 16, gap: 12 }}>
      <T v="label" c="danger">Não foi possível carregar</T>
      <T c="muted">{text}</T>
      {onRetry ? <Button label="Tentar de novo" variant="secondary" small full={false} onPress={onRetry} /> : null}
    </View>
  );
}

export function Skeleton({ h = 16, w = '100%' as number | `${number}%` }: { h?: number; w?: number | `${number}%` }) { useTheme();
  const o = useSharedValue(1);
  const reduced = useReducedMotion();
  useEffect(() => { if (!reduced) o.set(withRepeat(withSequence(withTiming(0.5, { duration: 700 }), withTiming(1, { duration: 700 })), -1)); }, [reduced, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ height: h, width: w, borderRadius: 6, backgroundColor: color.line }, a]} />;
}
export function Notice({ title, children }: { title: string; children?: ReactNode }) { useTheme();
  return <View style={{ backgroundColor: color.goldSoft, borderRadius: radius.md, padding: space.lg, gap: 4 }} accessibilityRole="alert"><T v="label" c="goldDeep">{title}</T>{children}</View>;
}
export function ErrorText({ children }: { children?: ReactNode }) {
  useTheme();
  return children ? <View style={{ backgroundColor: color.dangerSoft, borderRadius: radius.md, padding: space.md }} accessibilityRole="alert" accessibilityLiveRegion="polite"><T v="small" c="danger" style={{ fontWeight: '600' }}>{children}</T></View> : null;
}

export type ToastData = { msg: string; undo?: () => void; k: number } | null;
export function Toast({ toast, onDismiss, bottom }: { toast: ToastData; onDismiss: () => void; bottom: number }) { useTheme();
  if (!toast) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom, alignItems: 'center' }}>
    <Animated.View key={toast.k} entering={FadeInDown.duration(380).easing(EASE_OUT)} exiting={FadeOut.duration(220)} style={s.toast} accessibilityLiveRegion="polite">
      <T v="small" c="white" style={{ flex: 1, paddingLeft: 4 }}>{toast.msg}</T>
      {toast.undo && <Tap onPress={() => { toast.undo?.(); }} accessibilityRole="button" accessibilityLabel="Desfazer" style={s.toastBtn}><T v="label" c="gold">Desfazer</T></Tap>}
      <Tap onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Fechar aviso" style={s.toastBtn} scale={0.9}><Icon name="x" size={18} c="white" /></Tap>
    </Animated.View>
    </View>
  );
}

// ---------- telas ----------
export { FadeIn };

const s = themed(() => StyleSheet.create({
  btn: { minHeight: TOUCH, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 44, paddingHorizontal: 16 },
  input: { minHeight: TOUCH, borderRadius: radius.md, borderWidth: 1.5, borderColor: color.line, backgroundColor: color.bg, flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  inputText: { flex: 1, minHeight: TOUCH - 3, paddingRight: 14, fontSize: 16, lineHeight: 22, color: color.ink, fontWeight: '500', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null) },
  eye: { width: TOUCH, height: TOUCH - 3, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: color.subtle, borderRadius: radius.md, padding: 3, gap: 2 },
  segItem: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  segOn: { backgroundColor: color.bg, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: color.line, justifyContent: 'center' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.muted, alignItems: 'center', justifyContent: 'center' },
  toast: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', backgroundColor: color.toast, borderRadius: radius.md, paddingLeft: 12, paddingRight: 4, minHeight: 52, shadowColor: '#0A2A40', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  toastBtn: { minWidth: 44, minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
}));

// ---------- movimento (curto e só onde ajuda a entender o que apareceu) ----------
// Entrada em cascata: cada item sobe 28 px, ganha um leve zoom e aparece em 700 ms; 90 ms entre um e outro.
// Só anima opacidade e transform (sem "layout animation"): no navegador esse recurso deixava os blocos em position:absolute.
export function Reveal({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) p.set(withDelay(Math.min(i, 10) * 90, withTiming(1, { duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1) })));
  }, [reduced, i, p]);
  const a = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * 28 }, { scale: 0.985 + 0.015 * p.get() }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

// Número que conta até o valor (mantém o valor final para leitores de tela). Sem movimento se o sistema pedir.
export function useCountUp(to: number, ms = 1200) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  const from = useRef(reduced ? to : 0);
  useEffect(() => {
    if (reduced) { setV(to); from.current = to; return; }
    const start = Date.now(), f = from.current;
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / ms);
      setV(Math.round(f + (to - f) * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p))));
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, reduced]);
  return v;
}
export function Count({ value, suffix = '', ...rest }: { value: number; suffix?: string } & Omit<TProps, 'children'>) {
  const n = useCountUp(value);
  return <T {...rest} num accessibilityLabel={`${value}${suffix}`}>{n}{suffix}</T>;
}
