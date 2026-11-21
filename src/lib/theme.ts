// Tokens do painel. Modo "Operate" (Impeccable): uma família, cor contida, o acento só em ação e seleção.
// Claro e escuro: `color` é um objeto vivo; applyScheme() troca os valores e as telas se redesenham (ver ThemeContext).
export const brand = { name: 'Nexo' };

const light = {
  bg: '#FFFFFF', // superfícies: cartões, campos
  subtle: '#F4F8FB', // fundo de campos e áreas de apoio
  line: '#DCE7EF',
  ink: '#0A2A40',
  muted: '#4F6B80', // 5,6:1 sobre branco
  primary: '#0B5C8E', // texto branco sobre ele: 7,2:1
  primaryPressed: '#083F63',
  soft: '#E3F0F8',
  deep: '#0A4A73', // texto sobre soft
  gold: '#E0B040', // só preenchimento
  goldSoft: '#FBEFCB',
  goldDeep: '#6B4A06',
  success: '#1E7B4F',
  successSoft: '#DDF3E6',
  danger: '#B3261E',
  dangerSoft: '#FBE4E2',
  white: '#FFFFFF', // branco literal (ex.: fundo do QR code)
  page: '#F2F6F9', // fundo do painel (os cartões ficam sobre ele)
  navy: '#0A2A40', // menu lateral, barra do celular, painel de marca
  navySoft: 'rgba(255,255,255,0.09)',
  onNavy: '#FFFFFF',
  onNavyMuted: '#A9C1D2',
  onPrimary: '#FFFFFF', // texto sobre preenchimentos de ação
  placeholder: '#5F7889',
  borderHover: '#9CC0D6',
  ghost: 'rgba(255,255,255,0.5)',
  barSoft: '#6FA3C3',
  toast: '#0A2A40',
};

const dark: typeof light = {
  bg: '#112634',
  subtle: '#183347',
  line: '#26455A',
  ink: '#E7F0F6',
  muted: '#9AB2C3', // 6,7:1 sobre a superfície
  primary: '#5BB4EE', // texto escuro sobre ele: 7,4:1
  primaryPressed: '#86CAF5',
  soft: '#17405A',
  deep: '#A5D8F7',
  gold: '#E7B94E',
  goldSoft: '#3B3117',
  goldDeep: '#F3D27C',
  success: '#4CC38A',
  successSoft: '#12382B',
  danger: '#F28B82',
  dangerSoft: '#432322',
  white: '#FFFFFF',
  page: '#0A1822',
  navy: '#06121A',
  navySoft: 'rgba(255,255,255,0.09)',
  onNavy: '#FFFFFF',
  onNavyMuted: '#9FB9CA',
  onPrimary: '#05202E',
  placeholder: '#7D95A6',
  borderHover: '#3F7396',
  ghost: 'rgba(255,255,255,0.03)',
  barSoft: '#2F6286',
  toast: '#2A4A60',
};

export type Palette = typeof light;
export type ColorName = keyof Palette;
export type Scheme = 'light' | 'dark';
export const palettes: Record<Scheme, Palette> = { light, dark };

export const color: Palette = { ...light };
let current: Scheme = 'light';
export const getScheme = () => current;
export function applyScheme(s: Scheme) { current = s; Object.assign(color, palettes[s]); }

// Estilos que dependem da paleta: reconstruídos sozinhos quando o esquema muda.
export function themed<T extends object>(make: () => T): T {
  let cache: T | null = null, at: Scheme | '' = '';
  return new Proxy({} as T, { get(_, k) { if (!cache || at !== current) { cache = make(); at = current; } return (cache as Record<string | symbol, unknown>)[k]; } });
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const TOUCH = 48; // alvo mínimo (44 pt iOS, 48 dp Android)
export const TABBAR = 56;

// Escala fixa, razão ~1,2 (painel não usa tipo fluido).
export const type = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  title: { fontSize: 19, lineHeight: 26, fontWeight: '600', letterSpacing: -0.2 },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
} as const;
export type TypeName = keyof typeof type;
