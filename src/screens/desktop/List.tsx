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
import { useTranslation } from 'react-i18next';

export function DesktopList() {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const waterPlant = usePlantStore((s) => s.waterPlant);
  const loadPlants = usePlantStore((s) => s.load);
  const plantsLoading = usePlantStore((s) => s.loading);

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
    spaceFilter === 'all' ? t('desktop.myPlantsAll') : spaceFilter;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
      <DesktopHeader title={title} onRefresh={loadPlants} refreshing={plantsLoading} />

      <ThemedText
        variant="tiny"
        family="mono"
        uppercase
        color={palette.ink3}
        style={{ letterSpacing: 1.3, marginBottom: 14 }}
      >
        {t('desktop.listCount', { n: filtered.length })}
      </ThemedText>

      {filtered.length === 0 ? (
        <View style={{ paddingTop: 48, maxWidth: 480, alignSelf: 'center', width: '100%' }}>
          {plants.length === 0 ? (
            <EmptyState
              compact
              icon={<Sprout size={32} color={palette.green} strokeWidth={1.6} />}
              title={t('desktop.emptyTitle')}
              description={t('desktop.emptyDescription')}
              actionLabel={t('desktop.addPlant')}
              onAction={() => router.push('/add' as never)}
            />
          ) : (
            <EmptyState
              compact
              icon={<SearchX size={32} color={palette.ink3} strokeWidth={1.6} />}
              title={t('desktop.noResultsTitle')}
              description={t('desktop.noResultsDescription')}
            />
          )}
        </View>
      ) : (
        <WebGrid minCol={230} gap={16}>
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
