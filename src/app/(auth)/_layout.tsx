import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { color } from '../../lib/theme';
import { useTheme } from '../../lib/ThemeContext';

export default function AuthLayout() {
  const { user } = useAuth();
  useTheme();
  if (user) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: color.bg } }} />;
}
