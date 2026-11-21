import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyScheme, color, palettes, type Scheme } from './theme';

// Modo de aparência: segue o sistema (padrão), claro ou escuro. A escolha fica guardada no aparelho.
export type Mode = 'system' | 'light' | 'dark';
type Ctx = { mode: Mode; scheme: Scheme; setMode: (m: Mode) => void; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ mode: 'system', scheme: 'light', setMode: () => {}, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);
const KEY = 'nexo.theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');
  const [loaded, setLoaded] = useState(false);
  const scheme: Scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  applyScheme(scheme); // antes de os filhos desenharem, para já pegarem as cores certas

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'system') setModeState(v); }).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => { if (Platform.OS === 'web' && typeof document !== 'undefined') document.body.style.backgroundColor = palettes[scheme].page; }, [scheme]);

  const setMode = useCallback((m: Mode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); }, []);
  const toggle = useCallback(() => setMode(scheme === 'dark' ? 'light' : 'dark'), [scheme, setMode]);
  const value = useMemo(() => ({ mode, scheme, setMode, toggle }), [mode, scheme, setMode, toggle]);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: color.page }} />;
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
