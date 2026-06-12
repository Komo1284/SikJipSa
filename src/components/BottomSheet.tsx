import { durations } from '@/theme/animation';
import { useTheme } from '@/theme/ThemeProvider';
import React, { useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Optional max height ratio (0–1) of screen. */
  maxHeight?: number;
  children: React.ReactNode;
};

const SCREEN_H = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100;

export function BottomSheet({ visible, onClose, maxHeight = 0.9, children }: Props) {
  const { palette, radii, shadows } = useTheme();
  const translateY = useSharedValue(SCREEN_H);
  const backdropOpacity = useSharedValue(0);
  const startY = useSharedValue(0);

  // We render until the exit animation completes — otherwise tapping the
  // backdrop unmounts the Modal instantly (= no exit anim).
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  const ENTER = { duration: durations.sheetEnter, easing: Easing.out(Easing.cubic) };
  const EXIT  = { duration: durations.sheetExit, easing: Easing.in(Easing.cubic) };

  // Animate in/out when `visible` flips.
  useEffect(() => {
    if (visible) {
      translateY.value    = withTiming(0, ENTER);
      backdropOpacity.value = withTiming(1, ENTER);
    } else {
      backdropOpacity.value = withTiming(0, EXIT);
      translateY.value = withTiming(SCREEN_H, EXIT, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .onStart(() => { startY.value = translateY.value; })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      translateY.value = next < 0 ? next * 0.2 : next;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 800) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, ENTER);
      }
    });

  const cardStyle     = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.backdrop },
            backdropStyle,
          ]}
        />
        <Pressable
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // iOS Modal 안에서 KAV 가 입력 위치를 살짝 덜 잡아주는 케이스가 있어
          // 명시적인 offset 으로 마지막 라인이 키보드 뒤로 숨지 않게 보정.
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              {
                backgroundColor: palette.surface,
                borderTopLeftRadius: radii.lg,
                borderTopRightRadius: radii.lg,
                maxHeight: SCREEN_H * maxHeight,
                ...shadows.lg,
              },
              cardStyle,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
                <View
                  style={{
                    width: 40, height: 4, borderRadius: 2,
                    backgroundColor: palette.lineStrong,
                  }}
                />
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
