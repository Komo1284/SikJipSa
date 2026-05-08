import type { Plant } from '@/types/plant';
import { TODAY, daysBetween, parseISODate, toISODate } from '@/utils/date';

/**
 * Computes the calendar months between an ISO date and today.
 * Day-of-month sensitive: 2025-01-15 → 2025-12-15 = 11 months exactly.
 * 2025-01-15 → 2025-12-14 = 10 months (still inside the boundary).
 */
export function monthsSince(iso: string): number {
  const past = parseISODate(iso);
  const now = parseISODate(toISODate(TODAY));
  let m = (now.getFullYear() - past.getFullYear()) * 12 + (now.getMonth() - past.getMonth());
  if (now.getDate() < past.getDate()) m -= 1;
  return Math.max(m, 0);
}

const fertNextDate = (p: Plant): string => {
  const d = parseISODate(p.lastFert);
  d.setDate(d.getDate() + p.fertCycle);
  return toISODate(d);
};

const waterNextDate = (p: Plant): string => p.recommendedNextWater ?? p.nextWater;

export type ReminderItem = {
  plant: Plant;
  /** D-day relative to today; negative = overdue, 0 = today, 1 = tomorrow. */
  dueIn: number;
};

/**
 * 물주기 알림 — 하루 뒤 ~ 이미 지난 식물.
 * Sorted by urgency (most overdue first).
 */
export function getWaterReminders(plants: Plant[]): ReminderItem[] {
  return plants
    .map((plant) => ({ plant, dueIn: daysBetween(TODAY, waterNextDate(plant)) }))
    .filter(({ dueIn }) => dueIn <= 1)
    .sort((a, b) => a.dueIn - b.dueIn);
}

/**
 * 비료 알림 — 일주일 전부터 ~ 이미 지난 식물.
 */
export function getFertReminders(plants: Plant[]): ReminderItem[] {
  return plants
    .map((plant) => ({ plant, dueIn: daysBetween(TODAY, fertNextDate(plant)) }))
    .filter(({ dueIn }) => dueIn <= 7)
    .sort((a, b) => a.dueIn - b.dueIn);
}

export type RepotItem = {
  plant: Plant;
  /** ISO date of the most recent repot for this plant. */
  lastRepot: string;
  monthsAgo: number;
};

/**
 * 분갈이 알림 — 마지막 분갈이일이 10개월 이상 지난 식물만.
 * 분갈이 기록이 없는 식물은 포함하지 않는다 (사용자 명세).
 */
export function getRepotReminders(
  plants: Plant[],
  repotByPlant: Record<string, string>,
): RepotItem[] {
  const items: RepotItem[] = [];
  for (const p of plants) {
    const lastRepot = repotByPlant[p.id];
    if (!lastRepot) continue;
    const monthsAgo = monthsSince(lastRepot);
    if (monthsAgo >= 10) items.push({ plant: p, lastRepot, monthsAgo });
  }
  // Most overdue first.
  items.sort((a, b) => b.monthsAgo - a.monthsAgo);
  return items;
}

/**
 * 일정 페이지 분갈이 탭에서 쓰는 전체 정렬.
 * - `withRecord`: 마지막 분갈이일 기준 오래된 순. 10개월 이상은 `urgent: true`.
 * - `noRecord`: 분갈이 로그가 한 번도 없는 식물.
 */
export type RepotScheduleEntry = RepotItem & { urgent: boolean };

export function getRepotSchedule(
  plants: Plant[],
  repotByPlant: Record<string, string>,
): { withRecord: RepotScheduleEntry[]; noRecord: Plant[] } {
  const withRecord: RepotScheduleEntry[] = [];
  const noRecord: Plant[] = [];
  for (const p of plants) {
    const lastRepot = repotByPlant[p.id];
    if (!lastRepot) {
      noRecord.push(p);
    } else {
      const monthsAgo = monthsSince(lastRepot);
      withRecord.push({ plant: p, lastRepot, monthsAgo, urgent: monthsAgo >= 10 });
    }
  }
  withRecord.sort((a, b) => b.monthsAgo - a.monthsAgo);
  return { withRecord, noRecord };
}
