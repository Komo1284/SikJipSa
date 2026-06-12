import { useTheme } from '@/theme/ThemeProvider';
import React, { useEffect } from 'react';
import { View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * 로딩 자리표시 블록 — 첫 데이터 로딩 중 빈 화면 대신 화면 구조를
 * 미리 보여준다. opacity 펄스만 사용해 저비용.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const { palette } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [pulse]);

  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: palette.bg2 }, anim, style]}
    />
  );
}

/** TaskRow 모양의 스켈레톤 — 홈 '오늘 할 일' 첫 로딩용. */
export function SkeletonTaskRow() {
  const { palette, radii } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: palette.surface,
        padding: 12,
        borderRadius: radii.md,
      }}
    >
      <Skeleton width={56} height={56} radius={radii.sm} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="35%" height={11} />
      </View>
    </View>
  );
}

/** GridCard 모양의 스켈레톤 — 목록 첫 로딩용. */
export function SkeletonGridCard() {
  const { palette, radii } = useTheme();
  return (
    <View style={{ backgroundColor: palette.surface, borderRadius: radii.md, overflow: 'hidden' }}>
      <Skeleton width="100%" height={150} radius={0} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="65%" height={14} />
        <Skeleton width="40%" height={11} />
      </View>
    </View>
  );
}
