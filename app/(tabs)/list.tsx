import { EmptyState } from '@/components/EmptyState';
import { GridCard } from '@/components/GridCard';
import { TaskRow } from '@/components/TaskRow';
import { ThemedText } from '@/components/Typography';
import { useLocationStore } from '@/store/locations';
import { DesktopList } from '@/screens/desktop/List';
import { usePlantStore } from '@/store/plants';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import { useFocusEffect, useRouter } from 'expo-router';
import { LayoutGrid, List as ListIcon, Search, SearchX, Sprout } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Layout = 'grid' | 'list';

export default function ListScreen() {
  const { isDesktop } = useResponsive();
  if (isDesktop) return <DesktopList />;
  return <ListMobile />;
}

function ListMobile() {
  const { palette, weights } = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const waterPlant = usePlantStore((s) => s.waterPlant);
  const loadPlants = usePlantStore((s) => s.load);
  const locations = useLocationStore((s) => s.locations);
  const spaceFilter = useUIStore((s) => s.spaceFilter);
  const setSpaceFilter = useUIStore((s) => s.setSpaceFilter);

  // Bridge the global UIStore.spaceFilter ('all' | locationName) into the
  // local "전체" UI string the chip row uses. Sync both ways:
  // - on focus, pull from store so home→list deep links land filtered.
  // - chip taps push back into the store.
  const [filter, setFilter] = useState<string>(spaceFilter === 'all' ? '전체' : spaceFilter);
  useFocusEffect(
    useCallback(() => {
      setFilter(spaceFilter === 'all' ? '전체' : spaceFilter);
    }, [spaceFilter]),
  );
  const handleFilter = (f: string) => {
    setFilter(f);
    setSpaceFilter(f === '전체' ? 'all' : f);
  };

  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPlants();
    } finally {
      setRefreshing(false);
    }
  }, [loadPlants]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [layout, setLayout] = useState<Layout>('grid');
  // 태블릿에서는 카드가 2열로는 과하게 커져서 3열로 늘린다.
  const gridCols = isTablet ? 3 : 2;

  const filters = useMemo(() => ['전체', ...locations.map((l) => l.name)], [locations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plants.filter((p) => {
      if (filter !== '전체' && p.location !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.species.toLowerCase().includes(q)
      );
    });
  }, [plants, filter, query]);

  if (plants.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, paddingHorizontal: 24 }}>
        <View style={{ paddingTop: insets.top + 14 }}>
          <ThemedText variant="screenTitle" family="serif">
            내 식물
          </ThemedText>
        </View>
        <EmptyState
          icon={<Sprout size={40} color={palette.green} strokeWidth={1.6} />}
          title="아직 등록된 식물이 없어요"
          description={'식물을 추가하여\n나만의 관리를 시작해보세요!'}
          actionLabel="식물 추가하기"
          onAction={() => router.push('/add')}
        />
      </View>
    );
  }

  const header = (
    <View style={{ paddingTop: insets.top + 14, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ThemedText variant="screenTitle" family="serif">
          내 식물{' '}
          <ThemedText
            family="serif"
            italic
            style={{ fontSize: 30, lineHeight: 34, color: palette.green, fontFamily: weights.serifItalic }}
          >
            {plants.length}
          </ThemedText>
        </ThemedText>

        <View style={{ flexDirection: 'row', padding: 4, backgroundColor: palette.surface, borderRadius: 10 }}>
          {(['grid', 'list'] as Layout[]).map((l) => {
            const active = layout === l;
            const Icon = l === 'grid' ? LayoutGrid : ListIcon;
            return (
              <Pressable
                key={l}
                onPress={() => setLayout(l)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 7,
                  backgroundColor: active ? palette.surfaceRaised : 'transparent',
                }}
              >
                <Icon size={16} color={active ? palette.ink : palette.ink3} strokeWidth={1.8} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: palette.surface,
          paddingHorizontal: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: searchFocused ? palette.green : 'transparent',
        }}
      >
        <Search size={16} color={searchFocused ? palette.green : palette.ink3} strokeWidth={1.8} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="식물 이름 또는 종 검색"
          placeholderTextColor={palette.ink3}
          returnKeyType="search"
          style={{
            flex: 1,
            paddingVertical: 12,
            fontSize: 14,
            color: palette.ink,
            fontFamily: weights.sansRegular,
          }}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingTop: 14, paddingBottom: 4 }}
      >
        {filters.map((f) => {
          const count = f === '전체' ? plants.length : plants.filter((p) => p.location === f).length;
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => handleFilter(f)}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: active ? palette.ink : palette.surface,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ThemedText
                variant="meta"
                weight="medium"
                color={active ? palette.bg : palette.ink2}
                style={{ fontSize: 13 }}
              >
                {f}
              </ThemedText>
              <ThemedText variant="meta" color={active ? palette.bg : palette.ink3} style={{ fontSize: 12, opacity: 0.7 }}>
                {count}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  // 검색어/필터 결과가 0개일 때 — 아무 피드백 없이 빈 영역만 남던 부분.
  const noResults = (
    <View style={{ paddingTop: 24 }}>
      <EmptyState
        compact
        icon={<SearchX size={32} color={palette.ink3} strokeWidth={1.6} />}
        title="검색 결과가 없어요"
        description={
          query.trim()
            ? '다른 이름이나 학명으로 검색해보세요.'
            : '이 공간에는 아직 식물이 없어요.'
        }
      />
    </View>
  );

  if (layout === 'grid') {
    return (
      <FlatList
        key={`grid-${gridCols}`}
        style={{ flex: 1, backgroundColor: palette.bg }}
        data={filtered}
        keyExtractor={(p) => p.id}
        numColumns={gridCols}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={noResults}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.ink3} />
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: `${100 / gridCols}%` }}>
            <GridCard plant={item} onClick={() => router.push(`/plant/${item.id}`)} />
          </View>
        )}
      />
    );
  }

  return (
    <FlatList
      key="list"
      style={{ flex: 1, backgroundColor: palette.bg }}
      data={filtered}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={header}
      ListEmptyComponent={noResults}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.ink3} />
      }
      renderItem={({ item }) => (
        <TaskRow
          plant={item}
          onOpen={() => router.push(`/plant/${item.id}`)}
          onWater={() => waterPlant(item.id)}
        />
      )}
    />
  );
}
