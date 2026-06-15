import { BottomSheet } from '@/components/BottomSheet';
import { CalendarPicker } from '@/components/CalendarPicker';
import { FormInput } from '@/components/FormInput';
import { haptics } from '@/lib/haptics';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import { addDays, formatMD, toISODate } from '@/utils/date';
import { CalendarDays, Droplet, Flower2, Scissors, Sprout, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

export type CareKind = 'water' | 'fert' | 'prune' | 'repot';

type Props = {
  visible: boolean;
  kind: CareKind;
  plantName: string;
  onClose: () => void;
  onSubmit: (date: string, note: string) => void;
};

const META: Record<CareKind, { Icon: typeof Droplet; color: (p: ReturnType<typeof useTheme>['palette']) => string }> = {
  water: { Icon: Droplet, color: (p) => p.drop },
  fert:  { Icon: Flower2, color: (p) => p.bloom },
  prune: { Icon: Scissors, color: (p) => p.ink2 },
  repot: { Icon: Sprout, color: (p) => p.earth },
};

export function CareLogSheet({ visible, kind, plantName, onClose, onSubmit }: Props) {
  const { t } = useTranslation();
  const { palette, weights } = useTheme();
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const meta = META[kind];
  const Icon = meta.Icon;
  const accent = meta.color(palette);
  const title = t(`components.careLog.${kind}.title`);
  const verb = t(`components.careLog.${kind}.verb`);
  const placeholder = t(`components.careLog.${kind}.placeholder`);

  useEffect(() => {
    if (visible) {
      setDate(toISODate(new Date()));
      setNote('');
      setCalendarOpen(false);
    }
  }, [visible, kind]);

  const presets = [0, -1, -2, -3].map((offset) => {
    const iso = addDays(toISODate(new Date()), offset);
    const label = offset === 0 ? t('common.today') : offset === -1 ? t('components.careLog.yesterday') : offset === -2 ? t('components.careLog.dayBeforeYesterday') : t('components.careLog.daysAgo', { n: -offset });
    return { iso, label };
  });
  const isPresetActive = (iso: string) => presets.some((p) => p.iso === iso);

  const submit = () => {
    haptics.success();
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
                {title}
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
          {t('components.careLog.whenLabel')}
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
              {!isPresetActive(date) ? formatMD(date) : t('components.careLog.pickAnotherDate')}
            </ThemedText>
          </View>
          <ThemedText variant="tiny" color={palette.ink3}>
            {calendarOpen ? t('common.close') : t('components.careLog.openCalendar')}
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
          {t('components.careLog.memoLabel')}
        </ThemedText>
        <FormInput
          value={note}
          onChangeText={setNote}
          placeholder={placeholder}
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
            {verb}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
