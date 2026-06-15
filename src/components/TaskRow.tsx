import { Chip } from '@/components/Chip';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { WaterButton } from '@/components/WaterButton';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { nextActionLabelRecommended as nextActionLabel, plantStatusRecommended as plantStatus } from '@/utils/date';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Tap } from '@/components/Tap';

export function TaskRow({
  plant,
  onOpen,
  onWater,
}: {
  plant: Plant;
  onOpen: () => void;
  onWater: (p: Plant) => void;
}) {
  const { t } = useTranslation();
  const { palette, radii, shadows } = useTheme();
  const st = plantStatus(plant);
  const tone = st === 'overdue' ? 'warn' : st === 'today' ? 'water' : 'neutral';

  return (
    <Tap
      onPress={onOpen}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: palette.surfaceRaised,
        padding: 12,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.line,
        ...shadows.xs,
      }}
    >
      <PlantThumb plant={plant} size={56} radius={radii.sm} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 2 }}>
          {plant.light ? `${plant.location} · ${plant.light}` : plant.location}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Chip tone={tone}>{t('components.taskRow.water', { label: nextActionLabel(plant) })}</Chip>
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
      <WaterButton plant={plant} onDone={onWater} />
    </Tap>
  );
}
