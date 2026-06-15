import { SHEET_CLOSE_DELAY } from '@/theme/animation';
import i18n from '@/i18n';
import { BottomSheet } from '@/components/BottomSheet';
import { ThemedText } from '@/components/Typography';
import { getFertReminders, getRepotReminders, getWaterReminders } from '@/lib/reminders';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { useRouter } from 'expo-router';
import { Bell, Droplet, Flower2, Sprout } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';

const PAGE = 5;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function NotificationsSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const repotByPlant = usePlantStore((s) => s.repotByPlant);

  const water = useMemo(() => getWaterReminders(plants), [plants]);
  const fert = useMemo(() => getFertReminders(plants), [plants]);
  const repot = useMemo(() => getRepotReminders(plants, repotByPlant), [plants, repotByPlant]);

  // Each section paginates independently — endless scroll bumps all three at
  // once when the user reaches the bottom of the sheet's scroll surface.
  const [visW, setVisW] = useState(PAGE);
  const [visF, setVisF] = useState(PAGE);
  const [visR, setVisR] = useState(PAGE);

  useEffect(() => {
    if (visible) {
      setVisW(PAGE);
      setVisF(PAGE);
      setVisR(PAGE);
    }
  }, [visible]);

  const total = water.length + fert.length + repot.length;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const fromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (fromBottom < 80) {
      setVisW((v) => Math.min(v + PAGE, water.length));
      setVisF((v) => Math.min(v + PAGE, fert.length));
      setVisR((v) => Math.min(v + PAGE, repot.length));
    }
  };

  // Dismiss the sheet first, then route — gives the swipe-down animation
  // (~240ms) a chance to finish before the next screen transition starts.
  const goPlant = (id: string) => {
    onClose();
    setTimeout(() => router.push(`/plant/${id}`), SHEET_CLOSE_DELAY);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.85}>
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 }}>
        <ThemedText variant="subsection" weight="semibold">
          {t('components.notifications.title')}
        </ThemedText>
      </View>

      {total === 0 ? (
        <View style={{ paddingHorizontal: 20, paddingVertical: 56, alignItems: 'center' }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: palette.surface,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Bell size={28} color={palette.ink3} strokeWidth={1.6} />
          </View>
          <ThemedText variant="body" color={palette.ink2}>
            {t('components.notifications.emptyTitle')}
          </ThemedText>
          <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 6, textAlign: 'center' }}>
            {t('components.notifications.emptyDescription')}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          onScroll={handleScroll}
          scrollEventThrottle={64}
          showsVerticalScrollIndicator={false}
        >
          {water.length > 0 ? (
            <Section
              title={t('components.notifications.water')}
              count={water.length}
              icon={<Droplet size={16} color={palette.drop} strokeWidth={1.8} />}
            >
              {water.slice(0, visW).map(({ plant, dueIn }) => (
                <Row
                  key={plant.id}
                  plant={plant}
                  detail={dueLabel(dueIn)}
                  detailColor={dueIn < 0 ? palette.warn : palette.drop}
                  onPress={() => goPlant(plant.id)}
                />
              ))}
            </Section>
          ) : null}

          {fert.length > 0 ? (
            <Section
              title={t('components.notifications.fert')}
              count={fert.length}
              icon={<Flower2 size={16} color={palette.bloom} strokeWidth={1.8} />}
            >
              {fert.slice(0, visF).map(({ plant, dueIn }) => (
                <Row
                  key={plant.id}
                  plant={plant}
                  detail={dueLabel(dueIn)}
                  detailColor={dueIn < 0 ? palette.warn : palette.bloom}
                  onPress={() => goPlant(plant.id)}
                />
              ))}
            </Section>
          ) : null}

          {repot.length > 0 ? (
            <Section
              title={t('components.notifications.repot')}
              count={repot.length}
              icon={<Sprout size={16} color={palette.earth} strokeWidth={1.8} />}
            >
              {repot.slice(0, visR).map(({ plant, monthsAgo }) => (
                <Row
                  key={plant.id}
                  plant={plant}
                  detail={t('components.notifications.monthsAgo', { n: monthsAgo })}
                  detailColor={palette.earth}
                  onPress={() => goPlant(plant.id)}
                />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

function dueLabel(d: number): string {
  if (d < 0) return i18n.t('components.notifications.daysOverdue', { n: -d });
  if (d === 0) return i18n.t('common.today');
  if (d === 1) return i18n.t('components.notifications.tomorrow');
  return i18n.t('components.notifications.daysLater', { n: d });
}

function Section({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { palette } = useTheme();
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {icon}
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1 }}>
          {title} · {count}
        </ThemedText>
      </View>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function Row({
  plant,
  detail,
  detailColor,
  onPress,
}: {
  plant: Plant;
  detail: string;
  detailColor: string;
  onPress: () => void;
}) {
  const { palette, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: radii.sm,
        backgroundColor: pressed ? palette.bg2 : palette.surfaceRaised,
      })}
    >
      <View style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
        <ThemedText variant="body" weight="semibold" numberOfLines={1}>
          {plant.name}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} numberOfLines={1} style={{ marginTop: 2 }}>
          {plant.location}
        </ThemedText>
      </View>
      <ThemedText variant="meta" weight="medium" color={detailColor}>
        {detail}
      </ThemedText>
    </Pressable>
  );
}
