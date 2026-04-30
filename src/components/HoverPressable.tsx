import React, { useState } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

type State = { hovered: boolean; pressed: boolean; focused: boolean };

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((s: State) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((s: State) => React.ReactNode);
};

/**
 * RN Pressable doesn't surface hover/focus state reliably on web.
 * This wrapper exposes `{ hovered, pressed, focused }` so components can
 * express the web spec (hover translateY, focus ring, active scale).
 */
export function HoverPressable({ style, children, onHoverIn, onHoverOut, onPressIn, onPressOut, onFocus, onBlur, ...rest }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const s: State = { hovered, pressed, focused };
  const resolvedStyle = typeof style === 'function' ? style(s) : style;
  const resolvedChildren = typeof children === 'function' ? children(s) : children;

  return (
    <Pressable
      {...rest}
      style={resolvedStyle}
      onHoverIn={(e) => { setHovered(true); onHoverIn?.(e); }}
      onHoverOut={(e) => { setHovered(false); onHoverOut?.(e); }}
      onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    >
      {resolvedChildren}
    </Pressable>
  );
}
