import { ThemedText } from '@/components/Typography';
import { useToastStore } from '@/store/toast';
import { durations } from '@/theme/animation';
import { useTheme } from '@/theme/ThemeProvider';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

export function ToastHost() {
  const { palette, shadows, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 16,
        right: 16,
        zIndex: 1000,
        gap: 10,
      }}
    >
      {toasts.map((t) => {
        const tone =
          t.kind === 'success' ? { bg: palette.greenBg, fg: palette.greenDeep, Icon: CheckCircle2 } :
          t.kind === 'error'   ? { bg: palette.warnSoft, fg: palette.warn, Icon: AlertCircle } :
                                 { bg: palette.surfaceRaised, fg: palette.ink2, Icon: Info };
        const Icon = tone.Icon;
        return (
          <Animated.View key={t.id} entering={FadeInUp.duration(durations.enter)} exiting={FadeOutUp.duration(durations.exit)}>
            <Pressable
              onPress={() => dismiss(t.id)}
              style={{
                backgroundColor: tone.bg,
                borderRadius: radii.md,
                paddingVertical: 16,
                paddingHorizontal: 18,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderWidth: 1,
                borderColor: palette.line,
                ...shadows.md,
              }}
            >
              <Icon size={22} color={tone.fg} strokeWidth={2} />
              <ThemedText
                variant="body"
                weight="medium"
                color={tone.fg}
                style={{ flex: 1, fontSize: 15, lineHeight: 22 }}
              >
                {t.message}
              </ThemedText>
              {t.action ? (
                <Pressable
                  onPress={() => {
                    dismiss(t.id);
                    t.action!.onPress();
                  }}
                  hitSlop={8}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: radii.sm,
                    backgroundColor: palette.surfaceRaised,
                    borderWidth: 1,
                    borderColor: palette.line,
                  }}
                >
                  <ThemedText variant="meta" weight="semibold" color={tone.fg}>
                    {t.action.label}
                  </ThemedText>
                </Pressable>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
