import { Button } from '@/components/Button';
import { HoverPressable } from '@/components/HoverPressable';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { SEED_PLANTS } from '@/data/plants';
import { repos } from '@/repo';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant, PlantMood } from '@/types/plant';
import { addDays, toISODate } from '@/utils/date';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, TextInput, View } from 'react-native';

const STEP_TITLES = ['어떤 식물인가요?', '이름과 공간을 알려주세요', '돌보는 리듬과 환경을 설정할게요'];
const CYCLES = [3, 5, 7, 10, 14];
const LIGHTS = ['강한 직사광', '밝은 간접광', '반그늘', '약한 그늘'];
const HUMIDITIES = ['매우 높음', '높음', '보통', '낮음'];

export function DesktopAddModal() {
  const { palette, radii, shadows, weights } = useTheme();
  const router = useRouter();
  const addPlant = usePlantStore((s) => s.addPlant);
  const locations = useLocationStore((s) => s.locations);

  const [step, setStep] = useState(0);
  const [seed, setSeed] = useState<(typeof SEED_PLANTS)[number] | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [cycle, setCycle] = useState(7);
  const [lastWater, setLastWater] = useState(toISODate(new Date()));
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [light, setLight] = useState<string>('밝은 간접광');
  const [humidity, setHumidity] = useState<string>('보통');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => router.back();

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진첩 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const base = seed ?? SEED_PLANTS[0];
      const tempId = `plant-${Date.now().toString(36)}`;

      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          const uploaded = await repos.storage.uploadPhoto(tempId, photoUri);
          photoUrl = uploaded.publicUrl;
        } catch (e) {
          Alert.alert('사진 업로드 실패', (e as Error).message);
          setBusy(false);
          return;
        }
      }

      const plant: Plant = {
        id: tempId,
        name: name || base.name,
        species: base.species,
        location: location || '거실',
        light,
        humidity,
        waterCycle: cycle,
        fertCycle: base.fertCycle,
        lastWater,
        lastFert: lastWater,
        nextWater: addDays(lastWater, cycle),
        note,
        color: base.color,
        mood: (base.mood as PlantMood) ?? 'tropical',
        photoUrl,
      };
      await addPlant(plant);
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(15,18,15,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
      }}
    >
      {/* Backdrop */}
      <Pressable onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Card */}
      <View
        style={{
          width: 560,
          maxHeight: '90%',
          backgroundColor: palette.surface,
          borderRadius: 22,
          overflow: 'hidden',
          ...shadows.lg,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingVertical: 20,
            paddingHorizontal: 28,
            borderBottomWidth: 1,
            borderColor: palette.line,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <View>
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1.4, marginBottom: 4 }}>
              단계 {step + 1} / 3
            </ThemedText>
            <ThemedText family="serif" style={{ fontSize: 24, lineHeight: 28, fontFamily: weights.serifRegular }}>
              {STEP_TITLES[step]}
            </ThemedText>
          </View>
          <Pressable onPress={close} hitSlop={8} style={{ padding: 8 }}>
            <X size={20} color={palette.ink3} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Body */}
        <ScrollView style={{ minHeight: 280 }} contentContainerStyle={{ padding: 28 }}>
          {step === 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {SEED_PLANTS.slice(0, 6).map((p) => {
                const active = seed?.id === p.id;
                return (
                  <View key={p.id} style={{ width: '33.333%', padding: 6 }}>
                    <HoverPressable
                      onPress={() => setSeed(p)}
                      style={({ hovered, focused }) => ({
                        backgroundColor: palette.surfaceRaised,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? palette.green : hovered ? palette.lineStrong : palette.line,
                        borderRadius: radii.md,
                        overflow: 'hidden',
                        transform: hovered ? [{ translateY: -3 }] : undefined,
                        ...(hovered ? shadows.md : shadows.xs),
                        ...(focused ? ({ boxShadow: `0 0 0 2px ${palette.green}` } as object) : {}),
                      })}
                    >
                      <View style={{ aspectRatio: 1 }}>
                        <PlantThumb plant={p} size={120} style={{ width: '100%', height: '100%' }} />
                      </View>
                      <View style={{ padding: 10 }}>
                        <ThemedText variant="tiny" weight="semibold" style={{ fontSize: 12, textAlign: 'center' }} numberOfLines={1}>
                          {p.species}
                        </ThemedText>
                      </View>
                    </HoverPressable>
                  </View>
                );
              })}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={{ gap: 18 }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable
                  onPress={pickPhoto}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: radii.md,
                    overflow: 'hidden',
                    backgroundColor: palette.surface,
                    borderWidth: photoUri ? 0 : 1.5,
                    borderStyle: 'dashed',
                    borderColor: palette.lineStrong,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {photoUri ? (
                    <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <View
                        style={{
                          width: 34, height: 34, borderRadius: 17, backgroundColor: palette.greenBg,
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Plus size={18} color={palette.green} strokeWidth={2} />
                      </View>
                      <ThemedText variant="tiny" color={palette.ink3}>사진 추가</ThemedText>
                    </View>
                  )}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 6 }}>
                    애칭
                  </ThemedText>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="예: 초록이"
                    placeholderTextColor={palette.ink3}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 14,
                      fontSize: 15,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: palette.lineStrong,
                      backgroundColor: palette.surfaceRaised,
                      fontFamily: weights.sansRegular,
                      color: palette.ink,
                    }}
                  />
                </View>
              </View>
              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 8 }}>
                  공간
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                  {locations.map((l) => {
                    const active = location === l.name;
                    return (
                      <View key={l.id} style={{ width: '25%', padding: 4 }}>
                        <Button
                          variant={active ? 'primary' : 'ghost'}
                          size="sm"
                          fullWidth
                          label={l.name}
                          onPress={() => setLocation(l.name)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          {step === 2 ? (
            <View style={{ gap: 18 }}>
              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 8 }}>
                  물주기 주기
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                  {CYCLES.map((d) => {
                    const active = cycle === d;
                    return (
                      <View key={d} style={{ width: '20%', padding: 4 }}>
                        <HoverPressable
                          onPress={() => setCycle(d)}
                          style={({ hovered, focused }) => ({
                            paddingVertical: 14,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: active ? palette.green : hovered ? palette.ink3 : palette.lineStrong,
                            backgroundColor: active ? palette.greenBg : 'transparent',
                            alignItems: 'center',
                            ...(focused ? ({ boxShadow: `0 0 0 3px ${palette.greenSoft}` } as object) : {}),
                          })}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                            <ThemedText family="serif" style={{ fontSize: 20, fontFamily: weights.serifRegular }}>
                              {d}
                            </ThemedText>
                            <ThemedText variant="tiny" color={palette.ink3}>
                              일
                            </ThemedText>
                          </View>
                        </HoverPressable>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 6 }}>
                  마지막 물 준 날
                </ThemedText>
                <TextInput
                  value={lastWater}
                  onChangeText={setLastWater}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.ink3}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    fontSize: 15,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: palette.lineStrong,
                    backgroundColor: palette.surfaceRaised,
                    fontFamily: weights.monoMedium,
                    color: palette.ink,
                  }}
                />
              </View>

              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 8 }}>
                  광량
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                  {LIGHTS.map((l) => {
                    const active = light === l;
                    return (
                      <View key={l} style={{ width: '25%', padding: 4 }}>
                        <Button
                          variant={active ? 'primary' : 'ghost'}
                          size="sm"
                          fullWidth
                          label={l}
                          onPress={() => setLight(l)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 8 }}>
                  습도
                </ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                  {HUMIDITIES.map((h) => {
                    const active = humidity === h;
                    return (
                      <View key={h} style={{ width: '25%', padding: 4 }}>
                        <Button
                          variant={active ? 'primary' : 'ghost'}
                          size="sm"
                          fullWidth
                          label={h}
                          onPress={() => setHumidity(h)}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>

              <View>
                <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1, marginBottom: 6 }}>
                  메모 (선택)
                </ThemedText>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="이 식물에 대한 관찰이나 주의사항"
                  placeholderTextColor={palette.ink3}
                  multiline
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    fontSize: 15,
                    minHeight: 72,
                    textAlignVertical: 'top',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: palette.lineStrong,
                    backgroundColor: palette.surfaceRaised,
                    fontFamily: weights.sansRegular,
                    color: palette.ink,
                  }}
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 16,
            paddingHorizontal: 28,
            borderTopWidth: 1,
            borderColor: palette.line,
            backgroundColor: palette.surfaceRaised,
          }}
        >
          <Button
            variant="ghost"
            label={step > 0 ? '이전' : '취소'}
            onPress={() => (step > 0 ? setStep(step - 1) : close())}
            disabled={busy}
          />
          <Button
            label={step < 2 ? '다음' : busy ? '저장 중…' : '완료'}
            onPress={() => (step < 2 ? setStep(step + 1) : submit())}
            disabled={busy}
          />
        </View>
      </View>
    </View>
  );
}
