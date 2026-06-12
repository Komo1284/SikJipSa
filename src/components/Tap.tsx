import { durations } from '@/theme/animation';
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Disable tap feedback (e.g. for non-interactive wrappers). */
  noFeedback?: boolean;
  /** Tweakable peak compression. 0.96 by default — subtle but visible. */
  pressedScale?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Drop-in replacement for `<Pressable>` that adds a unified scale + opacity
 * tap feedback. Most of the app's buttons used to be silent on press; this
 * makes every tap feel like the button received the touch.
 */
export function Tap({ style, noFeedback, pressedScale = 0.96, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (!noFeedback) {
      scale.value = withTiming(pressedScale, { duration: durations.pressIn, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(0.85, { duration: durations.pressIn });
    }
    onPressIn?.(e);
  };
  const handleOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    if (!noFeedback) {
      scale.value = withTiming(1, { duration: durations.pressOut, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: durations.pressOut });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, animStyle] as unknown as StyleProp<ViewStyle>}
    />
  );
}
