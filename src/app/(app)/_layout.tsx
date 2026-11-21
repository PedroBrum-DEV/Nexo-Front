import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useLayout } from '../../lib/layout';
import { useTheme } from '../../lib/ThemeContext';
import { AppProvider, useApp } from '../../lib/store';
import { NotifProvider } from '../../lib/notifs';
import { color, TABBAR } from '../../lib/theme';
import Sidebar from '../../components/Sidebar';
import { PaletteProvider } from '../../components/CommandPalette';
import { Toast } from '../../components/ui';

// Computador (>= 900 px): menu lateral fixo + conteúdo. Celular: pilha de telas com a barra de abas embaixo.
function Shell() {
  const { toast, dismiss } = useApp();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  useTheme(); // redesenha ao trocar o tema
  return (
    <PaletteProvider>
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: wide ? color.page : color.bg }}>
      {wide && <Sidebar />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: wide ? color.page : color.bg } }} />
        <Toast toast={toast} onDismiss={dismiss} bottom={wide ? 24 : insets.bottom + TABBAR + 20} />
      </View>
    </View>
    </PaletteProvider>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  return <AppProvider><NotifProvider><Shell /></NotifProvider></AppProvider>;
}
