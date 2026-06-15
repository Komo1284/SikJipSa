import { LocationFormModal } from '@/components/LocationFormModal';
import { ThemedText } from '@/components/Typography';
import { DesktopHeader } from '@/components/web/DesktopHeader';
import { useLanguage } from '@/i18n/useLanguage';
import { humanizeError } from '@/lib/errors';
import { LEGAL_URLS } from '@/lib/legal';
import {
  ensureNotificationPermission,
  getNotificationPermissionStatus,
  getReminderHour,
  rescheduleAll,
  setReminderHour,
  type NotificationPermissionStatus,
} from '@/lib/notifications';
import { useAuthStore } from '@/store/auth';
import { useLocationStore } from '@/store/locations';
import { usePlantStore } from '@/store/plants';
import { useWeatherStore } from '@/store/weather';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive, useTabletContentCap } from '@/theme/responsive';
import type { AccentKey, ThemeMode } from '@/theme/tokens';
import type { UserLocation } from '@/types/plant';
import { useFocusEffect } from 'expo-router';
import { Bell, BellOff, ChevronRight, CloudRain, Droplet as DropletIcon, FileText, MapPin, Pencil, Plus, RefreshCw, ShieldCheck, Sun, Thermometer, Trash2 } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENTS: { key: AccentKey; label: string; color: string }[] = [
  { key: 'green',  label: '그린',   color: '#2D4A2B' },
  { key: 'sage',   label: '세이지', color: '#6A8A5A' },
  { key: 'ochre',  label: '오크',   color: '#B8864B' },
  { key: 'forest', label: '포레스트', color: '#1A3D2E' },
];

const MODES: { key: ThemeMode | 'system'; label: string }[] = [
  { key: 'light',  label: '라이트' },
  { key: 'dark',   label: '다크' },
  { key: 'system', label: '시스템' },
];

export default function MeScreen() {
  const { palette, mode, accent, radii, setMode, setAccent } = useTheme();
  const insets = useSafeAreaInsets();
  const tabletCap = useTabletContentCap();
  const { isDesktop } = useResponsive();
  const { language, setLanguage, options: languageOptions } = useLanguage();
  const languageItems = languageOptions.map((o) => ({ key: o.code, label: o.label }));

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        {title}
      </ThemedText>
      <View>{children}</View>
    </View>
  );

  const Seg = <T extends string>({
    items,
    value,
    onChange,
  }: {
    items: { key: T; label: string }[];
    value: T;
    onChange: (k: T) => void;
  }) => (
    <View style={{ flexDirection: 'row', backgroundColor: palette.surface, borderRadius: 12, padding: 4, gap: 4 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderRadius: 9,
              backgroundColor: active ? palette.surfaceRaised : 'transparent',
            }}
          >
            <ThemedText variant="meta" weight={active ? 'semibold' : 'regular'} color={active ? palette.ink : palette.ink2}>
              {it.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  const sections = (
    <>
      <Section title="포인트 컬러">
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {ACCENTS.map((a) => {
            const active = accent === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => setAccent(a.key)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 14,
                  backgroundColor: a.color,
                  borderWidth: active ? 3 : 0,
                  borderColor: palette.ink,
                }}
              />
            );
          })}
        </View>
      </Section>

      <Section title="테마">
        <Seg items={MODES} value={mode} onChange={setMode} />
      </Section>

      <Section title="언어">
        <Seg items={languageItems} value={language} onChange={(c) => { setLanguage(c); }} />
      </Section>

      <PlaceSection />

      <NotificationSection />

      <LocationsSection />

      <AccountSection />

      <LegalSection />
    </>
  );

  // 데스크톱: 사이드바 셸 폭에 맞춰 헤더 + 640px 컬럼.
  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }}>
        <DesktopHeader title="나" showSearch={false} />
        <View style={{ maxWidth: 640, width: '100%' }}>{sections}</View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[{ paddingTop: insets.top + 14, paddingBottom: 120, paddingHorizontal: 24 }, tabletCap]}
    >
      <ThemedText variant="screenTitle" family="serif">나</ThemedText>
      <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 8, marginBottom: 24 }}>
        앱의 생김새와 리듬을 바꿀 수 있어요.
      </ThemedText>
      {sections}
    </ScrollView>
  );
}

const REMINDER_HOURS = [7, 8, 9, 12, 18, 21];

function NotificationSection() {
  const { palette, radii } = useTheme();
  const plants = usePlantStore((s) => s.plants);
  const [status, setStatus] = useState<NotificationPermissionStatus | null>(null);
  const [hour, setHour] = useState<number>(9);

  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return;
    getNotificationPermissionStatus().then(setStatus);
    getReminderHour().then(setHour);
  }, []);

  // 기기 설정에서 알림을 켜고 돌아왔을 때 바로 반영되도록 포커스마다 재조회.
  useFocusEffect(refresh);

  if (Platform.OS === 'web' || status === null) return null;

  const enable = async () => {
    const ok = await ensureNotificationPermission();
    if (ok) rescheduleAll(plants).catch(() => {});
    refresh();
  };

  const granted = status === 'granted';
  const Icon = granted ? Bell : BellOff;

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        알림
      </ThemedText>
      <View style={{ backgroundColor: palette.surface, borderRadius: radii.md, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: granted ? palette.greenBg : palette.bg2,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon size={18} color={granted ? palette.greenDeep : palette.ink3} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" weight="medium">물주기 알림</ThemedText>
            <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
              {granted
                ? `켜짐 · 물주기 날 ${hour}시에 알려드려요`
                : status === 'denied'
                  ? '꺼짐 · 기기 설정에서 허용해야 받을 수 있어요'
                  : '꺼짐 · 허용하면 물주기 날을 놓치지 않아요'}
            </ThemedText>
          </View>
        </View>
        {!granted ? (
          <Pressable
            onPress={status === 'denied' ? () => Linking.openSettings() : enable}
            style={{
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: palette.bg2,
              alignItems: 'center',
            }}
          >
            <ThemedText variant="meta" weight="medium" color={palette.green}>
              {status === 'denied' ? '기기 설정 열기' : '알림 허용하기'}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ borderTopWidth: 1, borderColor: palette.line, paddingTop: 12 }}>
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 8, letterSpacing: 1 }}>
              알림 시각
            </ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {REMINDER_HOURS.map((h) => {
                const active = hour === h;
                return (
                  <Pressable
                    key={h}
                    onPress={async () => {
                      setHour(h);
                      await setReminderHour(h);
                      rescheduleAll(plants).catch(() => {});
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? palette.green : palette.bg2,
                    }}
                  >
                    <ThemedText variant="meta" weight="medium" color={active ? palette.bg : palette.ink2}>
                      {h}시
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function PlaceSection() {
  const { palette, radii } = useTheme();
  const place = useWeatherStore((s) => s.place);
  const weather = useWeatherStore((s) => s.weather);
  const loading = useWeatherStore((s) => s.loading);
  const lastUpdated = useWeatherStore((s) => s.lastUpdated);
  const relocate = useWeatherStore((s) => s.relocate);

  const today = weather[weather.length - 1];
  const freshness = (() => {
    if (!lastUpdated) return null;
    const mins = Math.floor((Date.now() - lastUpdated) / 60000);
    if (mins < 60) return '방금 업데이트';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전 업데이트`;
    return `${Math.floor(hours / 24)}일 전 업데이트 — 새로고침을 눌러주세요`;
  })();

  const updateLocation = () => {
    Alert.alert(
      '식물이 있는 위치',
      '날씨 기반 추천에 쓰일 위치를 어떻게 가져올까요?',
      [
        { text: 'GPS 사용 (정확)', onPress: () => relocate('gps') },
        { text: '대도시 추정 (개략)', onPress: () => relocate('ip') },
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        식물이 있는 위치
      </ThemedText>

      <View style={{ backgroundColor: palette.surface, borderRadius: radii.md, padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: palette.greenBg,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <MapPin size={18} color={palette.greenDeep} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="body" weight="medium">
              {place?.label ?? '위치 정보 없음'}
            </ThemedText>
            <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
              {place?.source === 'gps'
                ? 'GPS · 추천 정확도 높음'
                : place?.source === 'ip'
                  ? 'IP · 도시 단위로 대략 추정'
                  : place?.source === 'manual'
                    ? '수동 설정'
                    : '미설정 · 공간 환경만 반영'}
            </ThemedText>
          </View>
          <Pressable onPress={updateLocation} hitSlop={8} style={{ padding: 6 }} disabled={loading}>
            <RefreshCw size={18} color={palette.ink3} strokeWidth={1.8} />
          </Pressable>
        </View>

        {today ? (
          <View
            style={{
              flexDirection: 'row', justifyContent: 'space-between',
              borderTopWidth: 1, borderColor: palette.line, paddingTop: 12,
            }}
          >
            <WeatherStat icon={<Thermometer size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.tempAvg != null ? `${today.tempAvg.toFixed(0)}℃` : '—'} sub="평균 기온" />
            <WeatherStat icon={<DropletIcon size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.humidityAvg != null ? `${today.humidityAvg.toFixed(0)}%` : '—'} sub="습도" />
            <WeatherStat icon={<CloudRain size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.rainMm != null ? `${today.rainMm.toFixed(0)}mm` : '—'} sub="강수" />
            <WeatherStat icon={<Sun size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.tempHigh != null ? `${today.tempHigh.toFixed(0)}℃` : '—'} sub="최고" />
          </View>
        ) : place?.lat != null ? (
          <ThemedText variant="tiny" color={palette.ink3} style={{ borderTopWidth: 1, borderColor: palette.line, paddingTop: 12 }}>
            날씨 데이터를 아직 가져오지 못했어요. 새로고침을 눌러주세요.
          </ThemedText>
        ) : null}
        {today && freshness ? (
          <ThemedText variant="tiny" color={palette.ink4} style={{ marginTop: -6 }}>
            {freshness}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function WeatherStat({ icon, value, sub }: { icon: React.ReactNode; value: string; sub: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      {icon}
      <ThemedText variant="meta" weight="semibold">{value}</ThemedText>
      <ThemedText variant="tiny" color={palette.ink3}>{sub}</ThemedText>
    </View>
  );
}

function LocationsSection() {
  const { palette, radii } = useTheme();
  const locations = useLocationStore((s) => s.locations);
  const removeLocation = useLocationStore((s) => s.remove);
  const plants = usePlantStore((s) => s.plants);
  const [modalEditing, setModalEditing] = useState<UserLocation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openAdd = () => {
    setModalEditing(null);
    setModalOpen(true);
  };
  const openEdit = (loc: UserLocation) => {
    setModalEditing(loc);
    setModalOpen(true);
  };

  const confirmRemove = (id: string, name: string) => {
    const usedBy = plants.filter((p) => p.location === name).length;
    const message = usedBy > 0
      ? `${usedBy}개의 식물이 이 공간에 있어요. 삭제하면 식물은 남지만 공간 정보가 빈 값이 돼요. 이 작업은 되돌릴 수 없어요.`
      : '정말 삭제할까요? 이 작업은 되돌릴 수 없어요.';
    Alert.alert(name, message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeLocation(id) },
    ]);
  };

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        공간
      </ThemedText>
      <View style={{ backgroundColor: palette.surface, borderRadius: radii.md, overflow: 'hidden' }}>
        {locations.map((loc, idx) => {
          const count = plants.filter((p) => p.location === loc.name).length;
          return (
            <View
              key={loc.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderTopWidth: idx === 0 ? 0 : 1,
                borderColor: palette.line,
              }}
            >
              <View style={{ flex: 1 }}>
                <ThemedText variant="body" weight="medium">
                  {loc.name}
                </ThemedText>
                <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
                  식물 {count}개 · 일조 {loc.lightScore}/5 · 환기 {loc.airflowScore}/5
                </ThemedText>
              </View>
              <Pressable onPress={() => openEdit(loc)} hitSlop={8} style={{ padding: 8 }}>
                <Pencil size={16} color={palette.ink3} strokeWidth={1.8} />
              </Pressable>
              <Pressable onPress={() => confirmRemove(loc.id, loc.name)} hitSlop={8} style={{ padding: 8 }}>
                <Trash2 size={16} color={palette.warn} strokeWidth={1.8} />
              </Pressable>
            </View>
          );
        })}
        {locations.length === 0 ? (
          <ThemedText variant="meta" color={palette.ink3} style={{ padding: 14 }}>
            공간이 없어요. 아래에서 추가해보세요.
          </ThemedText>
        ) : null}
      </View>

      <Pressable
        onPress={openAdd}
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 14,
          borderRadius: radii.md,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: palette.lineStrong,
          backgroundColor: palette.surface,
        }}
      >
        <Plus size={16} color={palette.ink2} strokeWidth={2} />
        <ThemedText variant="meta" weight="medium" color={palette.ink2}>
          새 공간 추가
        </ThemedText>
      </Pressable>

      <LocationFormModal
        visible={modalOpen}
        editing={modalEditing}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

function AccountSection() {
  const { palette, radii } = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [deleting, setDeleting] = useState(false);

  const confirmSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      '계정 삭제',
      '등록한 식물과 모든 돌봄 기록·사진이 영구 삭제돼요.\n이 작업은 되돌릴 수 없어요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제 진행',
          style: 'destructive',
          onPress: () => {
            // 영구 삭제는 한 번 더 묻는다 — 실수 방지용 이중 확인.
            Alert.alert('정말 삭제할까요?', '마지막 확인이에요. 삭제 후에는 복구할 수 없어요.', [
              { text: '취소', style: 'cancel' },
              {
                text: '영구 삭제',
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                  } catch (e) {
                    Alert.alert('계정 삭제 실패', humanizeError(e));
                  } finally {
                    setDeleting(false);
                  }
                },
              },
            ]);
          },
        },
      ],
    );
  };

  if (!session) return null;

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        계정
      </ThemedText>
      <View style={{ padding: 16, backgroundColor: palette.surface, borderRadius: radii.md, gap: 10 }}>
        <ThemedText variant="meta" color={palette.ink2}>
          {session.displayName ?? session.email ?? '익명 사용자'}
        </ThemedText>
        {session.email ? (
          <ThemedText variant="tiny" color={palette.ink3}>
            {session.email} · {session.provider}
          </ThemedText>
        ) : null}
        <Pressable
          onPress={confirmSignOut}
          style={{
            marginTop: 6,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: palette.bg2,
            alignItems: 'center',
          }}
        >
          <ThemedText variant="meta" weight="medium" color={palette.warn}>
            로그아웃
          </ThemedText>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleting} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <ThemedText variant="tiny" color={palette.ink3} style={{ textDecorationLine: 'underline' }}>
            {deleting ? '계정 삭제 중…' : '계정 삭제'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function LegalSection() {
  const { palette, radii } = useTheme();

  const open = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert('열 수 없어요', '문서를 여는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.'));

  const rows: { key: string; label: string; url: string; Icon: typeof FileText }[] = [
    { key: 'terms', label: '서비스 이용약관', url: LEGAL_URLS.terms, Icon: FileText },
    { key: 'privacy', label: '개인정보 처리방침', url: LEGAL_URLS.privacy, Icon: ShieldCheck },
  ];

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        약관·정책
      </ThemedText>
      <View style={{ backgroundColor: palette.surface, borderRadius: radii.md, overflow: 'hidden' }}>
        {rows.map((row, idx) => (
          <Pressable
            key={row.key}
            onPress={() => open(row.url)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderColor: palette.line,
            }}
          >
            <row.Icon size={18} color={palette.ink3} strokeWidth={1.8} />
            <ThemedText variant="body" weight="medium" style={{ flex: 1 }}>
              {row.label}
            </ThemedText>
            <ChevronRight size={18} color={palette.ink3} strokeWidth={1.8} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
