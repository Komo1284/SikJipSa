import { Chip } from '@/components/Chip';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { nextActionLabelRecommended as nextActionLabel } from '@/utils/date';
import React from 'react';
import { View } from 'react-native';
import { Tap } from '@/components/Tap';

export function MiniPlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  const { palette, radii, shadows } = useTheme();
  return (
    <Tap
      onPress={onClick}
      style={{
        width: 150,
        backgroundColor: palette.surfaceRaised,
        borderRadius: radii.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.line,
        ...shadows.xs,
      }}
    >
      <View style={{ height: 130 }}>
        <PlantThumb plant={plant} style={{ width: '100%', height: '100%' }} size={150} />
      </View>
      <View style={{ padding: 12 }}>
        <ThemedText variant="meta" weight="semibold" style={{ fontSize: 13 }} numberOfLines={1}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="tiny" color={palette.ink3} numberOfLines={1} style={{ marginTop: 3, marginBottom: 8 }}>
          {plant.location}
        </ThemedText>
        <Chip tone="water">{nextActionLabel(plant)}</Chip>
      </View>
    </Tap>
  );
}
