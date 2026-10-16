export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnAccent: string;
  accent: string;
  accentPressed: string;
  /** Accent for text and icons on surfaces (differs from the fill colour in dark mode for contrast). */
  accentText: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
  marker: string;
  markerRing: string;
}

/**
 * Brand: deep navy text, clean light surfaces and the red of the Montenegrin flag as accent
 * (the gold of the flag lives in the icon). Because the accent is red, status colours form a
 * traffic light: green = parking valid, amber = expiring soon, danger red = expired.
 */
const light: Palette = {
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F5',
  surfaceRaised: '#FFFFFF',
  border: '#E1E6ED',
  borderStrong: '#C9D1DC',
  text: '#0E1A2B',
  textMuted: '#4D5B6E',
  textSubtle: '#7D899A',
  textOnAccent: '#FFFFFF',
  accent: '#C40308',
  accentPressed: '#A00207',
  accentText: '#C40308',
  accentSoft: '#FDECEC',
  success: '#17855A',
  successSoft: '#E1F4EA',
  warning: '#B86A00',
  warningSoft: '#FFF2DC',
  danger: '#B42318',
  dangerSoft: '#FDEAE7',
  overlay: 'rgba(8, 15, 26, 0.45)',
  shadow: '#0E1A2B',
  marker: '#C40308',
  markerRing: '#FFFFFF',
};

const dark: Palette = {
  background: '#0A111C',
  surface: '#121B28',
  surfaceMuted: '#1A2535',
  surfaceRaised: '#172231',
  border: '#243246',
  borderStrong: '#33445C',
  text: '#EEF2F8',
  textMuted: '#A7B3C4',
  textSubtle: '#76849A',
  textOnAccent: '#FFFFFF',
  accent: '#D92D2D',
  accentPressed: '#B82222',
  accentText: '#FF6B6B',
  accentSoft: '#3A1416',
  success: '#3DBA82',
  successSoft: '#123326',
  warning: '#F0A93B',
  warningSoft: '#3A2A10',
  danger: '#F97066',
  dangerSoft: '#3D1A18',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  marker: '#D92D2D',
  markerRing: '#0A111C',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Minimum touch target per platform accessibility guidelines. */
export const touchTarget = 44;

export const typography = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;
