import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { Pressable, View } from 'react-native';

export function SectionHeader({
  title,
  trailing,
  onTrailing,
}: {
  title: string;
  trailing?: string;
  onTrailing?: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={{
        paddingTop: 28,
        paddingBottom: 12,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
      }}
    >
      <ThemedText variant="section" family="serif">
        {title}
      </ThemedText>
      {trailing ? (
        <Pressable onPress={onTrailing} hitSlop={8}>
          <ThemedText variant="meta" family="mono" color={palette.ink3} style={{ letterSpacing: 0.5 }}>
            {trailing}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
