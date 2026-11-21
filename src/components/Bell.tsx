import { View } from 'react-native';
import { router } from 'expo-router';
import { useNotifs } from '../lib/notifs';
import { color, radius } from '../lib/theme';
import { Icon, T, Tap } from './ui';

/** Sino do topo (celular) com o marcador de avisos não lidos. */
export default function Bell() {
  const { unread } = useNotifs();
  return (
    <Tap accessibilityRole="button" accessibilityLabel={unread ? `Avisos, ${unread} não ${unread === 1 ? 'lido' : 'lidos'}` : 'Avisos'} onPress={() => router.navigate('/avisos')} scale={0.88} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="bell" size={20} c="onNavyMuted" />
      {unread > 0 && (
        <View style={{ position: 'absolute', top: 5, right: 3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: radius.pill, backgroundColor: color.gold, alignItems: 'center', justifyContent: 'center' }}>
          <T v="caption" style={{ fontWeight: '800', fontSize: 11, lineHeight: 14, color: color.ink }} num>{unread > 99 ? '99+' : unread}</T>
        </View>
      )}
    </Tap>
  );
}
