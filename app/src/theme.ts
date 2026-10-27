import { useMemo } from 'react';
import { Platform, type TextStyle, useColorScheme } from 'react-native';
import { useSettings } from './state/SettingsContext';

export interface Palette {
  /** Screen background. */
  background: string;
  /** Cards, pills and round buttons that float on the background. */
  surface: string;
  /** Subtle fills: user bubbles, pressed rows, inputs. */
  muted: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** High-contrast fill (black in light mode) for the Voice/Send buttons. */
  inverse: string;
  onInverse: string;
  accent: string;
  onAccent: string;
  danger: string;
  codeBackground: string;
  overlay: string;
  shadow: string;
}

const light: Omit<Palette, 'accent' | 'onAccent'> = {
  background: '#F9F9F9',
  surface: '#FFFFFF',
  muted: '#EFEFEF',
  border: '#E3E3E3',
  textPrimary: '#0D0D0D',
  textSecondary: '#5D5D5D',
  textMuted: '#9A9A9A',
  inverse: '#0D0D0D',
  onInverse: '#FFFFFF',
  danger: '#C62828',
  codeBackground: '#F2F2F2',
  overlay: 'rgba(0, 0, 0, 0.45)',
  shadow: '#000000',
};

const dark: Omit<Palette, 'accent' | 'onAccent'> = {
  background: '#212121',
  surface: '#2F2F2F',
  muted: '#3A3A3A',
  border: '#3D3D3D',
  textPrimary: '#ECECEC',
  textSecondary: '#B4B4B4',
  textMuted: '#8A8A8A',
  inverse: '#FFFFFF',
  onInverse: '#0D0D0D',
  danger: '#FF6B6B',
  codeBackground: '#171717',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const ACCENTS = {
  purple: { label: 'Purple', color: '#7C5CFF' },
  blue: { label: 'Blue', color: '#2F6BFF' },
  green: { label: 'Green', color: '#10A37F' },
  orange: { label: 'Orange', color: '#F26B1D' },
  black: { label: 'Black', color: '' }, // follows the theme's inverse colour
} as const;

export type AccentName = keyof typeof ACCENTS;
export type Appearance = 'system' | 'light' | 'dark';

export function useTheme() {
  const { settings } = useSettings();
  const system = useColorScheme();
  const isDark = settings.appearance === 'system' ? system === 'dark' : settings.appearance === 'dark';

  return useMemo(() => {
    const base = isDark ? dark : light;
    const accent = settings.accent === 'black' ? base.inverse : ACCENTS[settings.accent].color;
    const onAccent = settings.accent === 'black' ? base.onInverse : '#FFFFFF';
    return { isDark, colors: { ...base, accent, onAccent } as Palette };
  }, [isDark, settings.accent]);
}

/** Builds a StyleSheet from the current palette, rebuilt only when the theme changes. */
export function useStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};

/** Soft floating shadow used by ChatGPT-style round buttons and pills. */
export const floating = (colors: Palette) => ({
  backgroundColor: colors.surface,
  shadowColor: colors.shadow,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
});

/** Hides the browser focus ring on web text inputs (the pill/field already shows focus). */
export const noFocusRing: TextStyle =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : {};
