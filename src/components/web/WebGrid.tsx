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
  // minCol 이 지정되면 고정 열 수 대신 auto-fill 로 컨테이너 폭에 맞춰
  // 열 수가 늘고 준다 — 와이드 모니터에서 cols={4} 고정이 카드를
  // 과하게 키우던 문제 해소.
  const template = minCol
    ? `repeat(auto-fill, minmax(${typeof minCol === 'number' ? `${minCol}px` : minCol}, 1fr))`
    : `repeat(${cols}, minmax(0, 1fr))`;
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: template,
    gap,
  } as unknown as ViewStyle;

  return <View style={[gridStyle, style]}>{children}</View>;
}
