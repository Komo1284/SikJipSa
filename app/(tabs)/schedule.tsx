import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { PlantThumb } from '@/components/PlantThumb';
import { TaskRow } from '@/components/TaskRow';
import { ThemedText } from '@/components/Typography';
import { getRepotSchedule } from '@/lib/reminders';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { useTabletContentCap } from '@/theme/responsive';
import type { Plant } from '@/types/plant';
import { TODAY, daysBetween, formatMD, parseISODate, toISODate } from '@/utils/date';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'water' | 'fert' | 'repot';

const TABS: { key: Tab; label: string }[] = [
  { key: 'water', label: '물' },
  { key: 'fert', label: '비료' },
  { key: 'repot', label: '분갈이' },
];

export default function ScheduleScreen() {
  const { palette, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const repotByPlant = usePlantStore((s) => s.repotByPlant);
  const waterPlant = usePlantStore((s) => s.waterPlant);

  const [tab, setTab] = useState<Tab>('water');
  const tabletCap = useTabletContentCap();

  if (plants.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, paddingHorizontal: 24 }}>
        <View style={{ paddingTop: insets.top + 14 }}>
          <ThemedText variant="screenTitle" family="serif">
            일정
          </ThemedText>
        </View>
        <EmptyState
          icon={<CalendarDays size={40} color={palette.green} strokeWidth={1.6} />}
          title="예정된 일정이 없어요"
          description={'식물을 추가하면\n물주기 일정이 여기에 표시돼요.'}
          actionLabel="식물 추가하기"
          onAction={() => router.push('/add')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={[{ paddingTop: insets.top + 14, paddingHorizontal: 24 }, tabletCap]}>
        <ThemedText variant="screenTitle" family="serif">
          일정
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 8, marginBottom: 16 }}>
          앞으로의 돌봄 리듬을 한눈에.
        </ThemedText>

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: palette.surface,
            borderRadius: 12,
            padding: 4,
            gap: 4,
            marginBottom: 18,
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 9,
                  backgroundColor: active ? palette.surfaceRaised : 'transparent',
                }}
              >
                <ThemedText
                  variant="meta"
                  weight={active ? 'semibold' : 'regular'}
                  color={active ? palette.ink : palette.ink2}
                >
                  {t.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingHorizontal: 24, paddingBottom: 120 }, tabletCap]}
      >
        {tab === 'water' ? (
          <WaterTab plants={plants} onOpen={(id) => router.push(`/plant/${id}`)} onWater={waterPlant} />
        ) : tab === 'fert' ? (
          <FertTab plants={plants} onOpen={(id) => router.push(`/plant/${id}`)} />
        ) : (
          <RepotTab plants={plants} repotByPlant={repotByPlant} onOpen={(id) => router.push(`/plant/${id}`)} />
        )}
      </ScrollView>
    </View>
  );
}

/* ─── 물 탭 ─────────────────────────────────────────────── */

function WaterTab({
  plants,
  onOpen,
  onWater,
}: {
  plants: Plant[];
  onOpen: (id: string) => void;
  onWater: (id: string) => void;
}) {
  const { palette } = useTheme();

  const groups = useMemo(() => {
    const map = new Map<number, Plant[]>();
    for (const p of plants) {
      const d = daysBetween(TODAY, p.recommendedNextWater ?? p.nextWater);
      const bucket = d < 0 ? -1 : d;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [plants]);

  return (
    <>
      {groups.map(([d, items]) => {
        const iso = new Date(TODAY);
        iso.setDate(iso.getDate() + Math.max(d, 0));
        return (
          <DayGroup key={d} d={d} dateLabel={d < 0 ? '' : formatMD(iso)} count={items.length}>
            {items.map((p) => (
              <TaskRow
                key={p.id}
                plant={p}
                onOpen={() => onOpen(p.id)}
                onWater={() => onWater(p.id)}
              />
            ))}
          </DayGroup>
        );
      })}
    </>
  );
}

/* ─── 비료 탭 ────────────────────────────────────────────── */

function FertTab({ plants, onOpen }: { plants: Plant[]; onOpen: (id: string) => void }) {
  const { palette } = useTheme();

  const groups = useMemo(() => {
    const map = new Map<number, { plant: Plant; dueIn: number }[]>();
    for (const p of plants) {
      const next = parseISODate(p.lastFert);
      next.setDate(next.getDate() + p.fertCycle);
      const dueIn = daysBetween(TODAY, toISODate(next));
      const bucket = dueIn < 0 ? -1 : dueIn;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push({ plant: p, dueIn });
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [plants]);

  return (
    <>
      {groups.map(([d, items]) => {
        const iso = new Date(TODAY);
        iso.setDate(iso.getDate() + Math.max(d, 0));
        return (
          <DayGroup key={d} d={d} dateLabel={d < 0 ? '' : formatMD(iso)} count={items.length}>
            {items.map(({ plant, dueIn }) => (
              <ScheduleRow
                key={plant.id}
                plant={plant}
                chipLabel={`비료 · ${dueLabel(dueIn)}`}
                chipTone={dueIn < 0 ? 'warn' : dueIn <= 7 ? 'fert' : 'neutral'}
                onPress={() => onOpen(plant.id)}
              />
            ))}
          </DayGroup>
        );
      })}
    </>
  );
}

/* ─── 분갈이 탭 ───────────────────────────────────────────── */

function RepotTab({
  plants,
  repotByPlant,
  onOpen,
}: {
  plants: Plant[];
  repotByPlant: Record<string, string>;
  onOpen: (id: string) => void;
}) {
  const { palette } = useTheme();
  const { withRecord, noRecord } = useMemo(
    () => getRepotSchedule(plants, repotByPlant),
    [plants, repotByPlant],
  );

  return (
    <>
      {withRecord.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
          <ThemedText
            variant="tiny"
            family="mono"
            uppercase
            color={palette.ink3}
            style={{ marginBottom: 10, letterSpacing: 1 }}
          >
            오래된 순
          </ThemedText>
          <View style={{ gap: 10 }}>
            {withRecord.map(({ plant, lastRepot, monthsAgo, urgent }) => (
              <ScheduleRow
                key={plant.id}
                plant={plant}
                chipLabel={urgent ? `분갈이 · ${monthsAgo}개월 전` : `${monthsAgo}개월 전`}
                chipTone={urgent ? 'warn' : 'neutral'}
                trailing={
                  <ThemedText variant="tiny" family="mono" color={palette.ink3}>
                    {formatMD(lastRepot)}
                  </ThemedText>
                }
                onPress={() => onOpen(plant.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {noRecord.length > 0 ? (
        <View style={{ marginBottom: 20 }}>
          <ThemedText
            variant="tiny"
            family="mono"
            uppercase
            color={palette.ink3}
            style={{ marginBottom: 10, letterSpacing: 1 }}
          >
            분갈이 기록 없음
          </ThemedText>
          <View style={{ gap: 10 }}>
            {noRecord.map((plant) => (
              <ScheduleRow
                key={plant.id}
                plant={plant}
                chipLabel="기록 없음"
                chipTone="neutral"
                muted
                onPress={() => onOpen(plant.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ─── shared building blocks ─────────────────────────────── */

function DayGroup({
  d,
  dateLabel,
  count,
  children,
}: {
  d: number;
  dateLabel: string;
  count: number;
  children: React.ReactNode;
}) {
  const { palette } = useTheme();
  const label = d < 0 ? '지남' : d === 0 ? '오늘' : d === 1 ? '내일' : `${d}일 뒤`;
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <ThemedText variant="subsection" weight="semibold" color={d < 0 ? palette.warn : palette.ink}>
          {label}
        </ThemedText>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>
          {dateLabel ? `${dateLabel} · ` : ''}{count}
        </ThemedText>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

type ChipTone = 'warn' | 'fert' | 'neutral';

function ScheduleRow({
  plant,
  chipLabel,
  chipTone,
  trailing,
  muted,
  onPress,
}: {
  plant: Plant;
  chipLabel: string;
  chipTone: ChipTone;
  trailing?: React.ReactNode;
  muted?: boolean;
  onPress: () => void;
}) {
  const { palette, radii, shadows } = useTheme();
  // Chip's `tone` prop only knows {warn, water, neutral}, so 'fert' is rendered
  // via inline style below to stay color-correct without expanding Chip.
  const renderChip = () => {
    if (chipTone === 'fert') {
      return (
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: palette.bloomSoft,
          }}
        >
          <ThemedText variant="tiny" weight="medium" color={palette.bloom}>
            {chipLabel}
          </ThemedText>
        </View>
      );
    }
    return <Chip tone={chipTone === 'warn' ? 'warn' : 'neutral'}>{chipLabel}</Chip>;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: pressed ? palette.bg2 : palette.surfaceRaised,
        padding: 12,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: palette.line,
        opacity: muted ? 0.7 : 1,
        ...shadows.xs,
      })}
    >
      <PlantThumb plant={plant} size={56} radius={radii.sm} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 2 }} numberOfLines={1}>
          {plant.location}
        </ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {renderChip()}
        </View>
      </View>
      {trailing}
    </Pressable>
  );
}

function dueLabel(d: number): string {
  if (d < 0) return `${-d}일 지남`;
  if (d === 0) return '오늘';
  if (d === 1) return '내일';
  return `${d}일 뒤`;
}
