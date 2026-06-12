import { EmptyState } from '@/components/EmptyState';
import { ThemedText } from '@/components/Typography';
import { DesktopHeader } from '@/components/web/DesktopHeader';
import { DesktopPlantCard } from '@/components/web/DesktopPlantCard';
import { WebGrid } from '@/components/web/WebGrid';
import { usePlantStore } from '@/store/plants';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useRouter } from 'expo-router';
import { SearchX, Sprout } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

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

      {filtered.length === 0 ? (
        <View style={{ paddingTop: 48, maxWidth: 480, alignSelf: 'center', width: '100%' }}>
          {plants.length === 0 ? (
            <EmptyState
              compact
              icon={<Sprout size={32} color={palette.green} strokeWidth={1.6} />}
              title="아직 등록된 식물이 없어요"
              description="식물을 추가하여 나만의 관리를 시작해보세요!"
              actionLabel="식물 추가하기"
              onAction={() => router.push('/add' as never)}
            />
          ) : (
            <EmptyState
              compact
              icon={<SearchX size={32} color={palette.ink3} strokeWidth={1.6} />}
              title="검색 결과가 없어요"
              description="다른 이름이나 학명으로 검색하거나 공간 필터를 바꿔보세요."
            />
          )}
        </View>
      ) : (
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
      )}
    </ScrollView>
  );
}
