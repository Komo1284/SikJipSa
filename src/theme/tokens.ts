/**
 * RN mirror of prototype/tokens.css — the single source of truth.
 * If the CSS changes, update this file to match, keyed 1:1.
 */

export type ThemeMode = 'light' | 'dark';
export type AccentKey = 'green' | 'sage' | 'ochre' | 'forest';
export type FontKey = 'pretendard' | 'gowun' | 'myeongjo';

export type Palette = {
  bg: string;
  bg2: string;
  surface: string;
  surfaceRaised: string;
  ink: string;
  ink2: string;
  ink3: string;
  ink4: string;
  line: string;
  lineStrong: string;

  green: string;
  greenDeep: string;
  greenMoss: string;
  greenSoft: string;
  greenBg: string;

  earth: string;
  earthDeep: string;
  earthSoft: string;

  drop: string;
  dropSoft: string;
  bloom: string;
  bloomSoft: string;
  warn: string;
  warnSoft: string;
};

const LIGHT: Palette = {
  bg: '#F5F1EA',
  bg2: '#EDE6D8',
  surface: '#FBF8F1',
  surfaceRaised: '#FFFFFF',
  ink: '#1F1F1D',
  ink2: '#4A4A46',
  ink3: '#8A8880',
  ink4: '#C2BFB4',
  line: 'rgba(31,31,29,0.08)',
  lineStrong: 'rgba(31,31,29,0.16)',

  green: '#2D4A2B',
  greenDeep: '#1E3220',
  greenMoss: '#4A6A3A',
  greenSoft: '#C8D5B4',
  greenBg: '#E8E8DC',

  earth: '#8B6F47',
  earthDeep: '#5E4A2E',
  earthSoft: '#D9C7A8',

  drop: '#4A7FA8',
  dropSoft: '#CFDEE8',
  bloom: '#B87D4B',
  bloomSoft: '#E8D4BC',
  warn: '#B84B4B',
  warnSoft: '#F2DBD8',
};

const DARK: Palette = {
  bg: '#15181A',
  bg2: '#1C2020',
  surface: '#1F2424',
  surfaceRaised: '#252A2A',
  ink: '#EFEBE2',
  ink2: '#BCB8AE',
  ink3: '#8A877E',
  ink4: '#4F4D46',
  line: 'rgba(239,235,226,0.08)',
  lineStrong: 'rgba(239,235,226,0.14)',

  green: '#8ABF6A',
  greenDeep: '#6BA04A',
  greenMoss: '#A8C488',
  greenSoft: '#3A4A32',
  greenBg: '#1F2A1F',

  earth: '#C9A57A',
  earthDeep: '#8B6F47',
  earthSoft: '#3A2D1E',

  drop: '#7AAED1',
  dropSoft: '#2A3842',
  bloom: '#D49A6A',
  bloomSoft: '#3A2D1E',
  warn: '#D16B6B',
  warnSoft: '#3A1F1D',
};

const ACCENTS: Record<AccentKey, Record<ThemeMode, { green: string; greenDeep: string }>> = {
  green:  { light: { green: '#2D4A2B', greenDeep: '#1E3220' }, dark: { green: '#8ABF6A', greenDeep: '#6BA04A' } },
  sage:   { light: { green: '#6A8A5A', greenDeep: '#4A6A3A' }, dark: { green: '#B2C9A0', greenDeep: '#8FAC7A' } },
  ochre:  { light: { green: '#B8864B', greenDeep: '#8E6532' }, dark: { green: '#E2B57D', greenDeep: '#C9975E' } },
  forest: { light: { green: '#1A3D2E', greenDeep: '#0F2A1E' }, dark: { green: '#6DAF8A', greenDeep: '#4B8F6A' } },
};

export function buildPalette(mode: ThemeMode, accent: AccentKey): Palette {
  const base = mode === 'dark' ? DARK : LIGHT;
  const { green, greenDeep } = ACCENTS[accent][mode];
  return { ...base, green, greenDeep };
}

export const radii = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
} as const;

export const spacing = {
  '4': 4, '8': 8, '12': 12, '16': 16, '20': 20,
  '24': 24, '32': 32, '40': 40, '56': 56, '72': 72,
} as const;

/**
 * iOS shadows split into shadowColor/offset/opacity/radius;
 * Android gets an `elevation` that reads close to the CSS shadow visually.
 */
export const shadows = {
  xs: {
    shadowColor: '#1F1F1D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1F1F1D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1F1F1D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

export const fontFamilies: Record<FontKey, { sans: string; serif: string; mono: string }> = {
  pretendard: {
    sans: 'NotoSansKR_500Medium',
    serif: 'InstrumentSerif_400Regular',
    mono: 'JetBrainsMono_500Medium',
  },
  gowun: {
    // 단정한 손글씨 톤 — 식물·일기 같은 따뜻한 앱에 잘 맞음
    sans: 'GowunDodum_400Regular',
    serif: 'InstrumentSerif_400Regular',
    mono: 'JetBrainsMono_500Medium',
  },
  myeongjo: {
    // 세리프 한글 — 차분하고 클래식한 느낌
    sans: 'NanumMyeongjo_400Regular',
    serif: 'NanumMyeongjo_700Bold',
    mono: 'JetBrainsMono_500Medium',
  },
};

export const fontWeights = {
  sansRegular: 'NotoSansKR_400Regular',
  sansMedium: 'NotoSansKR_500Medium',
  sansSemibold: 'NotoSansKR_600SemiBold',
  sansBold: 'NotoSansKR_700Bold',
  serifRegular: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

/** Typography scale — see README §Design Tokens. */
export const typography = {
  hero:        { size: 42, lineHeight: 46, letterSpacing: -0.84 },
  screenTitle: { size: 30, lineHeight: 34, letterSpacing: -0.3 },
  section:     { size: 22, lineHeight: 28, letterSpacing: -0.22 },
  subsection:  { size: 18, lineHeight: 24, letterSpacing: -0.18 },
  body:        { size: 15, lineHeight: 22 },
  meta:        { size: 13, lineHeight: 18 },
  tiny:        { size: 11, lineHeight: 15, letterSpacing: 0.66 },
} as const;
