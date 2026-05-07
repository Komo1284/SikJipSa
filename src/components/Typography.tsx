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
  family: _family = 'sans',
  weight = 'regular',
  italic = false,
  uppercase = false,
  color,
  style,
  ...rest
}: Props) {
  const { palette, typography, weights } = useTheme();
  const t = typography[variant];

  // 폰트는 Pretendard(NotoSansKR) 한 가족으로 통일. `family` prop 은
  // 기존 호출처 호환을 위해 받기만 하고 무시한다. 굵기만 분기.
  const fontFamily =
    weight === 'bold' ? weights.sansBold :
    weight === 'semibold' ? weights.sansSemibold :
    weight === 'medium' ? weights.sansMedium :
    weights.sansRegular;

  const textStyle: TextStyle = {
    fontFamily,
    fontSize: t.size,
    lineHeight: t.lineHeight,
    ...('letterSpacing' in t ? { letterSpacing: (t as { letterSpacing?: number }).letterSpacing } : {}),
    color: color ?? palette.ink,
    ...(italic ? { fontStyle: 'italic' } : {}),
    ...(uppercase ? { textTransform: 'uppercase' } : {}),
  };

  return <Text {...rest} style={[textStyle, style]} />;
}
