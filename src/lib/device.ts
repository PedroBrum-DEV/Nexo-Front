import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Nome amigável deste aparelho, mostrado na lista de sessões ("Chrome no Windows", "iPhone 15 · app").
export function deviceName(): string {
  if (Platform.OS === 'web') {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navegador';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'computador';
    return `${browser} no ${os}`;
  }
  return `${Device.modelName || (Platform.OS === 'ios' ? 'iPhone' : 'Android')} · app`;
}
export const isMobileDevice = (name: string) => /iPhone|iPad|Android|app|Pixel|Galaxy|Samsung|Moto|Xiaomi/i.test(name) && !/no (Windows|macOS|Linux)/.test(name);
