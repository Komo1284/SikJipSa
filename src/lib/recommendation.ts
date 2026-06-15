import i18n from '@/i18n';
import type { Plant, UserLocation, WeatherDay } from '@/types/plant';
import { addDays, toISODate } from '@/utils/date';

export type Recommendation = {
  /** 권장 다음 물주기 ISO date. */
  date: string;
  /** 절대 주기 대비 ±일수. */
  delta: number;
  /** 한국어 한두 문장. */
  reason: string;
};

type Factor = { delta: number; weight: number; phrase: string };

/**
 * Pure recommendation. No I/O. Bounded to 0.5×–1.5× the absolute cycle so
 * a noisy weather burst can never make us water "5 days ago" or "in 2 months".
 */
export function recommendNextWater(
  plant: Pick<Plant, 'lastWater' | 'waterCycle' | 'speciesHumidityPref' | 'speciesLightPref' | 'name'>,
  location: Pick<UserLocation, 'name' | 'lightScore' | 'airflowScore' | 'weatherWeight'> | null,
  recent: WeatherDay[],   // last 7 days incl. today
): Recommendation {
  const cycle = plant.waterCycle;
  const ww = location?.weatherWeight ?? 0.4;

  const factors: Factor[] = [];

  let humAvg: number | null = null;

  if (recent.length > 0) {
    const rainTotal = sum(recent.map((d) => d.rainMm ?? 0));
    const tempAvg = avg(recent.map((d) => d.tempAvg).filter(isNum));
    humAvg = avg(recent.map((d) => d.humidityAvg).filter(isNum));

    if (rainTotal >= 20) {
      factors.push({ delta: +0.18 * ww, weight: ww, phrase: i18n.t('recommendation.rainTotal', { mm: Math.round(rainTotal) }) });
    }
    if (tempAvg !== null && tempAvg > 28) {
      factors.push({ delta: -0.20 * ww, weight: ww, phrase: i18n.t('recommendation.heatwave', { temp: tempAvg.toFixed(0) }) });
    }
    if (tempAvg !== null && tempAvg < 5) {
      factors.push({ delta: +0.30 * ww, weight: ww, phrase: i18n.t('recommendation.coldwave', { temp: tempAvg.toFixed(0) }) });
    }
    if (humAvg !== null && humAvg < 40) {
      factors.push({ delta: -0.12 * ww, weight: ww, phrase: i18n.t('recommendation.dry', { humidity: humAvg.toFixed(0) }) });
    }
    if (humAvg !== null && humAvg > 75) {
      factors.push({ delta: +0.10 * ww, weight: ww, phrase: i18n.t('recommendation.humid', { humidity: humAvg.toFixed(0) }) });
    }
  }

  // Light mismatch — plant prefers more sun than the spot provides → less frequent watering
  if (location && plant.speciesLightPref) {
    const diff = location.lightScore - plant.speciesLightPref; // +면 빛 충분, −면 부족
    if (Math.abs(diff) >= 1) {
      factors.push({
        delta: -(diff / 5) * 0.15,
        weight: 0.5,
        phrase: diff > 0 ? i18n.t('recommendation.lightRich') : i18n.t('recommendation.lightLow'),
      });
    }
  }

  // Humidity mismatch — plant's preferred humidity vs ambient humidity.
  // Maps the 1–5 preference to an expected % (1=25, 2=40, 3=55, 4=70, 5=85).
  // If the plant likes a moister climate than the air provides, the soil
  // dries out faster → water more often. The reverse for cacti in damp air.
  if (plant.speciesHumidityPref && humAvg !== null) {
    const expected = 25 + (plant.speciesHumidityPref - 1) * 15;
    const diff = expected - humAvg; // +면 식물이 더 습한 환경을 원함
    if (Math.abs(diff) >= 15) {
      factors.push({
        delta: -(diff / 100) * 0.20,
        weight: 0.5,
        phrase: diff > 0
          ? i18n.t('recommendation.humidityPrefDrier', { expected, humidity: humAvg.toFixed(0) })
          : i18n.t('recommendation.humidityPrefWetter', { expected, humidity: humAvg.toFixed(0) }),
      });
    }
  }

  // Airflow penalty — stagnant air keeps soil wet longer
  if (location && location.airflowScore <= 2) {
    factors.push({ delta: +0.10, weight: 0.5, phrase: i18n.t('recommendation.poorAirflow') });
  }

  // Sum and clamp
  const totalDelta = factors.reduce((s, f) => s + f.delta, 0);
  const adjustedCycle = clamp(cycle * (1 + totalDelta), cycle * 0.5, cycle * 1.5);
  const dayDelta = Math.round(adjustedCycle - cycle);
  const date = addDays(plant.lastWater || toISODate(new Date()), Math.round(adjustedCycle));

  // Reason — pick top-2 factors by absolute weighted delta
  const top = [...factors]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);

  let reason: string;
  if (top.length === 0) {
    reason = i18n.t('recommendation.reasonDefault', { days: plant.waterCycle });
  } else {
    const dirText =
      dayDelta > 0 ? i18n.t('recommendation.dirLater', { days: dayDelta }) :
      dayDelta < 0 ? i18n.t('recommendation.dirEarlier', { days: -dayDelta }) :
      i18n.t('recommendation.dirSame');
    const phrases = top.map((f) => f.phrase).join(' · ');
    reason = i18n.t('recommendation.reasonAdjusted', { phrases, direction: dirText });
  }

  return { date, delta: dayDelta, reason };
}

// helpers
function sum(xs: number[]) { return xs.reduce((a, b) => a + b, 0); }
function avg(xs: number[]) { return xs.length === 0 ? null : sum(xs) / xs.length; }
function isNum(x: unknown): x is number { return typeof x === 'number' && Number.isFinite(x); }
function clamp(x: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, x)); }
