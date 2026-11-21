import { Platform, Share } from 'react-native';
/** Copia um texto. Na web usa a área de transferência; no celular abre o menu de compartilhar (sem depender de módulo nativo extra). Devolve true se copiou. */
export async function copyText(text: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  try { await Share.share({ message: text }); } catch { /* o usuário fechou o menu */ }
  return false;
}
