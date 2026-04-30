import { HoverPressable } from '@/components/HoverPressable';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { View } from 'react-native';

type Variant = 'primary' | 'ghost' | 'dark';
type Size = 'sm' | 'md';

type Props = {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  disabled?: boolean;
};

export function Button({
  label, leftIcon, rightIcon, onPress,
  variant = 'primary', size = 'md', fullWidth = false, disabled = false,
}: Props) {
  const { palette } = useTheme();
  const padV = size === 'sm' ? 8 : 12;
  const padH = size === 'sm' ? 14 : 20;
  const fs = size === 'sm' ? 13 : 14;

  return (
    <HoverPressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed, focused }) => {
        const bg =
          variant === 'primary' ? (hovered ? palette.greenDeep : palette.green) :
          variant === 'dark'    ? palette.ink :
                                  'transparent';
        const fg =
          variant === 'ghost' ? palette.ink2 :
                                palette.bg;
        const borderColor =
          variant === 'ghost' ? (hovered ? palette.ink3 : palette.lineStrong) :
                                'transparent';
        const transform = pressed ? [{ scale: 0.98 }] : undefined;
        const focusRing = focused
          ? { shadowColor: palette.green, shadowOpacity: 0.3, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } }
          : undefined;

        return {
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: 8,
          paddingVertical: padV,
          paddingHorizontal: padH,
          borderRadius: 12,
          backgroundColor: bg,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor,
          alignSelf: fullWidth ? ('stretch' as const) : ('flex-start' as const),
          opacity: disabled ? 0.5 : 1,
          transform,
          ...focusRing,
          // Web focus outline via boxShadow ring (only applied in web via RN StyleSheet compat).
          ...(focused ? ({ boxShadow: `0 0 0 3px ${palette.greenSoft}` } as object) : {}),
          ...(variant === 'primary' ? ({ transitionDuration: '150ms', transitionProperty: 'background-color, transform' } as object) : {}),
        };
      }}
    >
      {leftIcon ? <View>{leftIcon}</View> : null}
      {label ? (
        <ThemedText
          variant="meta"
          weight={variant === 'ghost' ? 'medium' : 'semibold'}
          color={variant === 'ghost' ? palette.ink2 : palette.bg}
          style={{ fontSize: fs }}
        >
          {label}
        </ThemedText>
      ) : null}
      {rightIcon ? <View>{rightIcon}</View> : null}
    </HoverPressable>
  );
}
