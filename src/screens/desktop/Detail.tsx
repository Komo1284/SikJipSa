import { Button } from '@/components/Button';
import { CareLogSheet, type CareKind } from '@/components/CareLogSheet';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { repos } from '@/repo';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { formatMD, nextActionLabel } from '@/utils/date';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, Droplet, Flower2, Pencil, Scissors, Sprout, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

export function DesktopDetail({ plant }: { plant: Plant }) {
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
      Alert.alert('사진 교체 실패', (e as Error).message);
    }
  };

  const confirmDelete = () => {
    Alert.alert(plant.name, '정말 삭제할까요? 기록은 보존돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deletePlant(plant.id);
          router.push('/(tabs)/list' as never);
        },
      },
    ]);
  };

  // Compute next-fert D-day (last_fert + fert_cycle).
  const fertNext = (() => {
    try {
      const d = new Date(plant.lastFert);
      d.setDate(d.getDate() + plant.fertCycle);
      const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
      if (days < 0) return `${-days}일 지남`;
      if (days === 0) return '오늘';
      return `${days}일 뒤`;
    } catch { return '—'; }
  })();

  const stats: { k: string; v: string; color?: string }[] = [
    { k: '다음 물', v: nextActionLabel(plant), color: palette.drop },
    { k: '다음 비료', v: fertNext, color: palette.bloom },
    { k: '광량', v: plant.light },
    { k: '습도', v: plant.humidity },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
      <View style={{ marginBottom: 20 }}>
        <Button
          variant="ghost"
          label="← 목록으로"
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
                메모
              </ThemedText>
              <ThemedText variant="body" style={{ lineHeight: 22 }}>
                {plant.note}
              </ThemedText>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button
              label="물주기 기록"
              leftIcon={<Droplet size={16} color={palette.bg} strokeWidth={1.8} fill={palette.bg} />}
              onPress={() => setCareSheet('water')}
            />
            <Button
              variant="ghost"
              label="비료 기록"
              leftIcon={<Flower2 size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('fert')}
            />
            <Button
              variant="ghost"
              label="가지치기"
              leftIcon={<Scissors size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('prune')}
            />
            <Button
              variant="ghost"
              label="분갈이"
              leftIcon={<Sprout size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => setCareSheet('repot')}
            />
            <Button
              variant="ghost"
              label="정보 수정"
              leftIcon={<Pencil size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={() => router.push(`/plant/edit/${plant.id}` as never)}
            />
            <Button
              variant="ghost"
              label="사진 교체"
              leftIcon={<Camera size={16} color={palette.ink2} strokeWidth={1.8} />}
              onPress={changePhoto}
            />
            <Button
              variant="ghost"
              label="삭제"
              leftIcon={<Trash2 size={16} color={palette.warn} strokeWidth={1.8} />}
              onPress={confirmDelete}
            />
          </View>

          <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginTop: 28, marginBottom: 8 }}>
            마지막 물 · {formatMD(plant.lastWater)} · 마지막 비료 · {formatMD(plant.lastFert)}
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
