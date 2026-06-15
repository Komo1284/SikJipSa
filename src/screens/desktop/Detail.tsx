import { humanizeError } from '@/lib/errors';
import { Button } from '@/components/Button';
import { CareLogSheet, type CareKind } from '@/components/CareLogSheet';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { repos } from '@/repo';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { formatMD, nextActionLabel, parseISODate, toISODate } from '@/utils/date';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Droplet, Flower2, Pencil, Scissors, Sprout, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export function DesktopDetail({ plant }: { plant: Plant }) {
  const { t } = useTranslation();
  const { palette, radii, weights } = useTheme();
  const router = useRouter();
  const waterPlant = usePlantStore((s) => s.waterPlant);
  const fertilize = usePlantStore((s) => s.fertilizePlant);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const updatePlantPhoto = usePlantStore((s) => s.updatePlantPhoto);
  const logAction = usePlantStore((s) => s.logAction);

  const [careSheet, setCareSheet] = useState<CareKind | null>(null);
  const onCareSubmit = (date: string, note: string) => {
    if (careSheet === 'water') waterPlant(plant.id, { date, note });
    else if (careSheet === 'fert') fertilize(plant.id, { date, note });
    else if (careSheet === 'prune') logAction(plant.id, 'prune', { date, note });
    else if (careSheet === 'repot') logAction(plant.id, 'repot', { date, note });
  };

  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const uploaded = await repos.storage.uploadPhoto(plant.id, result.assets[0].uri);
      await updatePlantPhoto(plant.id, uploaded.publicUrl);
    } catch (e) {
      Alert.alert(t('desktop.photoReplaceFailed'), humanizeError(e));
    }
  };

  const confirmDelete = () => {
    Alert.alert(plant.name, t('desktop.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deletePlant(plant.id);
          router.push('/(tabs)/list' as never);
        },
      },
    ]);
  };

  // Compute next-fert D-day (last_fert + fert_cycle).
  // Both ends are anchored to local midnight so the round() doesn't drift by a
  // day depending on what time the screen is opened.
  const fertNext = (() => {
    try {
      const d = parseISODate(plant.lastFert);
      d.setDate(d.getDate() + plant.fertCycle);
      const today = parseISODate(toISODate(new Date()));
      const days = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      if (days < 0) return t('desktop.daysPast', { n: -days });
      if (days === 0) return t('common.today');
      return t('desktop.daysLater', { n: days });
    } catch { return '—'; }
  })();

  // 광량/습도(현재 환경)는 신규 식물에서 더 이상 입력받지 않으므로 값이 있는
  // 기존 식물만 stat 으로 노출한다.
  const stats: { k: string; v: string; color?: string }[] = [
    { k: t('desktop.nextWater'), v: nextActionLabel(plant), color: palette.drop },
    { k: t('desktop.nextFert'), v: fertNext, color: palette.bloom },
    ...(plant.light ? [{ k: t('desktop.light'), v: plant.light }] : []),
    ...(plant.humidity ? [{ k: t('desktop.humidity'), v: plant.humidity }] : []),
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
      <View style={{ marginBottom: 20 }}>
        <Button
          variant="ghost"
          label={t('desktop.backToList')}
          onPress={() => router.push('/(tabs)/list' as never)}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 28, alignItems: 'flex-start' }}>
        <View
          style={{
            flex: 1.1,
            borderRadius: 22,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: palette.line,
            aspectRatio: 4 / 3,
          }}
        >
          <PlantThumb plant={plant} size={600} style={{ width: '100%', height: '100%' }} />
        </View>

        <View style={{ flex: 1 }}>
          {plant.species ? (
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1.4, marginBottom: 6 }}>
              {plant.species}
            </ThemedText>
          ) : null}
          <ThemedText
            family="serif"
            style={{ fontSize: 44, lineHeight: 48, fontFamily: weights.serifRegular, letterSpacing: -0.88 }}
          >
            {plant.name}
          </ThemedText>
          <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 4, marginBottom: 24 }}>
            {plant.location}
          </ThemedText>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            {stats.map((s) => (
              <View
                key={s.k}
                style={{
                  width: '48%',
                  padding: 16,
                  backgroundColor: palette.surface,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1 }}>
                  {s.k}
                </ThemedText>
                <ThemedText
                  family="serif"
                  style={{
                    fontSize: 20,
                    lineHeight: 24,
                    marginTop: 4,
                    color: s.color ?? palette.ink,
                    fontFamily: weights.serifRegular,
                  }}
                >
                  {s.v}
                </ThemedText>
              </View>
            ))}
          </View>

          {plant.note ? (
            <View style={{ padding: 16, backgroundColor: palette.greenBg, borderRadius: 14, marginBottom: 24 }}>
              <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 4 }}>
                {t('desktop.memo')}
              </ThemedText>
              <ThemedText variant="body" style={{ lineHeight: 22 }}>
                {plant.note}
              </ThemedText>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button
              label={t('desktop.logWater')}
              leftIcon={<Droplet size={16} color={palette.bg} strokeWidth={1.8} fill={palette.bg} />}
              onPress={() => setCareSheet('water')}
            />
            <Button
              variant="ghost"
              label={t('desktop.logFert')}
              leftIcon={<Flower2 size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('fert')}
            />
            <Button
              variant="ghost"
              label={t('desktop.prune')}
              leftIcon={<Scissors size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('prune')}
            />
            <Button
              variant="ghost"
              label={t('desktop.repot')}
              leftIcon={<Sprout size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('repot')}
            />
            <Button
              variant="ghost"
              label={t('desktop.editInfo')}
              leftIcon={<Pencil size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => router.push(`/plant/edit/${plant.id}` as never)}
            />
            <Button
              variant="ghost"
              label={t('desktop.replacePhoto')}
              leftIcon={<Camera size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={changePhoto}
            />
            <Button
              variant="ghost"
              label={t('common.delete')}
              leftIcon={<Trash2 size={16} color={palette.warn} strokeWidth={1.8} />}
              onPress={confirmDelete}
            />
          </View>

          <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginTop: 28, marginBottom: 8 }}>
            {t('desktop.lastWaterFert', { water: formatMD(plant.lastWater), fert: formatMD(plant.lastFert) })}
          </ThemedText>
        </View>
      </View>

      <CareLogSheet
        visible={careSheet !== null}
        kind={careSheet ?? 'water'}
        plantName={plant.name}
        onClose={() => setCareSheet(null)}
        onSubmit={onCareSubmit}
      />
    </ScrollView>
  );
}
