import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/Typography';
import { useLocationStore } from '@/store/locations';
import { useTheme } from '@/theme/ThemeProvider';
import type { UserLocation } from '@/types/plant';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';

type Props = {
  visible: boolean;
  /** When set, the modal is in edit mode for that location. */
  editing: UserLocation | null;
  onClose: () => void;
};

const SCORE_HINT = {
  light:   ['아주 어두움', '어두움', '보통', '밝음', '직사광'],
  airflow: ['거의 없음', '약함', '보통', '잘 통함', '매우 잘 통함'],
  weather: ['거의 영향 없음', '약간', '보통', '꽤 영향 받음', '바깥과 비슷'],
};

export function LocationFormModal({ visible, editing, onClose }: Props) {
  const { palette, radii, shadows, weights } = useTheme();
  const add = useLocationStore((s) => s.add);
  const update = useLocationStore((s) => s.update);
  const locations = useLocationStore((s) => s.locations);

  const [name, setName] = useState('');
  const [lightScore, setLightScore] = useState(3);
  const [airflowScore, setAirflowScore] = useState(3);
  const [weatherScore, setWeatherScore] = useState(3);   // 1–5 → mapped to 0–1
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? '');
      setLightScore(editing?.lightScore ?? 3);
      setAirflowScore(editing?.airflowScore ?? 3);
      // Round 0–1 weatherWeight to nearest 1–5 bucket for the UI.
      setWeatherScore(editing ? Math.max(1, Math.min(5, Math.round(editing.weatherWeight * 4 + 1))) : 3);
    }
  }, [visible, editing]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('이름 필요', '공간 이름을 입력해주세요.'); return; }
    const dup = locations.find((l) => l.name === trimmed && l.id !== editing?.id);
    if (dup) { Alert.alert('중복', '같은 이름의 공간이 이미 있어요.'); return; }

    setBusy(true);
    try {
      // 1–5 UI → 0–1 stored weight ((score-1)/4)
      const weatherWeight = (weatherScore - 1) / 4;
      if (editing) {
        await update(editing.id, { name: trimmed, lightScore, airflowScore, weatherWeight });
      } else {
        await add({ name: trimmed, lightScore, airflowScore, weatherWeight });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: palette.backdrop,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: palette.surface,
            borderRadius: radii.lg,
            overflow: 'hidden',
            ...shadows.lg,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 18,
              borderBottomWidth: 1,
              borderColor: palette.line,
            }}
          >
            <ThemedText family="serif" style={{ fontSize: 22, fontFamily: weights.serifRegular }}>
              {editing ? '공간 수정' : '새 공간 추가'}
            </ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={palette.ink3} strokeWidth={1.8} />
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 22 }}>
            <View>
              <ThemedText
                variant="tiny"
                family="mono"
                uppercase
                color={palette.ink3}
                style={{ marginBottom: 8, letterSpacing: 1 }}
              >
                이름
              </ThemedText>
              <FormInput
                value={name}
                onChangeText={setName}
                placeholder="예: 온실장, 작업실"
                autoFocus={!editing}
                style={{
                  paddingHorizontal: 14,
                  fontSize: 16,
                  backgroundColor: palette.surfaceRaised,
                }}
              />
            </View>

            <ScoreField
              label="일조량"
              value={lightScore}
              onChange={setLightScore}
              hints={SCORE_HINT.light}
            />
            <ScoreField
              label="공기 순환"
              value={airflowScore}
              onChange={setAirflowScore}
              hints={SCORE_HINT.airflow}
            />
            <ScoreField
              label="바깥 날씨 영향"
              value={weatherScore}
              onChange={setWeatherScore}
              hints={SCORE_HINT.weather}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              padding: 16,
              borderTopWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surfaceRaised,
            }}
          >
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: palette.lineStrong,
                alignItems: 'center',
              }}
            >
              <ThemedText variant="meta" weight="medium" color={palette.ink2}>취소</ThemedText>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={busy}
              style={{
                flex: 2,
                paddingVertical: 14,
                borderRadius: 999,
                backgroundColor: palette.green,
                alignItems: 'center',
                opacity: busy ? 0.6 : 1,
              }}
            >
              <ThemedText variant="meta" weight="semibold" color={palette.bg}>
                {busy ? '저장 중…' : (editing ? '수정' : '추가')}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ScoreField({
  label, value, onChange, hints,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hints: string[];
}) {
  const { palette } = useTheme();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1 }}>
          {label}
        </ThemedText>
        <ThemedText variant="tiny" color={palette.ink2}>
          {value} · {hints[value - 1]}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 10,
                backgroundColor: active ? palette.green : palette.surfaceRaised,
                borderWidth: 1,
                borderColor: active ? palette.green : palette.line,
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
    </View>
  );
}
