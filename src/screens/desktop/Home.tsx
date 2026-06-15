import { HoverPressable } from '@/components/HoverPressable';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { WaterButton } from '@/components/WaterButton';
import { DesktopHeader } from '@/components/web/DesktopHeader';
import { DesktopPlantCard } from '@/components/web/DesktopPlantCard';
import { WebGrid } from '@/components/web/WebGrid';
import { usePlantStore } from '@/store/plants';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { TODAY, daysBetween, nextActionLabel, todayList } from '@/utils/date';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function DesktopHome() {
  const { t } = useTranslation();
  const { palette, radii, weights } = useTheme();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const loadPlants = usePlantStore((s) => s.load);
  const plantsLoading = usePlantStore((s) => s.loading);
  const waterPlant = usePlantStore((s) => s.waterPlant);

  const spaceFilter = useUIStore((s) => s.spaceFilter);
  const query = useUIStore((s) => s.query);

  const todayPlants = useMemo(() => todayList(plants), [plants]);
  const weekCount = useMemo(
    () => plants.filter((p) => daysBetween(TODAY, p.nextWater) <= 7).length,
    [plants],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants.filter((p) => {
      if (spaceFilter !== 'all' && p.location !== spaceFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q);
    });
  }, [plants, spaceFilter, query]);

  const spaceTitle =
    spaceFilter === 'all'
      ? t('desktop.greeting')
      : spaceFilter;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
      <DesktopHeader title={spaceTitle} onRefresh={loadPlants} refreshing={plantsLoading} />

      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 28 }}>
        <SummaryCard label={t('common.today')} value={todayPlants.length} color={palette.drop} />
        <SummaryCard label={t('desktop.thisWeek')} value={weekCount} color={palette.green} />
        <SummaryCard label={t('desktop.caringFor')} value={plants.length} color={palette.ink} />
      </View>

      <ThemedText
        variant="tiny"
        family="mono"
        uppercase
        color={palette.ink3}
        style={{ letterSpacing: 1.3, marginBottom: 14 }}
      >
        {t('desktop.todayTasks', { n: todayPlants.length })}
      </ThemedText>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 32,
        }}
      >
        {todayPlants.length === 0 ? (
          <View
            style={{
              flex: 1,
              backgroundColor: palette.surface,
              padding: 24,
              borderRadius: radii.md,
              alignItems: 'center',
            }}
          >
            <ThemedText color={palette.ink3}>{t('desktop.noTodayTasks')}</ThemedText>
          </View>
        ) : (
          todayPlants.map((p) => (
            <TaskChip
              key={p.id}
              plant={p}
              onOpen={() => router.push(`/plant/${p.id}` as never)}
              onWater={() => waterPlant(p.id)}
            />
          ))
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1.3 }}>
          {t('desktop.myPlants', { n: filtered.length })}
        </ThemedText>
      </View>

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
    </ScrollView>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const { t } = useTranslation();
  const { palette, weights } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.surfaceRaised,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 18,
        padding: 24,
      }}
    >
      <ThemedText
        variant="tiny"
        family="mono"
        uppercase
        color={palette.ink3}
        style={{ letterSpacing: 1, marginBottom: 8 }}
      >
        {label}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <ThemedText family="serif" style={{ fontSize: 48, lineHeight: 52, color, fontFamily: weights.serifRegular, letterSpacing: -0.96 }}>
          {value}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3}>
          {t('desktop.plantUnit')}
        </ThemedText>
      </View>
    </View>
  );
}

function TaskChip({ plant, onOpen, onWater }: { plant: Plant; onOpen: () => void; onWater: (p: Plant) => void }) {
  const { palette, radii, shadows } = useTheme();
  return (
    <HoverPressable
      onPress={onOpen}
      style={({ hovered }) => ({
        flexBasis: 280,
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: hovered ? palette.lineStrong : palette.line,
        backgroundColor: palette.surfaceRaised,
        transform: hovered ? [{ translateY: -3 }] : undefined,
        ...(hovered ? shadows.md : shadows.xs),
      })}
    >
      <View style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden' }}>
        <PlantThumb plant={plant} size={56} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1} style={{ fontSize: 15 }}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} style={{ fontSize: 12, marginTop: 2 }}>
          {plant.location} · {nextActionLabel(plant)}
        </ThemedText>
      </View>
      <WaterButton plant={plant} onDone={onWater} size={40} />
    </HoverPressable>
  );
}
