import { BottomSheet } from '@/components/BottomSheet';
import { CalendarPicker } from '@/components/CalendarPicker';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/Typography';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import { toISODate } from '@/utils/date';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CYCLES = [3, 5, 7, 10, 14, 21, 30];
// 30일까지는 일 단위, 그 이후는 1~6달을 한 달 간격으로 노출.
const FERT_CYCLES = [7, 14, 21, 30, 60, 90, 120, 150, 180];
const fertCycleLabel = (d: number) => (d < 30 ? `${d}일` : `${d / 30}달`);

export default function PlantEditScreen() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();
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
  const [note, setNote] = useState(plant?.note ?? '');
  const [lightPref, setLightPref] = useState<number>(plant?.speciesLightPref ?? 3);
  const [humidityPref, setHumidityPref] = useState<number>(plant?.speciesHumidityPref ?? 3);
  const [busy, setBusy] = useState(false);
  const [pickerFor, setPickerFor] = useState<null | 'water' | 'fert'>(null);
  const today = toISODate(new Date());

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
        note,
        speciesLightPref: lightPref,
        speciesHumidityPref: humidityPref,
      });
      router.back();
    } finally {
      setBusy(false);
    }
  };

  // 태블릿에서는 모바일 모달이 전체 폭으로 늘어지므로 폼 폭을 묶는다.
  const formWidthCap = isTablet
    ? ({ maxWidth: 560, width: '100%', alignSelf: 'center' } as const)
    : null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        contentContainerStyle={[{ padding: 24, paddingBottom: 48, gap: 18 }, formWidthCap]}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="이름">
          <FormInput value={name} onChangeText={setName} placeholder="애칭" />
        </Field>

        <Field label="학명 (선택)">
          <FormInput value={species} onChangeText={setSpecies} placeholder="Monstera deliciosa" />
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
                    {fertCycleLabel(d)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="마지막 물 준 날">
          <DatePickerField
            value={lastWater}
            onPress={() => setPickerFor('water')}
          />
        </Field>

        <Field label="마지막 비료 준 날">
          <DatePickerField
            value={lastFert}
            onPress={() => setPickerFor('fert')}
          />
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
          <FormInput
            value={note}
            onChangeText={setNote}
            placeholder="관찰이나 돌봄 메모"
            multiline
            style={{ minHeight: 100, textAlignVertical: 'top' }}
          />
        </Field>
      </ScrollView>

      <BottomSheet visible={pickerFor !== null} onClose={() => setPickerFor(null)} maxHeight={0.7}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 }}>
          <ThemedText
            variant="tiny"
            family="mono"
            uppercase
            color={palette.ink3}
            style={{ marginBottom: 12, letterSpacing: 1 }}
          >
            {pickerFor === 'fert' ? '마지막 비료 준 날' : '마지막 물 준 날'}
          </ThemedText>
          <CalendarPicker
            value={
              (pickerFor === 'fert' ? lastFert : lastWater) || today
            }
            onChange={(iso) => {
              if (pickerFor === 'fert') setLastFert(iso);
              else setLastWater(iso);
              setPickerFor(null);
            }}
          />
        </View>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

function DatePickerField({ value, onPress }: { value: string; onPress: () => void }) {
  const { palette, radii, weights } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: radii.sm,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <ThemedText
        variant="body"
        color={value ? palette.ink : palette.ink3}
        style={{ fontFamily: weights.monoMedium, fontSize: 15 }}
      >
        {value || '날짜 선택'}
      </ThemedText>
      <CalendarDays size={16} color={palette.ink3} strokeWidth={1.8} />
    </Pressable>
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
