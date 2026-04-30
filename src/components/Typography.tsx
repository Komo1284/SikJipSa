import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';

type Variant = 'hero' | 'screenTitle' | 'section' | 'subsection' | 'body' | 'meta' | 'tiny';
type Weight = 'regular' | 'medium' | 'semibold' | 'bold';
type Family = 'sans' | 'serif' | 'mono';

type Props = TextProps & {
  variant?: Variant;
  family?: Family;
  weight?: Weight;
  color?: string;
  italic?: boolean;
  uppercase?: boolean;
  style?: TextStyle | TextStyle[];
};

export function ThemedText({
  variant = 'body',
  family = 'sans',
  weight = 'regular',
  italic = false,
  uppercase = false,
  color,
  style,
  ...rest
}: Props) {
  const { palette, typography, weights, fonts, font } = useTheme();
  const t = typography[variant];

  let fontFamily = fonts.sans;
  if (family === 'serif') {
    // Default font (pretendard) uses InstrumentSerif for serif headings,
    // but that's a Latin-only face — Korean digits/glyphs fall back to the
    // system font. When the user picks a Korean-aware font option we route
    // serif text through `fonts.serif` so the preference actually applies.
    if (font === 'pretendard') fontFamily = italic ? weights.serifItalic : weights.serifRegular;
    else fontFamily = fonts.serif;
  } else if (family === 'mono') {
    fontFamily = weight === 'medium' ? weights.monoMedium : weights.monoRegular;
  } else if (font === 'pretendard') {
    fontFamily =
      weight === 'bold' ? weights.sansBold :
      weight === 'semibold' ? weights.sansSemibold :
      weight === 'medium' ? weights.sansMedium :
      weights.sansRegular;
  } else {
    fontFamily = fonts.sans;
  }

  const textStyle: TextStyle = {
    fontFamily,
    fontSize: t.size,
    lineHeight: t.lineHeight,
    ...('letterSpacing' in t ? { letterSpacing: (t as { letterSpacing?: number }).letterSpacing } : {}),
    color: color ?? palette.ink,
    ...(italic && family !== 'serif' ? { fontStyle: 'italic' } : {}),
    ...(uppercase ? { textTransform: 'uppercase' } : {}),
  };

  // Korean-only fonts (Gowun, Myeongjo) ship few Latin glyphs — when the
  // active font is one of those, hand Latin-only segments to the OS so they
  // render as the system Latin face rather than fall back to a generic blob.
  // RN's <Text> takes a single fontFamily, so the cleanest cross-platform
  // safety net is to set the family AND let the OS handle missing glyphs
  // (iOS does this gracefully). We just avoid declaring monospace/serif
  // overrides for Latin segments here.

  return <Text {...rest} style={[textStyle, style]} />;
}
