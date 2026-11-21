import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLayout } from '../lib/layout';
import { color, space, themed } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';
import { Logo } from './Logo';
import ThemeToggle from './ThemeToggle';
import { usePalette } from './CommandPalette';
import UserAvatar from './UserAvatar';
import Bell from './Bell';
import { Icon, T, Tap } from './ui';

// Celular: barra azul-marinho no topo (marca + conta nas abas; voltar + título nas telas internas).
function MobileBar({ back, onBack, title }: { back?: boolean; onBack?: () => void; title?: string }) {
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  return (
    <View style={{ backgroundColor: color.navy, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 + insets.top }}>
      {back ? (
        <>
          <Tap accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={{ width: 44, height: 44, marginLeft: -8, alignItems: 'center', justifyContent: 'center' }} scale={0.9}><Icon name="chevron-left" size={26} c="onNavy" /></Tap>
          <T v="title" c="onNavy" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
        </>
      ) : (
        <>
          <Logo size={30} inverse />
          <View style={{ flex: 1 }} />
          <Tap accessibilityRole="search" accessibilityLabel="Buscar" onPress={palette.show} scale={0.88} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Icon name="search" size={20} c="onNavyMuted" /></Tap>
          <Bell />
          <ThemeToggle onNavy />
          <Tap accessibilityRole="button" accessibilityLabel="Minha conta" onPress={() => router.navigate('/conta')} scale={0.92} hitSlop={8}><UserAvatar size={38} /></Tap>
        </>
      )}
    </View>
  );
}

export function Screen({ title, right, children, footer, back, scroll = true, onBack, tabbed, width = 960, center, plain }: {
  title?: string; right?: ReactNode; children: ReactNode; footer?: ReactNode; back?: boolean; scroll?: boolean; onBack?: () => void; tabbed?: boolean;
  width?: number; center?: boolean; plain?: boolean; // width: largura máxima no computador; center: centraliza na vertical (login); plain: fundo branco (login)
}) {
  const insets = useSafeAreaInsets();
  const { wide, pad } = useLayout();
  const { scheme } = useTheme(); // ao trocar o tema o conteúdo se redesenha com as cores novas
  const [replay, setReplay] = useState(0);
  useFocusEffect(useCallback(() => { if (tabbed) setReplay((x) => x + 1); }, [tabbed])); // abas: a entrada toca de novo a cada visita
  const bg = plain ? color.bg : color.page;
  const bar = !wide && !plain && (tabbed || back); // celular: barra azul no topo
  const inBar = bar && back; // título dentro da barra
  const col = { width: '100%', maxWidth: width, alignSelf: 'center', gap: wide ? space.xl : space.lg } as const;
  const body = (
    <>
      {back && wide && <Tap accessibilityRole="button" accessibilityLabel="Voltar" onPress={onBack} style={s.back} scale={0.92}><Icon name="chevron-left" size={26} /></Tap>}
      {inBar ? (right ? <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>{right}</View> : null) : (title || right) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 }}>
          {title ? <T v="display" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</T> : <View />}
          {right}
        </View>
      ) : null}
      {children}
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: bar || plain ? 0 : insets.top }}>
      {bar && <StatusBar style="light" />}
      {bar && <MobileBar back={back} onBack={onBack} title={title} />}
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ flexGrow: 1, justifyContent: center && wide ? 'center' : 'flex-start', padding: pad, paddingTop: bar ? 20 : back ? 4 : wide ? 40 : 16, paddingBottom: (footer || tabbed ? 24 : insets.bottom + 24) + (wide ? 24 : 0) }}>
          <View key={`${replay}-${scheme}`} style={col}>{body}</View>
        </ScrollView>
      ) : <View style={{ flex: 1, padding: pad }}><View style={col}>{body}</View></View>}
      {footer && (
        <View style={[s.footer, { paddingBottom: tabbed ? 12 : Math.max(insets.bottom, 12), paddingHorizontal: pad }]}>
          <View style={{ width: '100%', maxWidth: width, alignSelf: 'center', flexDirection: 'row', gap: 12 }}>{footer}</View>
        </View>
      )}
    </View>
  );
}

const s = themed(() => StyleSheet.create({
  back: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, backgroundColor: color.bg },
}));
