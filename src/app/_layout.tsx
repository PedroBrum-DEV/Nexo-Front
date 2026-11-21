import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/ThemeContext';
import { color } from '../lib/theme';
import { NetworkBanner } from '../components/NetworkBanner';

function Root() {
  const { ready } = useAuth();
  const { scheme } = useTheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: color.page }} />; // lendo a sessão guardada
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <NetworkBanner />
        <View style={{ flex: 1 }}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} /></View>
      </View>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </ThemeProvider>
  );
}
