import { repos } from '@/repo';
import { supabase } from '@/repo/supabase/client';
import type { UserPlace, WeatherDay } from '@/types/plant';
import { toISODate } from '@/utils/date';
import * as Location from 'expo-location';

/**
 * Walks the GPS → IP → null path and returns whatever we got.
 * Caller decides whether to PERSIST it (we only persist on first-login or
 * explicit re-locate from Me tab, per the product spec).
 */
export async function detectLocation(): Promise<UserPlace> {
  // 1) GPS
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.granted) {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const label = await reverseGeocode(pos.coords.latitude, pos.coords.longitude).catch(() => null);
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label,
        source: 'gps',
      };
    }
  } catch (e) {
    console.warn('[weatherService] GPS failed:', e);
  }

  // 2) IP fallback
  return detectIpLocation();
}

/** GPS 를 건너뛰고 IP 기반(도시 단위)으로만 추정 — 권한 다이얼로그가 뜨지 않는다. */
export async function detectIpLocation(): Promise<UserPlace> {
  try {
    const r = await fetch('https://ipapi.co/json/');
    if (r.ok) {
      const j = await r.json();
      if (typeof j.latitude === 'number' && typeof j.longitude === 'number') {
        return {
          lat: j.latitude,
          lng: j.longitude,
          label: [j.city, j.region].filter(Boolean).join(' '),
          source: 'ip',
        };
      }
    }
  } catch (e) {
    console.warn('[weatherService] IP fallback failed:', e);
  }

  return { lat: null, lng: null, label: null, source: null };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (results.length === 0) return null;
    const r = results[0];
    return [r.region, r.city ?? r.district ?? r.subregion].filter(Boolean).join(' ');
  } catch {
    return null;
  }
}

/**
 * Persist place into profiles. Called only on first-login + Me-tab re-locate.
 * Routed through the profile repo so the AWS swap stays clean.
 */
export async function savePlace(place: UserPlace): Promise<void> {
  await repos.profile.savePlace(place);
}

export async function loadPlace(): Promise<UserPlace | null> {
  const prefs = await repos.profile.get();
  if (!prefs) return null;
  return {
    lat: prefs.lat ?? null,
    lng: prefs.lng ?? null,
    label: prefs.placeLabel ?? null,
    source: prefs.locationSource ?? null,
  };
}

// ─── Open-Meteo fetching ──────────────────────────────────────────
type OpenMeteoResp = {
  daily?: {
    time: string[];
    temperature_2m_mean?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    relative_humidity_2m_mean?: number[];
  };
};

/**
 * Fetches the last 7 days (incl. today) of daily aggregates from Open-Meteo.
 * Uses the free, no-auth `archive-api` for past days + `forecast` for today.
 */
async function fetchOpenMeteo(lat: number, lng: number): Promise<WeatherDay[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean` +
    `&past_days=6&forecast_days=1` +
    `&timezone=auto`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const j = (await r.json()) as OpenMeteoResp;
  const d = j.daily;
  if (!d) return [];
  return d.time.map((iso, i) => ({
    date: iso,
    tempAvg: d.temperature_2m_mean?.[i] ?? null,
    tempHigh: d.temperature_2m_max?.[i] ?? null,
    tempLow: d.temperature_2m_min?.[i] ?? null,
    humidityAvg: d.relative_humidity_2m_mean?.[i] ?? null,
    rainMm: d.precipitation_sum?.[i] ?? null,
  }));
}

/**
 * Get the last 7 days of weather. Caches today's row in
 * `weather_observations`; if today's already cached (= we ran earlier today),
 * returns from DB without calling Open-Meteo.
 */
export async function getRecentWeather(place: UserPlace): Promise<WeatherDay[]> {
  if (!supabase || place.lat == null || place.lng == null) return [];
  const today = toISODate(new Date());

  // 1) Read whatever's already in DB for the last 7 days.
  const since = new Date(); since.setDate(since.getDate() - 6);
  const sinceISO = toISODate(since);
  const { data: rows } = await supabase
    .from('weather_observations')
    .select('date, temp_avg, temp_high, temp_low, humidity_avg, rain_mm')
    .gte('date', sinceISO)
    .order('date', { ascending: true });

  type Row = { date: string; temp_avg: number | null; temp_high: number | null; temp_low: number | null; humidity_avg: number | null; rain_mm: number | null };
  const cached: WeatherDay[] = (rows as Row[] | null ?? []).map((r) => ({
    date: r.date,
    tempAvg: r.temp_avg,
    tempHigh: r.temp_high,
    tempLow: r.temp_low,
    humidityAvg: r.humidity_avg,
    rainMm: r.rain_mm,
  }));

  // 2) If today's already there, skip the network call.
  if (cached.find((d) => d.date === today)) return cached;

  // 3) Fetch fresh, upsert into DB, return merged.
  try {
    const fresh = await fetchOpenMeteo(place.lat, place.lng);
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user && fresh.length > 0) {
      await supabase.from('weather_observations').upsert(
        fresh.map((d) => ({
          owner_id: auth.user!.id,
          date: d.date,
          lat: place.lat,
          lng: place.lng,
          temp_avg: d.tempAvg,
          temp_high: d.tempHigh,
          temp_low: d.tempLow,
          humidity_avg: d.humidityAvg,
          rain_mm: d.rainMm,
        })),
        { onConflict: 'owner_id,date' },
      );
    }
    return fresh;
  } catch (e) {
    console.warn('[weatherService] fetch failed, using cache only:', e);
    return cached;
  }
}
