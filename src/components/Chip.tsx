import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { View } from 'react-native';

export type ChipTone = 'neutral' | 'water' | 'bloom' | 'warn' | 'green';
type Size = 'sm' | 'md';

export function Chip({
  children,
  tone = 'neutral',
  size = 'sm',
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  size?: Size;
}) {
  const { palette } = useTheme();

  const tones: Record<ChipTone, { bg: string; fg: string }> = {
    neutral: { bg: palette.greenBg, fg: palette.ink2 },
    water:   { bg: palette.dropSoft, fg: palette.drop },
    bloom:   { bg: palette.bloomSoft, fg: palette.bloom },
    warn:    { bg: palette.warnSoft, fg: palette.warn },
    green:   { bg: palette.greenSoft, fg: palette.greenDeep },
  };

  const padding = size === 'sm' ? { paddingVertical: 3, paddingHorizontal: 8 } : { paddingVertical: 5, paddingHorizontal: 10 };
  const fs = size === 'sm' ? 11 : 12;
  const t = tones[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: t.bg,
        borderRadius: 999,
        ...padding,
      }}
    >
      <ThemedText variant="meta" style={{ fontSize: fs, color: t.fg, lineHeight: fs + 4 }} weight="medium">
        {children}
      </ThemedText>
    </View>
  );
}
