import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '../lib/layout';
import { useTheme } from '../lib/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { color } from '../lib/theme';
import { Logo } from './Logo';
import { Reveal, T } from './ui';

// Computador: tela dividida (painel de marca à esquerda, formulário à direita). Celular: só o formulário.
function Waves() {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  useEffect(() => { if (!reduced) x.set(withRepeat(withTiming(1, { duration: 16000, easing: Easing.inOut(Easing.sin) }), -1, true)); }, [reduced, x]);
  const drift = useAnimatedStyle(() => ({ transform: [{ translateX: -60 * x.get() }] }));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
        <Circle cx={520} cy={120} r={260} fill={color.primary} opacity={0.28} />
        <Circle cx={80} cy={640} r={200} fill={color.primary} opacity={0.16} />
      </Svg>
      <Animated.View style={[{ position: 'absolute', left: -80, right: -80, bottom: 0, height: 260 }, drift]}>
        <Svg width="100%" height="100%" viewBox="0 0 1200 260" preserveAspectRatio="none">
          <Path d="M0 120 C150 60 300 180 450 120 S750 60 900 120 S1150 180 1200 120 V260 H0Z" fill="rgba(255,255,255,0.05)" />
          <Path d="M0 170 C150 110 300 230 450 170 S750 110 900 170 S1150 230 1200 170 V260 H0Z" fill="rgba(11,92,142,0.45)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function AuthFrame({ children }: { children: React.ReactNode }) {
  const { wide } = useLayout();
  useTheme();
  const insets = useSafeAreaInsets();
  if (!wide) {
    // celular: faixa azul-marinho com a marca e uma folha branca arredondada com o formulário
    return (
      <View style={{ flex: 1, backgroundColor: color.navy }}>
        <StatusBar style="light" />
        <View style={{ paddingTop: insets.top + 24, paddingBottom: 36, paddingHorizontal: 24, gap: 14, overflow: 'hidden' }}>
          <Waves />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Logo size={40} animate inverse /><ThemeToggle onNavy /></View>
          <Reveal i={3}><T c="onNavyMuted" style={{ fontSize: 15, lineHeight: 22 }}>Atendimento por IA no WhatsApp para a sua empresa.</T></Reveal>
        </View>
        <View style={{ flex: 1, backgroundColor: color.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }}>{children}</View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: color.bg }}>
      <View style={{ flex: 1, maxWidth: 640, minWidth: 440, backgroundColor: color.navy, overflow: 'hidden', padding: 56, justifyContent: 'space-between' }}>
        <Waves />
        <Logo size={48} animate inverse />
        <View style={{ gap: 20, maxWidth: 460 }}>
          <Reveal i={3}><T v="display" c="onNavy" style={{ fontSize: 40, lineHeight: 46, letterSpacing: -0.8 }}>Atendimento por IA no WhatsApp para a sua empresa.</T></Reveal>
          <Reveal i={4}><T c="onNavyMuted" style={{ fontSize: 17, lineHeight: 26 }}>Seus agentes respondem clientes, agendam horários e chamam você só quando algo precisa de uma decisão.</T></Reveal>
        </View>
        <View />
      </View>
      <View style={{ flex: 1 }}>{children}<View style={{ position: 'absolute', top: 16, right: 16 }}><ThemeToggle /></View></View>
    </View>
  );
}
