import { Button } from '@/components/Button';
import { HoverPressable } from '@/components/HoverPressable';
import { ThemedText } from '@/components/Typography';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { todayList } from '@/utils/date';
import { usePathname, useRouter } from 'expo-router';
import { Calendar, Grid3x3, Home, Leaf, Plus } from 'lucide-react-native';
import React from 'react';
import { ScrollView, View } from 'react-native';

type SpaceFilter = 'all' | string;

type Props = {
  spaceFilter?: SpaceFilter;
  onSpaceFilter?: (id: SpaceFilter) => void;
};

const NAV = [
  { id: 'home',     label: '홈',      path: '/(tabs)/home',     icon: Home,    tip: '오늘 할 일' },
  { id: 'list',     label: '내 식물',  path: '/(tabs)/list',     icon: Grid3x3, tip: '전체 식물' },
  { id: 'schedule', label: '일정',    path: '/(tabs)/schedule', icon: Calendar, tip: '돌봄 캘린더' },
  { id: 'me',       label: '설정',    path: '/(tabs)/me',       icon: Leaf,    tip: '테마·폰트' },
] as const;

export function Sidebar({ spaceFilter = 'all', onSpaceFilter }: Props) {
  const { palette, radii, weights } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const plants = usePlantStore((s) => s.plants);
  const locations = useLocationStore((s) => s.locations);
  const todayCount = todayList(plants).length;

  const isActive = (path: string) => {
    const tail = path.split('/').pop();
    return pathname.endsWith(`/${tail}`) || pathname === path;
  };

  return (
    <View
      style={{
        width: 240,
        backgroundColor: palette.surface,
        borderRightWidth: 1,
        borderColor: palette.line,
        paddingVertical: 24,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ paddingHorizontal: 10, paddingBottom: 20 }}>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1.4, marginBottom: 4 }}>
          SikJipSa
        </ThemedText>
        <ThemedText family="serif" style={{ fontSize: 26, lineHeight: 34, fontFamily: weights.serifRegular, letterSpacing: -0.26 }}>
          <ThemedText family="serif" italic style={{ fontSize: 26, lineHeight: 34, color: palette.green, fontFamily: weights.serifItalic }}>
            SikJipSa
          </ThemedText>
        </ThemedText>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}>
        {NAV.map((it) => {
          const active = isActive(it.path);
          const IconCmp = it.icon;
          const count = it.id === 'list' ? plants.length : it.id === 'schedule' ? todayCount : undefined;

          return (
            <HoverPressable
              key={it.id}
              onPress={() => router.push(it.path as never)}
              style={({ hovered, focused }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: radii.sm,
                backgroundColor: active ? palette.greenBg : hovered ? palette.bg2 : 'transparent',
                ...(focused ? ({ boxShadow: `0 0 0 2px ${palette.green}` } as object) : {}),
              })}
            >
              <IconCmp size={18} color={active ? palette.greenDeep : palette.ink2} strokeWidth={active ? 2.2 : 1.8} />
              <ThemedText
                variant="meta"
                weight={active ? 'semibold' : 'medium'}
                color={active ? palette.greenDeep : palette.ink2}
                style={{ flex: 1, fontSize: 14 }}
              >
                {it.label}
              </ThemedText>
              {count !== undefined ? (
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 5,
                    backgroundColor: active ? palette.green : palette.bg2,
                  }}
                >
                  <ThemedText
                    variant="tiny"
                    family="mono"
                    color={active ? palette.bg : palette.ink3}
                    style={{ fontSize: 10 }}
                  >
                    {count}
                  </ThemedText>
                </View>
              ) : null}
            </HoverPressable>
          );
        })}

        <ThemedText
          variant="tiny"
          family="mono"
          uppercase
          color={palette.ink3}
          style={{ marginTop: 24, marginBottom: 4, paddingHorizontal: 14, letterSpacing: 1 }}
        >
          공간
        </ThemedText>

        {[{ id: 'all', label: '전체', count: plants.length, dotColor: palette.ink3 }]
          .concat(
            locations.map((l) => ({
              id: l.name,
              label: l.name,
              count: plants.filter((p) => p.location === l.name).length,
              dotColor: palette.greenMoss,
            })),
          )
          .map((loc) => {
            const active = spaceFilter === loc.id;
            return (
              <HoverPressable
                key={loc.id}
                onPress={() => onSpaceFilter?.(loc.id)}
                style={({ hovered, focused }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: radii.sm,
                  backgroundColor: active ? palette.bg2 : hovered ? palette.bg2 : 'transparent',
                  ...(focused ? ({ boxShadow: `0 0 0 2px ${palette.green}` } as object) : {}),
                })}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: loc.dotColor }} />
                <ThemedText
                  variant="meta"
                  weight={active ? 'semibold' : 'regular'}
                  color={palette.ink2}
                  style={{ flex: 1, fontSize: 13 }}
                >
                  {loc.label}
                </ThemedText>
                <ThemedText variant="tiny" color={palette.ink3} style={{ fontSize: 11 }}>
                  {loc.count}
                </ThemedText>
              </HoverPressable>
            );
          })}
      </ScrollView>

      <View style={{ marginTop: 10 }}>
        <Button
          label="식물 추가"
          leftIcon={<Plus size={16} color={palette.bg} strokeWidth={2.2} />}
          fullWidth
          onPress={() => router.push('/add' as never)}
        />
      </View>
    </View>
  );
}
