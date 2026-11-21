import { useWindowDimensions } from 'react-native';

// Computador e tablet na horizontal (>= 900 px) usam menu lateral; abaixo disso, barra inferior.
export const WIDE = 900;
export function useLayout() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  return { width, wide, pad: wide ? 40 : 20 };
}
