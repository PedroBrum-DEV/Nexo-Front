import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Sessão e contas de demonstração. No celular fica no cofre do sistema (Keychain/Keystore); na web, no localStorage.
const web = Platform.OS === 'web';
export const storage = {
  async get(key: string): Promise<string | null> {
    try { return web ? globalThis.localStorage?.getItem(key) ?? null : await SecureStore.getItemAsync(key); } catch { return null; }
  },
  async set(key: string, value: string): Promise<void> {
    try { if (web) globalThis.localStorage?.setItem(key, value); else await SecureStore.setItemAsync(key, value); } catch { /* armazenamento indisponível */ }
  },
  async del(key: string): Promise<void> {
    try { if (web) globalThis.localStorage?.removeItem(key); else await SecureStore.deleteItemAsync(key); } catch { /* ignore */ }
  },
};
export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await storage.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
