import { humanizeError } from '@/lib/errors';
import { EmptyState } from '@/components/EmptyState';
import { ActionSheet, type ActionItem } from '@/components/ActionSheet';
import { BottomSheet } from '@/components/BottomSheet';
import { CareLogSheet, type CareKind } from '@/components/CareLogSheet';
import { PlantThumb } from '@/components/PlantThumb';
import { ThemedText } from '@/components/Typography';
import { repos } from '@/repo';
import { DesktopDetail } from '@/screens/desktop/Detail';
import { usePlantStore } from '@/store/plants';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import type { LogEntry, Plant } from '@/types/plant';
import { TODAY, daysBetween, formatMD, parseISODate, toISODate } from '@/utils/date';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, ChevronLeft, Droplet, Flower2, MoreHorizontal, Pencil, Scissors, Sprout, Sun, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { Tap } from '@/components/Tap';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Tab = 'care' | 'env' | 'history';

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { palette } = useTheme();
  const { isDesktop } = useResponsive();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));

  if (!plant) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ThemedText color={palette.ink3}>찾을 수 없는 식물이에요.</ThemedText>
      </View>
    );
  }
  if (isDesktop) return <DesktopDetail plant={plant} />;
  return <DetailMobile plant={plant} />;
}

function DetailMobile({ plant }: { plant: Plant }) {
  const { palette, radii, shadows, weights, resolved } = useTheme();
  const insets = useSafeAreaInsets();

  // Floating buttons sit on top of a dark-gradient hero image — we want a
  // subtle contrast-aware pill: white-translucent in light mode, dark-translucent in dark.
  const overlayBg = resolved === 'dark' ? 'rgba(37,42,42,0.9)' : 'rgba(255,255,255,0.95)';
  const log = usePlantStore((s) => s.log);
  const waterPlant = usePlantStore((s) => s.waterPlant);
  const fertilize = usePlantStore((s) => s.fertilizePlant);
  const deletePlant = usePlantStore((s) => s.deletePlant);
  const updatePlantPhoto = usePlantStore((s) => s.updatePlantPhoto);
  const logPhoto = usePlantStore((s) => s.logPhoto);
  const logAction = usePlantStore((s) => s.logAction);

  const [careSheet, setCareSheet] = useState<CareKind | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);

  const onCareSubmit = (date: string, note: string) => {
    if (careSheet === 'water') waterPlant(plant.id, { date, note });
    else if (careSheet === 'fert') fertilize(plant.id, { date, note });
    else if (careSheet === 'prune') logAction(plant.id, 'prune', { date, note });
    else if (careSheet === 'repot') logAction(plant.id, 'repot', { date, note });
  };
  const [tab, setTab] = useState<Tab>('care');

  const thisLog = useMemo(() => log.filter((l) => l.plantId === plant.id), [log, plant.id]);

  const effectiveDate = plant.recommendedNextWater ?? plant.nextWater;
  const wDays = daysBetween(TODAY, effectiveDate);
  const wLabel = wDays < 0 ? `${-wDays}d 지남` : wDays === 0 ? '오늘' : `${wDays}d`;
  const wTone = wDays < 0 ? palette.warn : wDays === 0 ? palette.drop : palette.ink;

  // Next fertilizer = last_fert + fert_cycle. Show D-day relative to today.
  const fertNextDate = (() => {
    try {
      const d = parseISODate(plant.lastFert);
      d.setDate(d.getDate() + plant.fertCycle);
      return toISODate(d);
    } catch { return plant.lastFert; }
  })();
  const fDays = daysBetween(TODAY, fertNextDate);
  const fLabel = fDays < 0 ? `${-fDays}d 지남` : fDays === 0 ? '오늘' : `${fDays}d`;
  const fTone = fDays < 0 ? palette.warn : fDays <= 7 ? palette.bloom : palette.ink;

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
      Alert.alert('사진 교체 실패', humanizeError(e));
    }
  };

  const confirmDelete = () => {
    Alert.alert(plant.name, '정말 삭제할까요? 기록은 보존돼요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          await deletePlant(plant.id);
          router.back();
        },
      },
    ]);
  };

  const editPlant = () => {
    router.push(`/plant/edit/${plant.id}` as never);
  };

  const addPhotoLog = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      const uploaded = await repos.storage.uploadPhoto(plant.id, result.assets[0].uri);
      await logPhoto(plant.id, uploaded.publicUrl);
    } catch (e) {
      Alert.alert('사진 기록 실패', humanizeError(e));
    }
  };

  const menuActions: ActionItem[] = [
    {
      key: 'edit',
      label: '정보 수정',
      sub: '이름·주기·환경 등',
      icon: <Pencil size={18} color={palette.ink2} strokeWidth={1.8} />,
      onPress: editPlant,
    },
    {
      key: 'photo',
      label: '대표 사진 교체',
      sub: '카드와 상세에 보이는 사진',
      icon: <Camera size={18} color={palette.ink2} strokeWidth={1.8} />,
      onPress: changePhoto,
    },
    {
      key: 'delete',
      label: '식물 삭제',
      sub: '기록은 보존돼요',
      icon: <Trash2 size={18} color={palette.warn} strokeWidth={1.8} />,
      destructive: true,
      onPress: confirmDelete,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
      <View style={{ height: 340, position: 'relative' }}>
        <PlantThumb plant={plant} style={{ width: '100%', height: '100%' }} size={400} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
        />

        <View style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
          {plant.species ? (
            <ThemedText
              variant="tiny"
              family="mono"
              uppercase
              color="rgba(255,255,255,0.85)"
              style={{ marginBottom: 8, letterSpacing: 1.4 }}
            >
              {plant.species}
            </ThemedText>
          ) : null}
          <ThemedText
            family="serif"
            style={{ fontSize: 38, lineHeight: 40, color: '#FFFFFF', fontFamily: weights.serifRegular, letterSpacing: -0.4 }}
          >
            {plant.name}
          </ThemedText>
        </View>
      </View>

      <View
        style={{
          marginTop: -24,
          marginHorizontal: 20,
          backgroundColor: palette.surfaceRaised,
          borderRadius: radii.lg,
          padding: 18,
          flexDirection: 'row',
          ...shadows.md,
        }}
      >
        <Tap onPress={() => setReasonOpen(true)} style={{ flex: 1 }}>
          <StatCell
            label={plant.recommendedNextWater ? '추천 물주기' : '다음 물'}
            value={wLabel}
            color={wTone}
            badge={plant.recommendationDelta != null && plant.recommendationDelta !== 0
              ? (plant.recommendationDelta > 0 ? `↑ +${plant.recommendationDelta}` : `↓ ${plant.recommendationDelta}`)
              : undefined}
          />
        </Tap>
        <Divider palette={palette} />
        <StatCell label="다음 비료" value={fLabel} color={fTone} />
        <Divider palette={palette} />
        <StatCell label="습도" value={shortHumidity(plant.humidity)} color={palette.ink} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, gap: 10 }}
      >
        <QuickAction
          icon={<Droplet size={20} color={palette.drop} strokeWidth={1.8} fill={palette.drop} />}
          label="물주기"
          sub={`${plant.waterCycle}일 주기`}
          tone={palette.dropSoft}
          onPress={() => setCareSheet('water')}
        />
        <QuickAction
          icon={<Flower2 size={20} color={palette.bloom} strokeWidth={1.8} />}
          label="비료"
          sub={`${plant.fertCycle}일 주기`}
          tone={palette.bloomSoft}
          onPress={() => setCareSheet('fert')}
        />
        <QuickAction
          icon={<Scissors size={18} color={palette.ink2} strokeWidth={1.8} />}
          label="가지치기"
          sub="기록"
          tone={palette.surface}
          onPress={() => setCareSheet('prune')}
        />
        <QuickAction
          icon={<Sprout size={18} color={palette.earth} strokeWidth={1.8} />}
          label="분갈이"
          sub="기록"
          tone={palette.surface}
          onPress={() => setCareSheet('repot')}
        />
        <QuickAction
          icon={<Camera size={20} color={palette.ink2} strokeWidth={1.8} />}
          label="사진"
          sub="성장 기록"
          tone={palette.surface}
          onPress={addPhotoLog}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', gap: 24, borderBottomWidth: 1, borderColor: palette.line }}>
          {(
            [
              ['care', '돌봄'],
              ['env', '환경'],
              ['history', '기록'],
            ] as const
          ).map(([k, l]) => {
            const active = tab === k;
            return (
              <Pressable key={k} onPress={() => setTab(k)} style={{ paddingVertical: 12, marginBottom: -1 }}>
                <ThemedText variant="meta" weight="medium" color={active ? palette.ink : palette.ink3} style={{ fontSize: 14 }}>
                  {l}
                </ThemedText>
                <View
                  style={{
                    height: 2,
                    backgroundColor: active ? palette.green : 'transparent',
                    marginTop: 8,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
        {tab === 'care' && <CareTab plant={plant} />}
        {tab === 'env' && <EnvTab plant={plant} />}
        {tab === 'history' && <HistoryTab log={thisLog} />}
      </View>
    </ScrollView>

    <CareLogSheet
      visible={careSheet !== null}
      kind={careSheet ?? 'water'}
      plantName={plant.name}
      onClose={() => setCareSheet(null)}
      onSubmit={onCareSubmit}
    />

    <ActionSheet
      visible={menuOpen}
      onClose={() => setMenuOpen(false)}
      title={plant.name}
      actions={menuActions}
    />

    <RecommendationSheet
      visible={reasonOpen}
      plant={plant}
      onClose={() => setReasonOpen(false)}
    />

    {/* Floating header — outside the ScrollView so it stays anchored to the
        screen instead of scrolling with the hero image. */}
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 10,
      }}
    >
      <Tap
        onPress={() => router.back()}
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: overlayBg,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ChevronLeft size={18} color={palette.ink} strokeWidth={2} />
      </Tap>
      <Tap
        onPress={() => setMenuOpen(true)}
        style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: overlayBg,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <MoreHorizontal size={18} color={palette.ink} strokeWidth={2} />
      </Tap>
    </View>
    </View>
  );
}

function Divider({ palette }: { palette: ReturnType<typeof useTheme>['palette'] }) {
  return <View style={{ width: 1, backgroundColor: palette.line, alignSelf: 'stretch' }} />;
}

/**
 * Plant.humidity 는 "매우 높음 70%+" 처럼 자유 텍스트라 단순 split(' ')[0] 로
 * 앞 단어만 잘라쓰면 "매우" 같은 의미 없는 토막이 나온다. 한국어 직관에 맞춰
 * 알려진 4단계로 정규화해서 짧게 표기.
 */
function shortHumidity(raw: string | undefined): string {
  if (!raw) return '—';
  const s = raw.trim();
  if (s.includes('매우 높') || s.includes('70')) return '매우 높음';
  if (s.includes('높')) return '높음';
  if (s.includes('보통')) return '보통';
  if (s.includes('매우 낮')) return '매우 낮음';
  if (s.includes('낮')) return '낮음';
  return s.length > 6 ? s.slice(0, 6) + '…' : s;
}

function RecommendationSheet({ visible, plant, onClose }: { visible: boolean; plant: Plant; onClose: () => void }) {
  const { palette, radii, weights } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.65}>
      {/* paddingTop 16 — the BottomSheet's grabber sits in the same flex
          column, so the title needs breathing room or its top stroke clips. */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 28, paddingTop: 16, gap: 16 }}>
        <ThemedText family="serif" style={{ fontSize: 22, lineHeight: 30, fontFamily: weights.serifRegular }}>
          추천 물주기
        </ThemedText>
        <View style={{ padding: 16, backgroundColor: palette.greenBg, borderRadius: radii.md, gap: 6 }}>
          <ThemedText variant="tiny" family="mono" uppercase color={palette.greenDeep} style={{ letterSpacing: 1 }}>
            왜 이렇게 추천했어요?
          </ThemedText>
          <ThemedText variant="body" color={palette.ink} style={{ lineHeight: 22 }}>
            {plant.recommendationReason ?? '아직 환경 데이터가 모이지 않았어요. 위치 정보를 켜면 더 정확해져요.'}
          </ThemedText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, padding: 12, backgroundColor: palette.surface, borderRadius: radii.sm }}>
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>절대 주기</ThemedText>
            <ThemedText variant="body" weight="semibold" style={{ marginTop: 4 }}>
              {plant.waterCycle}일마다
            </ThemedText>
          </View>
          <View style={{ flex: 1, padding: 12, backgroundColor: palette.surface, borderRadius: radii.sm }}>
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>보정</ThemedText>
            <ThemedText variant="body" weight="semibold" color={(plant.recommendationDelta ?? 0) > 0 ? palette.bloom : (plant.recommendationDelta ?? 0) < 0 ? palette.drop : palette.ink} style={{ marginTop: 4 }}>
              {plant.recommendationDelta == null ? '—'
                : plant.recommendationDelta > 0 ? `+${plant.recommendationDelta}일`
                : plant.recommendationDelta < 0 ? `${plant.recommendationDelta}일`
                : '0일'}
            </ThemedText>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

function StatCell({ label, value, color, badge }: { label: string; value: string; color: string; badge?: string }) {
  const { palette, weights } = useTheme();
  return (
    <View style={{ flex: 1, paddingHorizontal: 8 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 0.8 }}>
        {label}
      </ThemedText>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <ThemedText
          family="serif"
          style={{ fontSize: 22, lineHeight: 24, color, fontFamily: weights.serifRegular }}
        >
          {value}
        </ThemedText>
        {badge ? (
          <ThemedText variant="tiny" color={badge.startsWith('↑') ? palette.bloom : palette.drop} style={{ fontSize: 11 }}>
            {badge}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function QuickAction({
  icon, label, sub, tone, onPress,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  tone: string;
  onPress?: () => void;
}) {
  const { palette, radii } = useTheme();
  return (
    <Tap
      onPress={onPress}
      style={{
        width: 90,
        backgroundColor: tone,
        borderRadius: radii.md,
        paddingVertical: 14,
        paddingHorizontal: 10,
        gap: 4,
      }}
    >
      {icon}
      <ThemedText variant="meta" weight="semibold" style={{ fontSize: 12, marginTop: 6 }}>
        {label}
      </ThemedText>
      <ThemedText variant="tiny" family="mono" color={palette.ink3}>
        {sub}
      </ThemedText>
    </Tap>
  );
}

function CareTab({ plant }: { plant: import('@/types/plant').Plant }) {
  const { palette, radii } = useTheme();

  const row = (icon: React.ReactNode, label: string, value: string, sub?: string) => (
    <View
      key={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        backgroundColor: palette.surface,
        borderRadius: radii.md,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 34, height: 34, borderRadius: 10,
          backgroundColor: palette.surfaceRaised,
          borderWidth: 1, borderColor: palette.line,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>
          {label}
        </ThemedText>
        <ThemedText variant="body" weight="medium" style={{ marginTop: 2 }}>
          {value}
        </ThemedText>
        {sub ? (
          <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 3 }}>
            {sub}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  return (
    <View>
      {row(
        <Droplet size={18} color={palette.drop} fill={palette.drop} />,
        '물주기 주기',
        `${plant.waterCycle}일마다`,
        `마지막: ${formatMD(plant.lastWater)} · 다음(추천): ${formatMD(plant.recommendedNextWater ?? plant.nextWater)}`,
      )}
      {row(<Flower2 size={18} color={palette.bloom} strokeWidth={1.8} />, '비료', `${plant.fertCycle}일마다`, `마지막: ${formatMD(plant.lastFert)}`)}
      {/* 광량/습도(현재 환경)는 공간 설정의 lightScore/airflowScore 가 source of truth.
          기존 데이터에 값이 남아있는 식물만 표시한다. */}
      {plant.light ? row(<Sun size={18} color={palette.earth} strokeWidth={1.8} />, '광량', plant.light) : null}
      {plant.humidity ? row(<Droplet size={18} color={palette.ink3} strokeWidth={1.8} />, '습도', plant.humidity) : null}

      {plant.note ? (
        <View style={{ backgroundColor: palette.greenBg, padding: 16, borderRadius: radii.md, marginTop: 6 }}>
          <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 6 }}>
            메모
          </ThemedText>
          <ThemedText variant="meta" style={{ fontSize: 14, lineHeight: 22 }}>
            {plant.note}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function EnvTab({ plant }: { plant: import('@/types/plant').Plant }) {
  const { palette, radii } = useTheme();
  // 광량/습도 카테고리 문자열은 더 이상 입력받지 않으므로 값이 있는 식물만 막대를
  // 그린다. 신규 식물은 "물 요구" 한 줄만 보이는 게 정상.
  const bars: { label: string; value: number; detail: string }[] = [];
  if (plant.light) {
    bars.push({
      label: '광량',
      value: plant.light.includes('강한') ? 0.95 : plant.light.includes('직사') ? 0.8 : plant.light.includes('밝은') ? 0.6 : 0.35,
      detail: plant.light,
    });
  }
  if (plant.humidity) {
    bars.push({
      label: '습도',
      value: plant.humidity.includes('매우 높음') ? 0.9 : plant.humidity.includes('높음') ? 0.75 : plant.humidity.includes('보통') ? 0.5 : 0.2,
      detail: plant.humidity,
    });
  }
  bars.push({
    label: '물 요구',
    value: 1 - Math.min(plant.waterCycle / 30, 1),
    detail: `${plant.waterCycle}일 주기`,
  });
  return (
    <View style={{ backgroundColor: palette.surface, padding: 20, borderRadius: radii.lg, gap: 18 }}>
      {bars.map((b) => (
        <View key={b.label}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <ThemedText variant="meta" weight="medium" color={palette.ink2}>
              {b.label}
            </ThemedText>
            <ThemedText variant="meta" color={palette.ink3}>
              {b.detail}
            </ThemedText>
          </View>
          <View style={{ height: 6, backgroundColor: palette.bg2, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${b.value * 100}%`, backgroundColor: palette.green }} />
          </View>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <View style={{ flex: 1, padding: 14, backgroundColor: palette.bg, borderRadius: radii.sm }}>
          <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>위치</ThemedText>
          <ThemedText variant="body" weight="medium" style={{ marginTop: 4 }}>{plant.location}</ThemedText>
        </View>
        <View style={{ flex: 1, padding: 14, backgroundColor: palette.bg, borderRadius: radii.sm }}>
          <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3}>학명</ThemedText>
          <ThemedText variant="meta" weight="medium" italic style={{ marginTop: 4 }}>{plant.species}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const ACTION_META: Record<LogEntry['action'], { label: string; color: (p: ReturnType<typeof useTheme>['palette']) => string }> = {
  water: { label: '물주기', color: (p) => p.drop },
  fert:  { label: '비료',   color: (p) => p.bloom },
  prune: { label: '가지치기', color: (p) => p.ink2 },
  repot: { label: '분갈이', color: (p) => p.ink2 },
  note:  { label: '메모',   color: (p) => p.ink2 },
  photo: { label: '사진 기록', color: (p) => p.green },
};

function HistoryTab({ log }: { log: LogEntry[] }) {
  const { palette, radii } = useTheme();
  const [zoomed, setZoomed] = useState<string | null>(null);

  if (log.length === 0) {
    return (
      <EmptyState
        compact
        title="아직 기록이 없어요"
        description={'물주기·비료·분갈이 같은 돌봄 기록이\n시간순으로 여기에 쌓여요.'}
      />
    );
  }
  return (
    <View style={{ paddingLeft: 22, position: 'relative' }}>
      <View
        style={{
          position: 'absolute', left: 5, top: 6, bottom: 6, width: 1, backgroundColor: palette.lineStrong,
        }}
      />
      {log.map((l, i) => {
        const m = ACTION_META[l.action];
        return (
          <View key={`${l.date}-${i}`} style={{ paddingBottom: 18, position: 'relative' }}>
            <View
              style={{
                position: 'absolute', left: -22, top: 3, width: 11, height: 11, borderRadius: 6,
                backgroundColor: palette.surfaceRaised, borderWidth: 2, borderColor: m.color(palette),
              }}
            />
            <ThemedText variant="tiny" family="mono" color={palette.ink3}>{formatMD(l.date)}</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color(palette) }} />
              <ThemedText variant="meta" weight="medium" style={{ fontSize: 14 }}>
                {m.label}
              </ThemedText>
            </View>
            {l.photoUrl ? (
              <Pressable onPress={() => setZoomed(l.photoUrl ?? null)}>
                <Image
                  source={{ uri: l.photoUrl }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: radii.sm,
                    marginTop: 8,
                    backgroundColor: palette.bg2,
                  }}
                  resizeMode="cover"
                />
              </Pressable>
            ) : null}
            {l.note ? (
              <ThemedText variant="meta" color={palette.ink2} style={{ marginTop: 4 }}>
                {l.note}
              </ThemedText>
            ) : null}
          </View>
        );
      })}

      {/* Full-screen zoom */}
      {zoomed ? (
        <Pressable
          onPress={() => setZoomed(null)}
          style={{
            position: 'absolute',
            top: -1000, bottom: -1000, left: -1000, right: -1000,
            backgroundColor: 'rgba(0,0,0,0.92)',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Image source={{ uri: zoomed }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="contain" />
        </Pressable>
      ) : null}
    </View>
  );
}
