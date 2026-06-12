import { humanizeError } from '@/lib/errors';
import { haptics } from '@/lib/haptics';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/Typography';
import { repos } from '@/repo';
import { DesktopAddModal } from '@/screens/desktop/AddModal';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive, useTabletContentCap } from '@/theme/responsive';
import type { Plant } from '@/types/plant';
import { addDays, toISODate } from '@/utils/date';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Check, ChevronLeft, Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = [
  { n: 1, title: '어떤 식물인가요?', sub: '이름과 종류를 알려주세요.' },
  { n: 2, title: '어디에 두었나요?', sub: '공간에 따라 환경이 달라요.' },
  { n: 3, title: '돌보는 리듬은?',   sub: '물주기 주기를 정해주세요.' },
];

const CYCLES = [3, 5, 7, 10, 14, 21, 30];

export default function AddScreen() {
  const { isDesktop } = useResponsive();
  if (isDesktop) return <DesktopAddModal />;
  return <AddMobile />;
}

function AddMobile() {
  const { palette, radii, weights, resolved: themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const addPlant = usePlantStore((s) => s.addPlant);
  const locations = useLocationStore((s) => s.locations);

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [cycle, setCycle] = useState(7);
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [lightPref, setLightPref] = useState(3);
  const [humidityPref, setHumidityPref] = useState(3);
  const [busy, setBusy] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const cur = STEPS[step - 1];
  const formWidthCap = useTabletContentCap(560);

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
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const today = toISODate(new Date());
      const tempId = `plant-${Date.now().toString(36)}`;

      // Upload photo first if picked — we use tempId as the path prefix since
      // the plant's real UUID isn't known yet.
      let photoUrl: string | null = null;
      if (photoUri) {
        try {
          const uploaded = await repos.storage.uploadPhoto(tempId, photoUri);
          photoUrl = uploaded.publicUrl;
        } catch (e) {
          Alert.alert('사진 업로드 실패', humanizeError(e));
          setBusy(false);
          return;
        }
      }

      const plant: Plant = {
        id: tempId,
        name: name || '이름 없는 식물',
        species: species || '',
        location: location || '거실',
        // 광량/습도(현재 환경)는 location 의 lightScore/airflowScore 로 대체했고
        // 식물 단위 입력은 더 이상 받지 않는다 — 빈 문자열로 저장.
        light: '',
        humidity: '',
        waterCycle: cycle,
        fertCycle: 30,
        lastWater: today,
        lastFert: today,
        nextWater: addDays(today, cycle),
        note,
        color: '#4a6a4a',
        mood: 'tropical',
        photoUrl,
        speciesLightPref: lightPref,
        speciesHumidityPref: humidityPref,
      };
      await addPlant(plant);
      haptics.success();
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 1 && !name.trim()) {
      haptics.error();
      setStepError('식물 이름을 입력해주세요.');
      return;
    }
    // 공간이 하나라도 있으면 명시적으로 고르게 한다 — 예전엔 말없이
    // '거실'로 저장돼 사용자가 눈치채지 못했다. 공간이 0개인 신규
    // 계정만 기본값으로 통과시켜 진행이 막히지 않게 한다.
    if (step === 2 && locations.length > 0 && !location) {
      haptics.error();
      setStepError('식물을 둘 공간을 선택해주세요.');
      return;
    }
    setStepError(null);
    if (step < 3) setStep(step + 1);
    else submit();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
          style={{
            width: 36, height: 36, borderRadius: 10, backgroundColor: palette.surface,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronLeft size={16} color={palette.ink} strokeWidth={2} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
          {STEPS.map((s) => (
            <View
              key={s.n}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                backgroundColor: s.n <= step ? palette.green : palette.lineStrong,
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ padding: 24, paddingBottom: 40 }, formWidthCap]}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1.3 }}>
          STEP {step}/3
        </ThemedText>
        <ThemedText family="serif" style={{ fontSize: 32, lineHeight: 36, fontFamily: weights.serifRegular, letterSpacing: -0.3 }}>
          {cur.title}
        </ThemedText>
        <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 10, marginBottom: 28 }}>
          {cur.sub}
        </ThemedText>

        {step === 1 ? (
          <View style={{ gap: 16 }}>
            <Field label="식물 이름">
              <FormInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (stepError) setStepError(null);
                }}
                placeholder="예: 몬스테라"
                autoFocus
                returnKeyType="next"
              />
              {stepError && step === 1 ? (
                <ThemedText variant="tiny" color={palette.warn} style={{ marginTop: 6 }}>
                  {stepError}
                </ThemedText>
              ) : null}
            </Field>
            <Field label="학명 (선택)">
              <FormInput
                value={species}
                onChangeText={setSpecies}
                placeholder="Monstera deliciosa"
              />
            </Field>
            <Pressable
              onPress={pickPhoto}
              style={{
                height: 180,
                borderWidth: photoUri ? 0 : 1.5,
                borderStyle: 'dashed',
                borderColor: palette.lineStrong,
                borderRadius: radii.md,
                backgroundColor: palette.surface,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <>
                  <View
                    style={{
                      width: 44, height: 44, borderRadius: 22, backgroundColor: palette.greenBg,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Plus size={22} color={palette.green} strokeWidth={2} />
                  </View>
                  <ThemedText variant="meta" weight="medium" color={palette.ink2}>사진 추가</ThemedText>
                  <ThemedText variant="tiny" family="mono" color={palette.ink3}>권장 1:1</ThemedText>
                </>
              )}
            </Pressable>
            {photoUri ? (
              <Pressable onPress={() => setPhotoUri(null)} style={{ alignSelf: 'center', marginTop: 8 }}>
                <ThemedText variant="tiny" color={palette.ink3}>사진 제거</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 10 }}>
            {locations.map((loc) => {
              const active = location === loc.name;
              const count = usePlantStore
                .getState()
                .plants.filter((p) => p.location === loc.name).length;
              return (
                <Pressable
                  key={loc.id}
                  onPress={() => {
                    setLocation(loc.name);
                    setStepError(null);
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: active ? palette.green : palette.surface,
                    borderRadius: radii.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <ThemedText variant="body" weight="semibold" color={active ? palette.bg : palette.ink}>
                      {loc.name}
                    </ThemedText>
                    <ThemedText variant="meta" color={active ? palette.bg : palette.ink3} style={{ marginTop: 3, opacity: active ? 0.8 : 1 }}>
                      식물 {count}개
                    </ThemedText>
                  </View>
                  {active ? <Check size={18} color={palette.bg} strokeWidth={2.2} /> : null}
                </Pressable>
              );
            })}
            {locations.length === 0 ? (
              <ThemedText variant="meta" color={palette.ink3}>
                공간이 없어요. 설정 탭에서 추가해주세요.
              </ThemedText>
            ) : null}
            {stepError && step === 2 ? (
              <ThemedText variant="tiny" color={palette.warn} style={{ marginTop: 2 }}>
                {stepError}
              </ThemedText>
            ) : null}
          </View>
        ) : null}

        {step === 3 ? (
          <View>
            <Field label="물주기 주기">
              <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2, lineHeight: 16 }}>
                잘 모르겠다면 — 관엽 5~7일 · 허브 3~5일 · 다육/선인장 14~30일
              </ThemedText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {CYCLES.map((d) => {
                  const active = cycle === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setCycle(d)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: active ? palette.ink : palette.surface,
                      }}
                    >
                      <ThemedText variant="meta" weight="medium" color={active ? palette.bg : palette.ink}>
                        {d}일
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="이 식물이 좋아하는 빛 (1~5)" style={{ marginTop: 22 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = lightPref === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setLightPref(n)}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: 10,
                        backgroundColor: active ? palette.green : palette.surface,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText variant="meta" weight={active ? 'semibold' : 'medium'} color={active ? palette.bg : palette.ink}>
                        {n}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="이 식물이 좋아하는 습도 (1~5)" style={{ marginTop: 22 }}>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = humidityPref === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setHumidityPref(n)}
                      style={{
                        flex: 1, paddingVertical: 14, borderRadius: 10,
                        backgroundColor: active ? palette.green : palette.surface,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText variant="meta" weight={active ? 'semibold' : 'medium'} color={active ? palette.bg : palette.ink}>
                        {n}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="메모 (선택)" style={{ marginTop: 22 }}>
              <FormInput
                value={note}
                onChangeText={setNote}
                placeholder="이 식물에 대한 관찰이나 주의사항"
                multiline
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </Field>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14) + 10,
          backgroundColor: palette.bg,
        }}
      >
        <Pressable
          onPress={next}
          disabled={busy}
          style={[
            {
              paddingVertical: 16,
              borderRadius: 999,
              // In dark mode palette.ink is near-white, which produced an
              // unnaturally bright "white" CTA on a dark screen. Use the accent
              // green instead — both modes end up with comfortable contrast.
              backgroundColor: themeMode === 'dark' ? palette.green : palette.ink,
              alignItems: 'center',
              opacity: busy ? 0.6 : 1,
            },
            formWidthCap,
          ]}
        >
          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={palette.bg} />
              <ThemedText variant="body" weight="semibold" color={palette.bg} style={{ fontSize: 15 }}>
                저장 중…
              </ThemedText>
            </View>
          ) : (
            <ThemedText variant="body" weight="semibold" color={palette.bg} style={{ fontSize: 15 }}>
              {step < 3 ? '다음' : '식물 추가하기'}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  const { palette } = useTheme();
  return (
    <View style={style}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 8, letterSpacing: 1 }}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}
