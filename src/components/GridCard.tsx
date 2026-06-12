import { Chip } from '@/components/Chip';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { nextActionLabelRecommended as nextActionLabel, plantStatusRecommended as plantStatus } from '@/utils/date';
import React from 'react';
import { View } from 'react-native';
import { Tap } from '@/components/Tap';

export function GridCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  const { palette, radii, shadows } = useTheme();
  const st = plantStatus(plant);
  const tone = st === 'overdue' ? 'warn' : st === 'today' ? 'water' : 'neutral';
  const dotColor =
    st === 'overdue' ? palette.warn :
    st === 'today'   ? palette.drop :
    st === 'soon'    ? palette.bloom :
    'transparent';

  return (
    <Tap
      onPress={onClick}
      style={{
        flex: 1,
        backgroundColor: palette.surfaceRaised,
        borderRadius: radii.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: palette.line,
        ...shadows.xs,
      }}
    >
      <View style={{ aspectRatio: 1, position: 'relative' }}>
        <PlantThumb plant={plant} style={{ width: '100%', height: '100%' }} size={200} />
        {st !== 'ok' ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: dotColor,
              borderWidth: 2,
              borderColor: palette.surfaceRaised,
            }}
          />
        ) : null}
      </View>
      <View style={{ padding: 12 }}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1} style={{ fontSize: 14 }}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} numberOfLines={1} style={{ marginTop: 2, marginBottom: 8 }}>
          {plant.location}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Chip tone={tone}>{nextActionLabel(plant)}</Chip>
          {plant.recommendationDelta != null && plant.recommendationDelta !== 0 ? (
            <ThemedText
              variant="tiny"
              color={plant.recommendationDelta > 0 ? palette.bloom : palette.drop}
              style={{ fontSize: 11 }}
            >
              {plant.recommendationDelta > 0 ? `↑ +${plant.recommendationDelta}` : `↓ ${plant.recommendationDelta}`}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Tap>
  );
}
