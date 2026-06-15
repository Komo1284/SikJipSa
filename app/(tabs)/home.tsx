import { EmptyState } from '@/components/EmptyState';
import { MiniPlantCard } from '@/components/MiniPlantCard';
import { NotificationsSheet } from '@/components/NotificationsSheet';
import { SyncBanner } from '@/components/SyncBanner';
import { PlantThumb } from '@/components/PlantThumb';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonTaskRow } from '@/components/Skeleton';
import { TaskRow } from '@/components/TaskRow';
import { ThemedText } from '@/components/Typography';
import { getFertReminders, getRepotReminders, getWaterReminders } from '@/lib/reminders';
import { useLocationStore } from '@/store/locations';
import { useUIStore } from '@/store/ui';
import { DesktopHome } from '@/screens/desktop/Home';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive, useTabletContentCap } from '@/theme/responsive';
import { formatKickerShort, plantStatus, soonList, todayList } from '@/utils/date';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Leaf, Sprout } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { isDesktop } = useResponsive();
  if (isDesktop) return <DesktopHome />;
  return <HomeMobile />;
}

function HomeMobile() {
  const { t } = useTranslation();
  const { palette, radii, shadows, weights, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const tabletCap = useTabletContentCap();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const plantsLoading = usePlantStore((s) => s.loading);
  const plantsLoaded = usePlantStore((s) => s.loaded);
  const repotByPlant = usePlantStore((s) => s.repotByPlant);
  const waterPlant = usePlantStore((s) => s.waterPlant);
  const loadPlants = usePlantStore((s) => s.load);
  const locations = useLocationStore((s) => s.locations);
  const setSpaceFilter = useUIStore((s) => s.setSpaceFilter);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPlants();
    } finally {
      setRefreshing(false);
    }
  }, [loadPlants]);

  const openSpace = (locationName: string) => {
    setSpaceFilter(locationName);
    router.push('/(tabs)/list');
  };

  const todays = todayList(plants);
  const soon = soonList(plants);

  // Bell badge — show whenever any reminder type has at least one entry,
  // not just water-overdue. Uses the same selectors as the sheet so the
  // dot and the sheet contents agree.
  const reminderCount = useMemo(
    () =>
      getWaterReminders(plants).length +
      getFertReminders(plants).length +
      getRepotReminders(plants, repotByPlant).length,
    [plants, repotByPlant],
  );

  const [notifOpen, setNotifOpen] = useState(false);

  // 오늘 할 일이 식물 수만큼 길어질 수 있는 유일한 구간이라 FlatList 로
  // 가상화한다. 나머지 섹션은 header/footer 로 옮겨 구조는 그대로 유지.
  const listHeader = (
    <>
      <View style={{ paddingHorizontal: 24, paddingTop: 6 }}>
        <SyncBanner />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText variant="tiny" family="mono" color={palette.ink3} uppercase>
            {formatKickerShort()}
          </ThemedText>
          <Pressable hitSlop={8} style={{ padding: 6 }} onPress={() => setNotifOpen(true)}>
            <Bell size={22} color={palette.ink2} strokeWidth={1.6} />
            {reminderCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: palette.warn,
                }}
              />
            ) : null}
          </Pressable>
        </View>

        <ThemedText
          family="serif"
          // lineHeight needs ~1.2× the fontSize so descenders/ascenders aren't
          // clipped by the parent container — 44/42 was visually cropping the
          // top stroke of 좋/정. Bumped to 54 for a comfortable optical box.
          style={{ fontSize: 42, lineHeight: 54, marginTop: 18, fontFamily: weights.serifRegular, letterSpacing: -0.84 }}
        >
          {t('home.heroTitle')}{'\n'}
          <ThemedText
            family="serif"
            italic
            style={{ fontSize: 42, lineHeight: 54, fontFamily: weights.serifItalic, color: palette.green, letterSpacing: -0.84 }}
          >
            {t('home.heroTitleAccent')}
          </ThemedText>
        </ThemedText>

        <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 8 }}>
          {todays.length === 0
            ? t('home.tasksTodayNone')
            : <>{t('home.tasksTodayPrefix')} <ThemedText variant="meta" weight="semibold">{t('home.tasksTodayCountLabel', { n: todays.length })}</ThemedText></>}
        </ThemedText>
      </View>

      <View
        style={{
          marginHorizontal: 20,
          marginTop: 20,
          padding: 18,
          flexDirection: 'row',
          backgroundColor: palette.surface,
          borderRadius: radii.lg,
          ...shadows.xs,
        }}
      >
        {[
          { n: todays.length, lbl: t('home.statToday'), c: palette.drop },
          { n: soon.length, lbl: t('home.statSoon'), c: palette.bloom },
          { n: plants.length, lbl: t('home.statAll'), c: palette.green },
        ].map((s, i) => (
          <View
            key={s.lbl}
            style={{
              flex: 1,
              alignItems: 'center',
              borderRightWidth: i < 2 ? 1 : 0,
              borderColor: palette.line,
            }}
          >
            <ThemedText
              family="serif"
              style={{ fontSize: 32, lineHeight: 34, color: s.c, fontFamily: weights.serifRegular }}
            >
              {s.n}
            </ThemedText>
            <ThemedText
              variant="tiny"
              family="mono"
              uppercase
              color={palette.ink3}
              style={{ marginTop: 6, letterSpacing: 0.9 }}
            >
              {s.lbl}
            </ThemedText>
          </View>
        ))}
      </View>

      <SectionHeader title={t('home.todayTasks')} trailing={t('home.countSuffix', { n: todays.length })} />
      {plantsLoading && !plantsLoaded ? (
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <SkeletonTaskRow />
          <SkeletonTaskRow />
        </View>
      ) : todays.length === 0 ? (
        <View style={{ paddingHorizontal: 20 }}>
          <EmptyState
            compact
            icon={<Sprout size={28} color={palette.green} strokeWidth={1.6} />}
            title={t('home.emptyTodayTitle')}
            description={t('home.emptyTodayDescription')}
            actionLabel={t('home.viewMyPlants')}
            onAction={() => router.push('/(tabs)/list')}
          />
        </View>
      ) : null}
    </>
  );

  const listFooter = (
    <>
      <SectionHeader title={t('home.careSoon')} trailing={t('home.viewAll')} onTrailing={() => router.push('/(tabs)/list')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {soon
          .concat(plants.filter((p) => plantStatus(p) === 'ok').slice(0, 3))
          .slice(0, 5)
          .map((p) => (
            <MiniPlantCard key={p.id} plant={p} onClick={() => router.push(`/plant/${p.id}`)} />
          ))}
      </ScrollView>

      <SectionHeader title={t('home.plantsBySpace')} />
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        {locations.map((loc) => {
          const items = plants.filter((p) => p.location === loc.name);
          // Most recently added plant in this space — fall back to first if none.
          const cover = items[items.length - 1] ?? items[0] ?? null;
          return (
            <Pressable
              key={loc.id}
              onPress={() => openSpace(loc.name)}
              style={{
                backgroundColor: palette.surface,
                padding: 12,
                borderRadius: radii.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <View
                style={{
                  width: 52, height: 52, borderRadius: radii.sm,
                  overflow: 'hidden',
                  backgroundColor: palette.bg2,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {cover ? (
                  <PlantThumb plant={cover} size={52} />
                ) : (
                  <Leaf size={20} color={palette.ink4} strokeWidth={1.6} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" weight="semibold">
                  {loc.name}
                </ThemedText>
                <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 2 }}>
                  {items.length === 0 ? t('home.spaceEmpty') : t('home.plantCount', { n: items.length })}
                </ThemedText>
              </View>
              <ChevronRight size={16} color={palette.ink3} strokeWidth={1.6} />
            </Pressable>
          );
        })}
      </View>
    </>
  );

  return (
    <>
    <FlatList
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[{ paddingTop: insets.top + 10, paddingBottom: 120 }, tabletCap]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.ink3} />
      }
      data={plantsLoading && !plantsLoaded ? [] : todays}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <View style={{ paddingHorizontal: 20 }}>
          <TaskRow
            plant={item}
            onOpen={() => router.push(`/plant/${item.id}`)}
            onWater={() => waterPlant(item.id)}
          />
        </View>
      )}
    />
    <NotificationsSheet visible={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
