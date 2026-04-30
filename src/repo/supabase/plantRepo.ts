import { SEED_PLANTS } from '@/data/plants';
import type { PlantRepo } from '@/repo/contracts';
import type { Plant, PlantMood } from '@/types/plant';
import { hasSupabase, supabase } from './client';

/**
 * Exactly matches the columns in supabase/schema.sql (+ migration_002).
 * Keep this type in sync whenever the schema changes.
 */
type PlantRow = {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  location: string;
  light: string;
  humidity: string;
  water_cycle_days: number;
  fert_cycle_days: number;
  last_water: string;
  last_fert: string;
  next_water: string;
  note: string;
  thumb_color: string;
  thumb_mood: PlantMood;
  photo_url: string | null;
  species_humidity_pref?: number | null;
  species_light_pref?: number | null;
  recommended_next_water?: string | null;
  recommendation_reason?: string | null;
  recommendation_delta?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

const rowToPlant = (r: PlantRow): Plant => ({
  id: r.id,
  name: r.name,
  species: r.species,
  location: r.location,
  light: r.light,
  humidity: r.humidity,
  waterCycle: r.water_cycle_days,
  fertCycle: r.fert_cycle_days,
  lastWater: r.last_water,
  lastFert: r.last_fert,
  nextWater: r.next_water,
  note: r.note,
  color: r.thumb_color,
  mood: r.thumb_mood,
  photoUrl: r.photo_url,
  speciesHumidityPref: r.species_humidity_pref ?? null,
  speciesLightPref: r.species_light_pref ?? null,
  recommendedNextWater: r.recommended_next_water ?? null,
  recommendationReason: r.recommendation_reason ?? null,
  recommendationDelta: r.recommendation_delta ?? null,
});

/**
 * Payload for INSERT. `id` and `owner_id` are filled by the DB
 * (gen_random_uuid() and auth.uid() default respectively).
 */
type PlantInsert = Omit<PlantRow, 'id' | 'owner_id' | 'created_at' | 'updated_at' | 'deleted_at'>;

const plantToInsert = (p: Plant): PlantInsert => ({
  name: p.name,
  species: p.species,
  location: p.location,
  light: p.light,
  humidity: p.humidity,
  water_cycle_days: p.waterCycle,
  fert_cycle_days: p.fertCycle,
  last_water: p.lastWater,
  last_fert: p.lastFert,
  next_water: p.nextWater,
  note: p.note,
  thumb_color: p.color,
  thumb_mood: p.mood,
  photo_url: p.photoUrl ?? null,
  species_humidity_pref: p.speciesHumidityPref ?? null,
  species_light_pref: p.speciesLightPref ?? null,
  recommended_next_water: p.recommendedNextWater ?? null,
  recommendation_reason: p.recommendationReason ?? null,
  recommendation_delta: p.recommendationDelta ?? null,
});

const seedStore = { plants: [...SEED_PLANTS] };

export const supabasePlantRepo: PlantRepo = {
  async list() {
    if (!hasSupabase || !supabase) return [...seedStore.plants];
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .is('deleted_at', null)
      .order('next_water', { ascending: true });
    if (error) throw error;
    return (data as PlantRow[]).map(rowToPlant);
  },

  async get(id) {
    if (!hasSupabase || !supabase) {
      return seedStore.plants.find((p) => p.id === id) ?? null;
    }
    const { data, error } = await supabase.from('plants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? rowToPlant(data as PlantRow) : null;
  },

  async create(plant) {
    if (!hasSupabase || !supabase) {
      seedStore.plants.unshift(plant);
      return plant;
    }
    const { data, error } = await supabase
      .from('plants')
      .insert(plantToInsert(plant))
      .select()
      .single();
    if (error) throw error;
    return rowToPlant(data as PlantRow);
  },

  async update(id, patch) {
    if (!hasSupabase || !supabase) {
      const idx = seedStore.plants.findIndex((p) => p.id === id);
      if (idx < 0) throw new Error('Plant not found');
      seedStore.plants[idx] = { ...seedStore.plants[idx], ...patch };
      return seedStore.plants[idx];
    }
    const patchRow: Partial<PlantRow> = {};
    if (patch.name !== undefined) patchRow.name = patch.name;
    if (patch.species !== undefined) patchRow.species = patch.species;
    if (patch.location !== undefined) patchRow.location = patch.location;
    if (patch.light !== undefined) patchRow.light = patch.light;
    if (patch.humidity !== undefined) patchRow.humidity = patch.humidity;
    if (patch.waterCycle !== undefined) patchRow.water_cycle_days = patch.waterCycle;
    if (patch.fertCycle !== undefined) patchRow.fert_cycle_days = patch.fertCycle;
    if (patch.lastWater !== undefined) patchRow.last_water = patch.lastWater;
    if (patch.lastFert !== undefined) patchRow.last_fert = patch.lastFert;
    if (patch.nextWater !== undefined) patchRow.next_water = patch.nextWater;
    if (patch.note !== undefined) patchRow.note = patch.note;
    if (patch.color !== undefined) patchRow.thumb_color = patch.color;
    if (patch.mood !== undefined) patchRow.thumb_mood = patch.mood;
    if (patch.photoUrl !== undefined) patchRow.photo_url = patch.photoUrl ?? null;
    if (patch.speciesHumidityPref !== undefined) patchRow.species_humidity_pref = patch.speciesHumidityPref ?? null;
    if (patch.speciesLightPref !== undefined) patchRow.species_light_pref = patch.speciesLightPref ?? null;
    if (patch.recommendedNextWater !== undefined) patchRow.recommended_next_water = patch.recommendedNextWater ?? null;
    if (patch.recommendationReason !== undefined) patchRow.recommendation_reason = patch.recommendationReason ?? null;
    if (patch.recommendationDelta !== undefined) patchRow.recommendation_delta = patch.recommendationDelta ?? null;

    const { data, error } = await supabase
      .from('plants')
      .update(patchRow)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToPlant(data as PlantRow);
  },

  async softDelete(id) {
    if (!hasSupabase || !supabase) {
      seedStore.plants = seedStore.plants.filter((p) => p.id !== id);
      return;
    }
    const { error } = await supabase
      .from('plants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },
};
