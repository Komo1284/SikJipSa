import { HoverPressable } from '@/components/HoverPressable';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { WaterButton } from '@/components/WaterButton';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { TODAY, daysBetween, effectiveNextWater, nextActionLabelRecommended as nextActionLabel } from '@/utils/date';
import React from 'react';
import { View } from 'react-native';

type Props = {
  plant: Plant;
  onOpen: () => void;
  onWater: (p: Plant) => void;
};

export function DesktopPlantCard({ plant, onOpen, onWater }: Props) {
  const { palette, radii, shadows } = useTheme();
  const dueSoon = daysBetween(TODAY, effectiveNextWater(plant)) <= 0;

  return (
    <HoverPressable
      onPress={onOpen}
      style={({ hovered, focused }) => ({
        backgroundColor: palette.surfaceRaised,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: focused ? 'transparent' : hovered ? palette.lineStrong : palette.line,
        overflow: 'hidden',
        transform: hovered ? [{ translateY: -3 }] : undefined,
        ...(hovered ? shadows.md : shadows.xs),
        ...(focused ? ({ boxShadow: `0 0 0 2px ${palette.green}` } as object) : {}),
      })}
    >
      <View style={{ aspectRatio: 1, position: 'relative' }}>
        <PlantThumb plant={plant} style={{ width: '100%', height: '100%' }} size={240} />
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <WaterButton plant={plant} onDone={onWater} size={36} />
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <ThemedText variant="meta" weight="semibold" numberOfLines={1} style={{ fontSize: 14, marginBottom: 2 }}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="tiny" italic numberOfLines={1} color={palette.ink3} style={{ fontSize: 11 }}>
          {plant.species}
        </ThemedText>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderColor: palette.line,
          }}
        >
          <ThemedText variant="tiny" color={palette.ink3} style={{ fontSize: 11 }}>
            {plant.location}
          </ThemedText>
          <ThemedText
            variant="tiny"
            family="mono"
            color={dueSoon ? palette.drop : palette.ink2}
            style={{ fontSize: 11 }}
          >
            {nextActionLabel(plant)}
          </ThemedText>
        </View>
      </View>
    </HoverPressable>
  );
}
