import type { Repos } from '@/repo/contracts';
import { supabaseAuthRepo } from './authRepo';
import { supabaseLocationRepo } from './locationRepo';
import { supabaseLogRepo } from './logRepo';
import { supabasePlantRepo } from './plantRepo';
import { supabaseProfileRepo } from './profileRepo';
import { supabaseRealtimeRepo } from './realtimeRepo';
import { supabaseStorageRepo } from './storageRepo';

export function createRepos(): Repos {
  return {
    auth: supabaseAuthRepo,
    plants: supabasePlantRepo,
    logs: supabaseLogRepo,
    locations: supabaseLocationRepo,
    storage: supabaseStorageRepo,
    realtime: supabaseRealtimeRepo,
    profile: supabaseProfileRepo,
  };
}
