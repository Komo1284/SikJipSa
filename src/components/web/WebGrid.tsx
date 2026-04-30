import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  cols?: number;
  gap?: number;
  minCol?: number | string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Desktop-only CSS grid wrapper. Mirrors the prototype's
 * `repeat(cols, minmax(0, 1fr))`, which is the only reliable way to get N
 * equal columns on RN Web — flex + percentage widths round-trip through the
 * browser and the last card wraps when the math is off by <1px.
 *
 * Falls back to flexDirection: row on native (we never actually render this
 * on native — desktop variants are gated by `useResponsive().isDesktop`).
 */
export function WebGrid({ children, cols = 4, gap = 16, minCol = 0, style }: Props) {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(${typeof minCol === 'number' ? `${minCol}px` : minCol}, 1fr))`,
    gap,
  } as unknown as ViewStyle;

  return <View style={[gridStyle, style]}>{children}</View>;
}
