import { useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { live, ping } from '../lib/api';
import { isOffline, subscribeNet } from '../lib/net';
import { Button, T } from './ui';
import { useTheme } from '../lib/ThemeContext';
import { color } from '../lib/theme';

/** Faixa no topo quando o servidor não responde. Some sozinha na próxima chamada que der certo. Só aparece com a API ligada (a demonstração funciona sem rede). */
export function NetworkBanner() {
  useTheme();
  const offline = useSyncExternalStore(subscribeNet, isOffline, isOffline);
  const [busy, setBusy] = useState(false);
  if (!live || !offline) return null;
  const retry = async () => { setBusy(true); await ping(); setBusy(false); };
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: color.goldSoft, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <View style={{ flex: 1, minWidth: 200 }}>
        <T v="label" style={{ color: color.goldDeep }}>Sem conexão com o servidor</T>
        <T v="small" style={{ color: color.goldDeep }}>O que você já vê continua na tela, mas mudanças só são salvas quando a conexão voltar.</T>
      </View>
      <Button label={busy ? 'Tentando…' : 'Tentar de novo'} variant="secondary" small full={false} loading={busy} onPress={retry} />
    </View>
  );
}
