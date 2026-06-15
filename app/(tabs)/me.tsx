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
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACCENT_COLORS: { key: AccentKey; color: string }[] = [
  { key: 'green',  color: '#2D4A2B' },
  { key: 'sage',   color: '#6A8A5A' },
  { key: 'ochre',  color: '#B8864B' },
  { key: 'forest', color: '#1A3D2E' },
];

const MODE_KEYS: (ThemeMode | 'system')[] = ['light', 'dark', 'system'];

export default function MeScreen() {
  const { t } = useTranslation();
  const { palette, mode, accent, radii, setMode, setAccent } = useTheme();
  const insets = useSafeAreaInsets();
  const tabletCap = useTabletContentCap();
  const { isDesktop } = useResponsive();
  const { language, setLanguage, options: languageOptions } = useLanguage();
  const languageItems = languageOptions.map((o) => ({ key: o.code, label: o.label }));
  const modeItems = MODE_KEYS.map((key) => ({ key, label: t(`settings.themeMode.${key}`) }));

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
      <Section title={t('settings.accentColor')}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {ACCENT_COLORS.map((a) => {
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

      <Section title={t('settings.theme')}>
        <Seg items={modeItems} value={mode} onChange={setMode} />
      </Section>

      <Section title={t('settings.language')}>
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
        <DesktopHeader title={t('settings.title')} showSearch={false} />
        <View style={{ maxWidth: 640, width: '100%' }}>{sections}</View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.bg }}
      contentContainerStyle={[{ paddingTop: insets.top + 14, paddingBottom: 120, paddingHorizontal: 24 }, tabletCap]}
    >
      <ThemedText variant="screenTitle" family="serif">{t('settings.title')}</ThemedText>
      <ThemedText variant="meta" color={palette.ink3} style={{ marginTop: 8, marginBottom: 24 }}>
        {t('settings.subtitle')}
      </ThemedText>
      {sections}
    </ScrollView>
  );
}

const REMINDER_HOURS = [7, 8, 9, 12, 18, 21];

function NotificationSection() {
  const { t } = useTranslation();
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
        {t('settings.notification.section')}
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
            <ThemedText variant="body" weight="medium">{t('settings.notification.waterTitle')}</ThemedText>
            <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
              {granted
                ? t('settings.notification.onAt', { hour })
                : status === 'denied'
                  ? t('settings.notification.deniedHint')
                  : t('settings.notification.offHint')}
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
              {status === 'denied' ? t('settings.notification.openDeviceSettings') : t('settings.notification.allow')}
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ borderTopWidth: 1, borderColor: palette.line, paddingTop: 12 }}>
            <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 8, letterSpacing: 1 }}>
              {t('settings.notification.timeLabel')}
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
                      {t('settings.notification.hourLabel', { hour: h })}
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
  const { t } = useTranslation();
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
    if (mins < 60) return t('settings.place.updatedJustNow');
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('settings.place.updatedHoursAgo', { hours });
    return t('settings.place.updatedDaysAgo', { days: Math.floor(hours / 24) });
  })();

  const updateLocation = () => {
    Alert.alert(
      t('settings.place.section'),
      t('settings.place.sourcePrompt'),
      [
        { text: t('settings.place.useGps'), onPress: () => relocate('gps') },
        { text: t('settings.place.useIp'), onPress: () => relocate('ip') },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        {t('settings.place.section')}
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
              {place?.label ?? t('settings.place.noLocation')}
            </ThemedText>
            <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
              {place?.source === 'gps'
                ? t('settings.place.sourceGps')
                : place?.source === 'ip'
                  ? t('settings.place.sourceIp')
                  : place?.source === 'manual'
                    ? t('settings.place.sourceManual')
                    : t('settings.place.sourceNone')}
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
            <WeatherStat icon={<Thermometer size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.tempAvg != null ? `${today.tempAvg.toFixed(0)}℃` : '—'} sub={t('settings.place.statTempAvg')} />
            <WeatherStat icon={<DropletIcon size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.humidityAvg != null ? `${today.humidityAvg.toFixed(0)}%` : '—'} sub={t('settings.place.statHumidity')} />
            <WeatherStat icon={<CloudRain size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.rainMm != null ? `${today.rainMm.toFixed(0)}mm` : '—'} sub={t('settings.place.statRain')} />
            <WeatherStat icon={<Sun size={14} color={palette.ink3} strokeWidth={1.8} />} value={today.tempHigh != null ? `${today.tempHigh.toFixed(0)}℃` : '—'} sub={t('settings.place.statTempHigh')} />
          </View>
        ) : place?.lat != null ? (
          <ThemedText variant="tiny" color={palette.ink3} style={{ borderTopWidth: 1, borderColor: palette.line, paddingTop: 12 }}>
            {t('settings.place.weatherUnavailable')}
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
  const { t } = useTranslation();
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
      ? t('settings.locations.removeInUse', { n: usedBy })
      : t('settings.locations.removeConfirm');
    Alert.alert(name, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => removeLocation(id) },
    ]);
  };

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        {t('settings.locations.section')}
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
                  {t('settings.locations.meta', { n: count, light: loc.lightScore, airflow: loc.airflowScore })}
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
            {t('settings.locations.empty')}
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
          {t('settings.locations.add')}
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
  const { t } = useTranslation();
  const { palette, radii } = useTheme();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [deleting, setDeleting] = useState(false);

  const confirmSignOut = () => {
    Alert.alert(t('settings.account.signOut'), t('settings.account.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.account.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      t('settings.account.delete'),
      t('settings.account.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.account.deleteProceed'),
          style: 'destructive',
          onPress: () => {
            // 영구 삭제는 한 번 더 묻는다 — 실수 방지용 이중 확인.
            Alert.alert(t('settings.account.deleteFinalTitle'), t('settings.account.deleteFinalMessage'), [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('settings.account.deletePermanent'),
                style: 'destructive',
                onPress: async () => {
                  setDeleting(true);
                  try {
                    await deleteAccount();
                  } catch (e) {
                    Alert.alert(t('settings.account.deleteFailed'), humanizeError(e));
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
        {t('settings.account.section')}
      </ThemedText>
      <View style={{ padding: 16, backgroundColor: palette.surface, borderRadius: radii.md, gap: 10 }}>
        <ThemedText variant="meta" color={palette.ink2}>
          {session.displayName ?? session.email ?? t('settings.account.anonymous')}
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
            {t('settings.account.signOut')}
          </ThemedText>
        </Pressable>
        <Pressable onPress={confirmDelete} disabled={deleting} hitSlop={8} style={{ alignItems: 'center', paddingVertical: 6 }}>
          <ThemedText variant="tiny" color={palette.ink3} style={{ textDecorationLine: 'underline' }}>
            {deleting ? t('settings.account.deleting') : t('settings.account.delete')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function LegalSection() {
  const { t } = useTranslation();
  const { palette, radii } = useTheme();

  const open = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert(t('settings.legal.openFailedTitle'), t('settings.legal.openFailedMessage')));

  const rows: { key: string; label: string; url: string; Icon: typeof FileText }[] = [
    { key: 'terms', label: t('settings.legal.terms'), url: LEGAL_URLS.terms, Icon: FileText },
    { key: 'privacy', label: t('settings.legal.privacy'), url: LEGAL_URLS.privacy, Icon: ShieldCheck },
  ];

  return (
    <View style={{ marginBottom: 26 }}>
      <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ marginBottom: 10, letterSpacing: 1 }}>
        {t('settings.legal.section')}
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
