import { BottomSheet } from '@/components/BottomSheet';
import { CalendarPicker } from '@/components/CalendarPicker';
import { FormInput } from '@/components/FormInput';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import { addDays, formatMD, toISODate } from '@/utils/date';
import { CalendarDays, Droplet, Flower2, Scissors, Sprout, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

export type CareKind = 'water' | 'fert' | 'prune' | 'repot';

type Props = {
  visible: boolean;
  kind: CareKind;
  plantName: string;
  onClose: () => void;
  onSubmit: (date: string, note: string) => void;
};

const META: Record<CareKind, { title: string; verb: string; Icon: typeof Droplet; color: (p: ReturnType<typeof useTheme>['palette']) => string; placeholder: string }> = {
  water: { title: '물주기', verb: '물 줬어요', Icon: Droplet, color: (p) => p.drop, placeholder: '간단한 메모' },
  fert:  { title: '비료',   verb: '비료 줬어요', Icon: Flower2, color: (p) => p.bloom, placeholder: '예: 하이포넥스 1000배' },
  prune: { title: '가지치기', verb: '가지치기 했어요', Icon: Scissors, color: (p) => p.ink2, placeholder: '예: 긴 덩굴 15cm 정리' },
  repot: { title: '분갈이', verb: '분갈이 했어요', Icon: Sprout, color: (p) => p.earth, placeholder: '예: 한 치수 큰 분으로 / 수태믹스' },
};

export function CareLogSheet({ visible, kind, plantName, onClose, onSubmit }: Props) {
  const { palette, weights } = useTheme();
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const meta = META[kind];
  const Icon = meta.Icon;
  const accent = meta.color(palette);

  useEffect(() => {
    if (visible) {
      setDate(toISODate(new Date()));
      setNote('');
      setCalendarOpen(false);
    }
  }, [visible, kind]);

  const presets = [0, -1, -2, -3].map((offset) => {
    const iso = addDays(toISODate(new Date()), offset);
    const label = offset === 0 ? '오늘' : offset === -1 ? '어제' : offset === -2 ? '그제' : `${-offset}일 전`;
    return { iso, label };
  });
  const isPresetActive = (iso: string) => presets.some((p) => p.iso === iso);

  const submit = () => {
    onSubmit(date, note);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.92}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: accent + '22',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon size={18} color={accent} strokeWidth={2} fill={kind === 'water' ? accent : 'none'} />
            </View>
            <View>
              <ThemedText family="serif" style={{ fontSize: 22, fontFamily: weights.serifRegular }}>
                {meta.title}
              </ThemedText>
              <ThemedText variant="tiny" color={palette.ink3}>
                {plantName}
              </ThemedText>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
            <X size={20} color={palette.ink3} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Date selection */}
        <ThemedText
          variant="tiny" family="mono" uppercase color={palette.ink3}
          style={{ marginTop: 22, marginBottom: 8, letterSpacing: 1 }}
        >
          언제 했어요?
        </ThemedText>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {presets.map((p) => {
            const active = date === p.iso;
            return (
              <Pressable
                key={p.iso}
                onPress={() => { setDate(p.iso); setCalendarOpen(false); }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? palette.green : palette.line,
                  backgroundColor: active ? palette.greenBg : palette.surfaceRaised,
                  alignItems: 'center',
                }}
              >
                <ThemedText variant="meta" weight={active ? 'semibold' : 'medium'} color={active ? palette.greenDeep : palette.ink}>
                  {p.label}
                </ThemedText>
                <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
                  {formatMD(p.iso)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => setCalendarOpen((v) => !v)}
          style={{
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: !isPresetActive(date) || calendarOpen ? palette.green : palette.line,
            backgroundColor: !isPresetActive(date) ? palette.greenBg : palette.surfaceRaised,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CalendarDays size={18} color={!isPresetActive(date) ? palette.greenDeep : palette.ink2} strokeWidth={1.8} />
            <ThemedText variant="meta" weight="medium" color={!isPresetActive(date) ? palette.greenDeep : palette.ink}>
              {!isPresetActive(date) ? formatMD(date) : '다른 날짜 선택'}
            </ThemedText>
          </View>
          <ThemedText variant="tiny" color={palette.ink3}>
            {calendarOpen ? '닫기' : '달력 열기'}
          </ThemedText>
        </Pressable>

        {calendarOpen ? (
          <View
            style={{
              marginTop: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surfaceRaised,
            }}
          >
            <CalendarPicker
              value={date}
              onChange={(iso) => { setDate(iso); setCalendarOpen(false); }}
            />
          </View>
        ) : null}

        {/* Note */}
        <ThemedText
          variant="tiny" family="mono" uppercase color={palette.ink3}
          style={{ marginTop: 18, marginBottom: 6, letterSpacing: 1 }}
        >
          메모 (선택)
        </ThemedText>
        <FormInput
          value={note}
          onChangeText={setNote}
          placeholder={meta.placeholder}
          multiline
          style={{
            minHeight: 60, paddingVertical: 12, paddingHorizontal: 14,
            textAlignVertical: 'top', backgroundColor: palette.surfaceRaised,
          }}
        />

        <Pressable
          onPress={submit}
          style={{
            marginTop: 18,
            paddingVertical: 16,
            borderRadius: 999,
            backgroundColor: accent,
            alignItems: 'center',
          }}
        >
          <ThemedText variant="body" weight="semibold" color={palette.bg}>
            {meta.verb}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
