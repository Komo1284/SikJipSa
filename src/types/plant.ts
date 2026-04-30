export type PlantMood =
  | 'velvet' | 'silver' | 'frond' | 'tropical' | 'variegated'
  | 'tree' | 'trailing' | 'succulent' | 'seedling';

export type PlantLocation = string; // user-defined. Seed uses 온실장 / 거실 / 베란다.

/** ISO date (YYYY-MM-DD). */
export type ISODate = string;

export type Plant = {
  id: string;
  name: string;
  species: string;
  location: PlantLocation;
  light: string;
  humidity: string;
  waterCycle: number;
  fertCycle: number;
  lastWater: ISODate;
  lastFert: ISODate;
  /** 절대 주기 기준의 다음 물주기 (last_water + cycle). UI 에서는 거의 사용 안 함. */
  nextWater: ISODate;
  note: string;
  color: string;
  mood: PlantMood;
  photoUrl?: string | null;

  /** 1–5. 식물의 환경 선호도. */
  speciesHumidityPref?: number | null;
  speciesLightPref?: number | null;

  /** 환경 보정 후의 권장 물주기 일자 (날씨·공간·식물선호 종합). */
  recommendedNextWater?: ISODate | null;
  /** 한국어 자연문 — "베란다라 비 영향이 커서 +2일 늦췄어요" */
  recommendationReason?: string | null;
  /** 절대 주기 대비 보정 일수 (음수=빨라짐). UI 의 ↑↓ 표시에 사용. */
  recommendationDelta?: number | null;
};

export type LogAction = 'water' | 'fert' | 'prune' | 'repot' | 'note' | 'photo';

export type LogEntry = {
  date: ISODate;
  action: LogAction;
  plantId: string;
  note?: string;
  photoUrl?: string | null;
};

export type LocationMeta = {
  id: string;
  label: string;
  sub: string;
};

/** Location persisted in Supabase `locations` table (one row per user/space). */
export type UserLocation = {
  id: string;
  name: string;
  sortOrder: number;
  /** 일조량 1 (어두움) ~ 5 (직사광). */
  lightScore: number;
  /** 공기 순환 1 (정체) ~ 5 (잘 통함). */
  airflowScore: number;
  /** 외부 날씨가 이 공간에 영향을 주는 비율 0–1. 베란다=0.9, 온실장=0.1. */
  weatherWeight: number;
};

/** Supabase weather_observations 1행. */
export type WeatherDay = {
  date: ISODate;
  tempAvg: number | null;
  tempHigh: number | null;
  tempLow: number | null;
  humidityAvg: number | null;
  rainMm: number | null;
};

/** profiles 의 위치 정보. */
export type UserPlace = {
  lat: number | null;
  lng: number | null;
  label: string | null;
  source: 'gps' | 'ip' | 'manual' | null;
};
