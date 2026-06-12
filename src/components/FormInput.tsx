import { useTheme } from '@/theme/ThemeProvider';
import React, { forwardRef, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

/**
 * 폼 공용 텍스트 입력 — 포커스 시 테두리가 green 으로 바뀌어 지금 어떤
 * 필드를 편집 중인지 보여준다. add/edit 화면마다 복붙되던 inputStyle 을
 * 한 곳으로 모은 것이기도 하다. style prop 은 기본 스타일 위에 덮인다.
 */
export const FormInput = forwardRef<TextInput, TextInputProps>(function FormInput(
  { style, onFocus, onBlur, ...rest },
  ref,
) {
  const { palette, radii, weights } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={palette.ink3}
      {...rest}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[
        {
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: radii.sm,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: focused ? palette.green : palette.line,
          fontSize: 15,
          fontFamily: weights.sansRegular,
          color: palette.ink,
        },
        style,
      ]}
    />
  );
});
