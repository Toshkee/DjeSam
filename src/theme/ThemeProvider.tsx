import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import type { ThemePreference } from '@/features/settings/settings';

import { palettes, radius, spacing, typography, type ColorScheme, type Palette } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme>({
  scheme: 'light',
  colors: palettes.light,
  spacing,
  radius,
  typography,
});

export function ThemeProvider({ preference, children }: { preference: ThemePreference; children: ReactNode }) {
  // Forcing the native appearance keeps maps, alerts, pickers and the keyboard consistent.
  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const system = useColorScheme();
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo<Theme>(
    () => ({ scheme, colors: palettes[scheme], spacing, radius, typography }),
    [scheme],
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
