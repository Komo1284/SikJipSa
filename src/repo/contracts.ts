import type { LogEntry, Plant, UserLocation } from '@/types/plant';
import type { AuthChangeEvent, OAuthProvider, Session, Unsubscribe, UploadResult } from './types';

/** Auth */
export interface AuthRepo {
  getSession(): Promise<Session | null>;
  signInWithProvider(provider: OAuthProvider): Promise<Session>;
  /** Sends a 6-digit code to the user's email; also creates the user if new. */
  sendEmailOtp(email: string): Promise<void>;
  /** Exchanges the email + OTP for a session. */
  verifyEmailOtp(email: string, token: string): Promise<Session>;
  signOut(): Promise<void>;
  onAuthStateChange(cb: (event: AuthChangeEvent, session: Session | null) => void): Unsubscribe;
}

/** Plants */
export interface PlantRepo {
  list(): Promise<Plant[]>;
  get(id: string): Promise<Plant | null>;
  create(plant: Plant): Promise<Plant>;
  update(id: string, patch: Partial<Plant>): Promise<Plant>;
  softDelete(id: string): Promise<void>;
}

/** Activity log */
export interface LogRepo {
  listForPlant(plantId: string, limit?: number): Promise<LogEntry[]>;
  listRecent(days: number): Promise<LogEntry[]>;
  insert(entry: Omit<LogEntry, 'id'>): Promise<LogEntry>;
  /**
   * Index of {plantId → latest repot ISO date} across all time. The
   * "분갈이 임박" reminder needs this because repotting happens on a
   * 1+ year cadence — the rolling 60-day `listRecent` window can't see it.
   */
  listLatestRepots(): Promise<Record<string, string>>;
}

/** Locations (spaces) */
export interface LocationRepo {
  list(): Promise<UserLocation[]>;
  create(input: { name: string; lightScore: number; airflowScore: number; weatherWeight?: number }): Promise<UserLocation>;
  update(id: string, patch: Partial<Pick<UserLocation, 'name' | 'lightScore' | 'airflowScore' | 'weatherWeight'>>): Promise<UserLocation>;
  /** Convenience — wraps update({ name }). Cascades the rename to plants.location. */
  rename(id: string, name: string): Promise<UserLocation>;
  remove(id: string): Promise<void>;
}

/** Photos */
export interface StorageRepo {
  uploadPhoto(plantId: string, fileUri: string): Promise<UploadResult>;
  deletePhoto(path: string): Promise<void>;
}

/** Realtime */
export interface RealtimeRepo {
  subscribeToPlants(
    ownerId: string,
    handler: (event: { kind: 'upsert'; plant: Plant } | { kind: 'delete'; id: string }) => void,
  ): Unsubscribe;
  subscribeToLogs(ownerId: string, handler: (log: LogEntry) => void): Unsubscribe;
}

/** App preferences persisted server-side so they sync across devices. */
export type ProfilePrefs = {
  displayName: string | null;
  avatarUrl: string | null;
  theme: 'light' | 'dark' | 'system';
  accent: 'green' | 'sage' | 'ochre' | 'forest';
  font: 'pretendard' | 'gowun' | 'myeongjo';
  /** 식물이 있는 위치 — 첫 로그인 시 자동 저장, Me 탭에서 변경. */
  lat?: number | null;
  lng?: number | null;
  placeLabel?: string | null;
  locationSource?: 'gps' | 'ip' | 'manual' | null;
};

export interface ProfileRepo {
  get(): Promise<ProfilePrefs | null>;
  update(patch: Partial<ProfilePrefs>): Promise<void>;
  /** Convenience for the location flow — wraps update() with the right keys. */
  savePlace(place: { lat: number | null; lng: number | null; label: string | null; source: 'gps' | 'ip' | 'manual' | null }): Promise<void>;
}

export type Repos = {
  auth: AuthRepo;
  plants: PlantRepo;
  logs: LogRepo;
  locations: LocationRepo;
  storage: StorageRepo;
  realtime: RealtimeRepo;
  profile: ProfileRepo;
};
