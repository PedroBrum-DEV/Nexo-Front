import { useTheme } from '../lib/ThemeContext';
import { haptic, Icon, Tap } from './ui';

// Botão de lua/sol: alterna entre claro e escuro.
export default function ThemeToggle({ onNavy }: { onNavy?: boolean }) {
  const { scheme, toggle } = useTheme();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={scheme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'} onPress={() => { haptic.select(); toggle(); }} scale={0.88} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
      <Icon name={scheme === 'dark' ? 'sun' : 'moon'} size={20} c={onNavy ? 'onNavyMuted' : 'muted'} />
    </Tap>
  );
}
