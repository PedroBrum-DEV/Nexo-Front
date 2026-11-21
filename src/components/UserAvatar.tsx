import { Image, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import avatars from '../lib/avatars.json';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';
import { color } from '../lib/theme';
import { useTheme } from '../lib/ThemeContext';

export const PRESETS = avatars as { id: string; name: string; svg: string }[];

// Foto de perfil: foto enviada, avatar pronto ou iniciais (quando ainda não escolheu nada).
export function AvatarView({ choice, name, size = 40 }: { choice: import('../lib/auth').AvatarChoice; name: string; size?: number }) {
  useTheme();
  const box = { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' as const };
  if (choice?.kind === 'photo') return <Image source={{ uri: choice.uri }} style={box} accessibilityIgnoresInvertColors accessibilityLabel="Foto de perfil" />;
  if (choice?.kind === 'preset') {
    const p = PRESETS.find((x) => x.id === choice.id);
    if (p) return <View style={box} accessibilityLabel={`Avatar ${p.name}`}><SvgXml xml={p.svg} width={size} height={size} /></View>;
  }
  return (
    <View style={[box, { backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: color.deep, fontWeight: '700', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

// O avatar de quem está logado.
export default function UserAvatar({ size = 40 }: { size?: number }) {
  useTheme();
  const { user, avatar } = useAuth();
  const name = user?.type === 'cnpj' ? user.company || user.name : user?.name || '';
  return <AvatarView choice={avatar} name={name} size={size} />;
}
