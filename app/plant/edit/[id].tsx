import { ThemedText } from '@/components/Typography';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CYCLES = [3, 5, 7, 10, 14, 21, 30];
const FERT_CYCLES = [7, 14, 21, 30, 45, 60, 90];
const LIGHTS = ['강한 직사광', '밝은 간접광', '반그늘', '약한 그늘'];
const HUMIDITIES = ['매우 높음', '높음', '보통', '낮음'];

export default function PlantEditScreen() {
  const { palette, radii, weights } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const locations = useLocationStore((s) => s.locations);

  const [name, setName] = useState(plant?.name ?? '');
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [location, setLocation] = useState(plant?.location ?? '거실');
  const [cycle, setCycle] = useState(plant?.waterCycle ?? 7);
  const [fertCycle, setFertCycle] = useState(plant?.fertCycle ?? 30);
  const [lastWater, setLastWater] = useState(plant?.lastWater ?? '');
  const [lastFert, setLastFert] = useState(plant?.lastFert ?? '');
  const [light, setLight] = useState(plant?.light ?? '밝은 간접광');
  const [humidity, setHumidity] = useState(plant?.humidity ?? '보통');
  const [note, setNote] = useState(plant?.note ?? '');
  const [lightPref, setLightPref] = useState<number>(plant?.speciesLightPref ?? 3);
  const [humidityPref, setHumidityPref] = useState<number>(plant?.speciesHumidityPref ?? 3);
  const [busy, setBusy] = useState(false);

  if (!plant) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ThemedText color={palette.ink3}>식물을 찾을 수 없어요.</ThemedText>
      </View>
    );
  }

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updatePlant(plant.id, {
        name: name.trim() || plant.name,
        species: species.trim(),
        location,
        waterCycle: cycle,
        fertCycle,
        lastWater: lastWater || plant.lastWater,
        lastFert: lastFert || plant.lastFert,
        light,
        humidity,
        note,
        speciesLightPref: lightPref,
        speciesHumidityPref: humidityPref,
      });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: radii.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    fontSize: 15,
    fontFamily: weights.sansRegular,
    color: palette.ink,
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View
        style={{
          // iOS modal presentation already adds the rounded grabber area at
          // the top — stacking another insets.top here pushes the header way
          // below the visible edge. A small fixed pad keeps it close to the top.
          paddingTop: 14,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderColor: palette.line,
          backgroundColor: palette.bg,
        }}
      >
        <Pressable onPress={() => router.back()} disabled={busy} hitSlop={8}>
          <ThemedText variant="meta" color={palette.ink2}>취소</ThemedText>
        </Pressable>
        <ThemedText variant="subsection" family="serif">
          정보 수정
        </ThemedText>
        <Pressable onPress={save} disabled={busy} hitSlop={8}>
          {busy ? (
            <ActivityIndicator color={palette.green} />
          ) : (
            <ThemedText variant="meta" weight="semibold" color={palette.green}>
              저장
            </ThemedText>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="이름">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="애칭"
            placeholderTextColor={palette.ink3}
            style={inputStyle}
          />
        </Field>

        <Field label="학명 (선택)">
          <TextInput
            value={species}
            onChangeText={setSpecies}
            placeholder="Monstera deliciosa"
            placeholderTextColor={palette.ink3}
            style={inputStyle}
          />
        </Field>

        <Field label="공간">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {locations.map((loc) => {
              const active = location === loc.name;
              return (
                <Pressable
                  key={loc.id}
                  onPress={() => setLocation(loc.name)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
                    backgroundColor: active ? palette.green : palette.surface,
                  }}
                >
                  <ThemedText variant="meta" weight="medium" color={active ? palette.bg : palette.ink}>
                    {loc.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="물주기 주기">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
          <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 6 }}>
            변경 시 다음 물주기 날짜는 마지막 물 준 날 기준으로 재계산돼요.
          </ThemedText>
        </Field>

        <Field label="비료 주기">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FERT_CYCLES.map((d) => {
              const active = fertCycle === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setFertCycle(d)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: active ? palette.bloom : palette.surface,
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

        <Field label="마지막 물 준 날">
          <TextInput
            value={lastWater}
            onChangeText={setLastWater}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.ink3}
            style={{ ...inputStyle, fontFamily: weights.monoMedium }}
          />
        </Field>

        <Field label="마지막 비료 준 날">
          <TextInput
            value={lastFert}
            onChangeText={setLastFert}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.ink3}
            style={{ ...inputStyle, fontFamily: weights.monoMedium }}
          />
        </Field>

        <Field label="광량">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LIGHTS.map((l) => {
              const active = light === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => setLight(l)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12,
                    backgroundColor: active ? palette.greenBg : palette.surface,
                    borderWidth: 1.5,
                    borderColor: active ? palette.green : 'transparent',
                    width: '48%',
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="meta" weight={active ? 'semibold' : 'medium'}>
                    {l}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="습도">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HUMIDITIES.map((h) => {
              const active = humidity === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setHumidity(h)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 12,
                    backgroundColor: active ? palette.greenBg : palette.surface,
                    borderWidth: 1.5,
                    borderColor: active ? palette.green : 'transparent',
                    width: '48%',
                    alignItems: 'center',
                  }}
                >
                  <ThemedText variant="meta" weight={active ? 'semibold' : 'medium'}>
                    {h}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="이 식물이 좋아하는 빛 (1~5)">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = lightPref === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setLightPref(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10,
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

        <Field label="이 식물이 좋아하는 습도 (1~5)">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = humidityPref === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setHumidityPref(n)}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10,
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

        <Field label="메모">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="관찰이나 돌봄 메모"
            placeholderTextColor={palette.ink3}
            multiline
            style={{
              ...inputStyle,
              minHeight: 100,
              textAlignVertical: 'top',
            }}
          />
        </Field>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { palette } = useTheme();
  return (
    <View>
      <ThemedText
        variant="tiny"
        family="mono"
        uppercase
        color={palette.ink3}
        style={{ marginBottom: 8, letterSpacing: 1 }}
      >
        {label}
      </ThemedText>
      {children}
    </View>
  );
}
