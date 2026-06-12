import type { Plant } from '@/types/plant';
import { parseISODate } from '@/utils/date';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Top-of-file config — runs once on import. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let promptShown = false;
let permissionGranted = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('water', {
    name: '물주기 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  // 긍정 결과만 캐시한다. 예전엔 첫 확인 결과를 통째로 캐시해서, 사용자가
  // 기기 설정에서 알림을 켜고 돌아와도 세션이 끝날 때까지 거부 상태로
  // 취급되는 버그가 있었다.
  if (permissionGranted) return true;

  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      permissionGranted = true;
      await ensureAndroidChannel();
      await ensureWaterCategory();
      return true;
    }
    // OS 권한 팝업은 세션당 한 번만 — 호출처마다 반복해서 띄우지 않는다.
    if (promptShown) return false;
    promptShown = true;
    const req = await Notifications.requestPermissionsAsync();
    permissionGranted = req.granted;
    if (permissionGranted) {
      await ensureAndroidChannel();
      await ensureWaterCategory();
    }
    return permissionGranted;
  } catch (e) {
    console.warn('[notifications] permission error:', e);
    return false;
  }
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Me 탭 알림 섹션용 — 현재 권한 상태를 조용히(팝업 없이) 조회. */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

const WATER_NOTIF_PREFIX = 'water-';
const SNOOZE_PREFIX = 'water-snooze-';
const REMINDER_HOUR_KEY = 'sikjipsa.reminderHour.v1';
const DEFAULT_REMINDER_HOUR = 9;

export const WATER_CATEGORY = 'water-reminder';
export const SNOOZE_1H_ACTION = 'snooze-1h';
export const SNOOZE_TOMORROW_ACTION = 'snooze-tomorrow';

function identifierFor(plantId: string) {
  return `${WATER_NOTIF_PREFIX}${plantId}`;
}

/** 알림 받을 시각(0~23시). 기본 9시 — Me 탭에서 변경. */
export async function getReminderHour(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(REMINDER_HOUR_KEY);
    const h = Number(raw);
    return Number.isInteger(h) && h >= 0 && h <= 23 ? h : DEFAULT_REMINDER_HOUR;
  } catch {
    return DEFAULT_REMINDER_HOUR;
  }
}

export async function setReminderHour(hour: number): Promise<void> {
  await AsyncStorage.setItem(REMINDER_HOUR_KEY, String(hour));
}

/** 알림의 '1시간 뒤 / 내일' 액션 버튼 등록 — 권한 획득 시 1회. */
async function ensureWaterCategory() {
  try {
    await Notifications.setNotificationCategoryAsync(WATER_CATEGORY, [
      { identifier: SNOOZE_1H_ACTION, buttonTitle: '1시간 뒤', options: { opensAppToForeground: false } },
      { identifier: SNOOZE_TOMORROW_ACTION, buttonTitle: '내일 다시', options: { opensAppToForeground: false } },
    ]);
  } catch (e) {
    console.warn('[notifications] category setup failed:', e);
  }
}

/**
 * 스누즈: 같은 식물의 1회성 알림을 +1시간 또는 내일 알림 시각으로 다시
 * 건다. 본 리마인더(water-<id>)와 별개 identifier 라 rescheduleAll 이
 * 돌아도 스누즈가 덮이지 않는다.
 */
export async function snoozeWaterReminder(
  plant: Pick<Plant, 'id' | 'name' | 'location'>,
  kind: 'hour' | 'tomorrow',
): Promise<void> {
  const target = new Date();
  if (kind === 'hour') {
    target.setTime(target.getTime() + 60 * 60 * 1000);
  } else {
    target.setDate(target.getDate() + 1);
    target.setHours(await getReminderHour(), 0, 0, 0);
  }
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${SNOOZE_PREFIX}${plant.id}`,
      content: {
        title: `${plant.name} 물 줄 시간이에요`,
        body: plant.location ? `${plant.location} · 다시 알려드려요` : '다시 알려드려요',
        data: { plantId: plant.id, kind: 'water' },
        categoryIdentifier: WATER_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
        channelId: Platform.OS === 'android' ? 'water' : undefined,
      },
    });
  } catch (e) {
    console.warn('[notifications] snooze failed:', e);
  }
}

/**
 * Schedules a local notification on the plant's next_water date at the user's reminder hour (default 09:00).
 * Past dates are skipped. Returns true if a notification was scheduled.
 */
export async function scheduleWaterReminder(plant: Plant): Promise<boolean> {
  if (!(await ensureNotificationPermission())) return false;

  // Cancel any previous reminder for this plant first.
  await cancelWaterReminder(plant.id);

  // Anchor to local midnight first so setHours(9) lands on the user's
  // wall-clock 9 AM regardless of timezone drift from `new Date('YYYY-MM-DD')`.
  const target = parseISODate(plant.nextWater);
  target.setHours(await getReminderHour(), 0, 0, 0);
  const now = new Date();
  if (target.getTime() <= now.getTime()) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(plant.id),
      content: {
        title: `${plant.name} 물 줄 시간이에요`,
        body: plant.location ? `${plant.location} · 오늘 한 번 살펴볼까요?` : '오늘 한 번 살펴볼까요?',
        data: { plantId: plant.id, kind: 'water' },
        categoryIdentifier: WATER_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: target,
        channelId: Platform.OS === 'android' ? 'water' : undefined,
      },
    });
    return true;
  } catch (e) {
    console.warn('[notifications] schedule failed:', e);
    return false;
  }
}

export async function cancelWaterReminder(plantId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifierFor(plantId));
  } catch {
    // silent — no-op if identifier doesn't exist
  }
}

/**
 * Called on app start after plants load — drops all known scheduled reminders
 * and re-schedules based on current state. Cheap and self-healing.
 */
export async function rescheduleAll(plants: Plant[]) {
  if (!(await ensureNotificationPermission())) return;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    const ids = existing
      .map((n) => n.identifier)
      .filter((id) => id.startsWith(WATER_NOTIF_PREFIX));
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    for (const p of plants) {
      // eslint-disable-next-line no-await-in-loop
      await scheduleWaterReminder(p);
    }
  } catch (e) {
    console.warn('[notifications] rescheduleAll failed:', e);
  }
}
