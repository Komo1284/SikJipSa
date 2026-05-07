import type { Plant } from '@/types/plant';

/**
 * Real "today" for D-day math. Evaluated at module import, so the entire app
 * session sees the same date even if the user crosses midnight mid-session —
 * good enough for MVP. If a long-running background session becomes a concern,
 * switch callers to `new Date()` at each call site.
 */
export const TODAY = new Date();

/**
 * Parse a "YYYY-MM-DD" calendar string as **local midnight**, never UTC.
 *
 * `new Date('2026-05-07')` is specified by ECMA to mean UTC midnight, so in
 * KST (+09:00) it lands on 09:00 the same day — close enough that
 * `daysBetween` rounds inconsistently (±1 day depending on time of day).
 * Using the multi-arg constructor sidesteps the spec entirely and makes the
 * Date represent the calendar day the user actually picked.
 */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function daysBetween(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? parseISODate(a) : a;
  const db = typeof b === 'string' ? parseISODate(b) : b;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function formatMD(date: string | Date): string {
  const d = typeof date === 'string' ? parseISODate(date) : date;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export type PlantStatus = 'overdue' | 'today' | 'soon' | 'ok';

export function plantStatus(p: Plant): PlantStatus {
  const d = daysBetween(TODAY, p.nextWater);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 2) return 'soon';
  return 'ok';
}

export function nextActionLabel(p: Plant): string {
  const d = daysBetween(TODAY, p.nextWater);
  if (d < 0) return `${-d}일 지남`;
  if (d === 0) return '오늘';
  if (d === 1) return '내일';
  return `${d}일 뒤`;
}

/** 환경 보정된 권장 물주기 일자. 없으면 절대 주기로 fallback. */
export function effectiveNextWater(p: Plant): string {
  return p.recommendedNextWater ?? p.nextWater;
}

/** 추천 기준 D-day 라벨. UI 의 모든 카드/상세에서 이걸 우선 사용. */
export function nextActionLabelRecommended(p: Plant): string {
  const d = daysBetween(TODAY, effectiveNextWater(p));
  if (d < 0) return `${-d}일 지남`;
  if (d === 0) return '오늘';
  if (d === 1) return '내일';
  return `${d}일 뒤`;
}

export function plantStatusRecommended(p: Plant): PlantStatus {
  const d = daysBetween(TODAY, effectiveNextWater(p));
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  if (d <= 2) return 'soon';
  return 'ok';
}

/** Lists default to the recommended cycle so home/schedule reflect the
 * weather-aware D-day, not the raw absolute one. */
export const todayList = (plants: Plant[]) =>
  plants.filter((p) => plantStatusRecommended(p) === 'today' || plantStatusRecommended(p) === 'overdue');

export const soonList = (plants: Plant[]) =>
  plants.filter((p) => plantStatusRecommended(p) === 'soon');

/**
 * "YYYY-MM-DD" for a JS Date, expressed in the user's **local** calendar.
 *
 * `toISOString().slice(0,10)` would silently use UTC, so a `new Date()` at
 * 02:00 KST returns the previous day's date string — the bug behind
 * "오늘 선택했는데 어제로 저장됨" reports before 09:00 KST.
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

const DAY_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** e.g. `TUE · 04.24` — used as a mono-font kicker on the home header. */
export function formatKickerShort(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${DAY_EN[d.getDay()]} · ${mm}.${dd}`;
}

/** e.g. `TUE · APR 24 · 2026` — longer kicker for the desktop header. */
export function formatKickerLong(d: Date = new Date()): string {
  const day = DAY_EN[d.getDay()];
  const mon = MONTH_EN[d.getMonth()];
  const dd = String(d.getDate()).padStart(2, '0');
  return `${day} · ${mon} ${dd} · ${d.getFullYear()}`;
}
