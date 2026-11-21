import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { brand } from '../lib/theme';

const BRAND_BLUE = '#0B5C8E'; // o logo mantém as cores da marca nos dois temas
const BRAND_GOLD = '#E0B040';
import { T } from './ui';

// Símbolo: balão de conversa + onda + ponto dourado. Com `animate`, o balão entra, a onda é desenhada e o ponto aparece.
const BUBBLE = 'M17 4h14c7.2 0 13 5.8 13 13v8c0 7.2-5.8 13-13 13H22.5L11 44.5l2.2-8.6C8 34.5 4 30.2 4 25v-8C4 9.8 9.8 4 17 4z';
const WAVE = 'M12.5 22.5c3-6 6.3-6 9.5 0s6.5 6 9.5 0';
const WAVE_LEN = 27.4;
const AnimPath = Animated.createAnimatedComponent(Path);
const AnimCircle = Animated.createAnimatedComponent(Circle);
const OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function LogoMark({ size = 32, animate = false, inverse = false }: { size?: number; animate?: boolean; inverse?: boolean }) {
  const reduced = useReducedMotion();
  const still = !animate || reduced;
  const bubble = useSharedValue(still ? 1 : 0);
  const wave = useSharedValue(still ? 1 : 0);
  const dot = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    bubble.set(withTiming(1, { duration: 450, easing: OUT }));
    wave.set(withDelay(250, withTiming(1, { duration: 800, easing: OUT })));
    dot.set(withDelay(900, withTiming(1, { duration: 350, easing: OUT })));
  }, [still, bubble, wave, dot]);
  const pb = useAnimatedProps(() => ({ opacity: bubble.get() }));
  const pw = useAnimatedProps(() => ({ strokeDashoffset: WAVE_LEN * (1 - wave.get()), opacity: wave.get() > 0 ? 1 : 0 }));
  const pd = useAnimatedProps(() => ({ opacity: dot.get() }));
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <AnimPath d={BUBBLE} fill={inverse ? '#fff' : BRAND_BLUE} animatedProps={pb} />
      <AnimPath d={WAVE} fill="none" stroke={inverse ? BRAND_BLUE : '#fff'} strokeWidth={3.4} strokeLinecap="round" strokeDasharray={[WAVE_LEN, WAVE_LEN]} animatedProps={pw} />
      <AnimCircle cx={36} cy={22.5} r={2.4} fill={BRAND_GOLD} animatedProps={pd} />
    </Svg>
  );
}

export function Logo({ size = 40, animate = false, inverse = false }: { size?: number; animate?: boolean; inverse?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityRole="image" accessibilityLabel={brand.name}>
      <LogoMark size={size} animate={animate} inverse={inverse} />
      <T v="title" c={inverse ? 'onNavy' : 'ink'} style={{ fontSize: 20, fontWeight: '800' }}>{brand.name}</T>
    </View>
  );
}
