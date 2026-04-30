import { ThemedText } from '@/components/Typography';
import { DesktopHeader } from '@/components/web/DesktopHeader';
import { DesktopPlantCard } from '@/components/web/DesktopPlantCard';
import { WebGrid } from '@/components/web/WebGrid';
import { usePlantStore } from '@/store/plants';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';

export function DesktopList() {
  const { palette } = useTheme();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const waterPlant = usePlantStore((s) => s.waterPlant);

  const spaceFilter = useUIStore((s) => s.spaceFilter);
  const query = useUIStore((s) => s.query);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants.filter((p) => {
      if (spaceFilter !== 'all' && p.location !== spaceFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q);
    });
  }, [plants, spaceFilter, query]);

  const title =
    spaceFilter === 'all' ? '내 식물 · 전체' : spaceFilter;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
      <DesktopHeader title={title} />

      <ThemedText
        variant="tiny"
        family="mono"
        uppercase
        color={palette.ink3}
        style={{ letterSpacing: 1.3, marginBottom: 14 }}
      >
        목록 · {filtered.length}
      </ThemedText>

      <WebGrid cols={4} gap={16}>
        {filtered.map((p) => (
          <DesktopPlantCard
            key={p.id}
            plant={p}
            onOpen={() => router.push(`/plant/${p.id}` as never)}
            onWater={() => waterPlant(p.id)}
          />
        ))}
      </WebGrid>
    </ScrollView>
  );
}
