import { TaskRow } from '@/components/TaskRow';
import { ThemedText } from '@/components/Typography';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { TODAY, daysBetween, formatMD } from '@/utils/date';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Groups plants by days-until-next-water so the user can see the week ahead.
 * This is a placeholder surface for the richer calendar view mentioned in the handoff.
 */
export default function ScheduleScreen() {
  const { palette, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const waterPlant = usePlantStore((s) => s.waterPlant);

  const groups = useMemo(() => {
    const map = new Map<number, typeof plants>();
    for (const p of plants) {
      const d = daysBetween(TODAY, p.nextWater);
      const bucket = d < 0 ? -1 : d;
      if (!map.has(bucket)) map.set(bucket, []);
      map.get(bucket)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [plants]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120, paddingHorizontal: 24 }}
    >
      <ThemedText variant="screenTitle" family="serif">
        일정
      </ThemedText>
      <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 8, marginBottom: 20 }}>
        앞으로의 물주기를 한눈에.
      </ThemedText>

      {groups.map(([d, items]) => {
        const iso = new Date(TODAY);
        iso.setDate(iso.getDate() + Math.max(d, 0));
        const label =
          d < 0 ? '지남' :
          d === 0 ? '오늘' :
          d === 1 ? '내일' :
          `${d}일 뒤`;

        return (
          <View key={d} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <ThemedText variant="subsection" weight="semibold" color={d < 0 ? palette.warn : palette.ink}>
                {label}
              </ThemedText>
              <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>
                {d < 0 ? '' : formatMD(iso)} · {items.length}
              </ThemedText>
            </View>
            <View style={{ gap: 10 }}>
              {items.map((p) => (
                <TaskRow
                  key={p.id}
                  plant={p}
                  onOpen={() => router.push(`/plant/${p.id}`)}
                  onWater={() => waterPlant(p.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
