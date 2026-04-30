import type { LocationRepo } from '@/repo/contracts';
import type { UserLocation } from '@/types/plant';
import { hasSupabase, supabase } from './client';

type LocationRow = {
  id: string;
  name: string;
  sort_order: number;
  light_score: number;
  airflow_score: number;
  weather_weight: number;
};

const rowToLocation = (r: LocationRow): UserLocation => ({
  id: r.id,
  name: r.name,
  sortOrder: r.sort_order,
  lightScore: r.light_score,
  airflowScore: r.airflow_score,
  weatherWeight: r.weather_weight,
});

const SELECT = 'id, name, sort_order, light_score, airflow_score, weather_weight';

const SEED: UserLocation[] = [
  { id: '거실',   name: '거실',   sortOrder: 0, lightScore: 4, airflowScore: 4, weatherWeight: 0.4 },
  { id: '침실',   name: '침실',   sortOrder: 1, lightScore: 2, airflowScore: 3, weatherWeight: 0.3 },
  { id: '베란다', name: '베란다', sortOrder: 2, lightScore: 5, airflowScore: 5, weatherWeight: 0.9 },
  { id: '온실장', name: '온실장', sortOrder: 3, lightScore: 3, airflowScore: 1, weatherWeight: 0.1 },
];

export const supabaseLocationRepo: LocationRepo = {
  async list() {
    if (!hasSupabase || !supabase) return SEED;
    const { data, error } = await supabase
      .from('locations')
      .select(SELECT)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as LocationRow[]).map(rowToLocation);
  },

  async create(input) {
    if (!hasSupabase || !supabase) throw new Error('Supabase not configured');
    const { data: tail } = await supabase
      .from('locations')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = tail && tail.length > 0 ? (tail[0] as { sort_order: number }).sort_order + 1 : 0;

    const ww = (input as { weatherWeight?: number }).weatherWeight ?? 0.5;

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: input.name,
        sort_order: nextOrder,
        light_score: input.lightScore,
        airflow_score: input.airflowScore,
        weather_weight: ww,
      })
      .select(SELECT)
      .single();
    if (error) throw error;
    return rowToLocation(data as LocationRow);
  },

  async update(id, patch) {
    if (!hasSupabase || !supabase) throw new Error('Supabase not configured');

    let oldName: string | undefined;
    if (patch.name !== undefined) {
      const { data: old } = await supabase
        .from('locations').select('name').eq('id', id).maybeSingle();
      oldName = (old as { name: string } | null)?.name;
    }

    const row: Partial<LocationRow> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.lightScore !== undefined) row.light_score = patch.lightScore;
    if (patch.airflowScore !== undefined) row.airflow_score = patch.airflowScore;
    const wp = (patch as { weatherWeight?: number }).weatherWeight;
    if (wp !== undefined) row.weather_weight = wp;

    const { data, error } = await supabase
      .from('locations')
      .update(row)
      .eq('id', id)
      .select(SELECT)
      .single();
    if (error) throw error;

    if (oldName && patch.name && oldName !== patch.name) {
      const { error: cascadeErr } = await supabase
        .from('plants')
        .update({ location: patch.name })
        .eq('location', oldName);
      if (cascadeErr) console.warn('[locationRepo] cascade rename failed:', cascadeErr);
    }

    return rowToLocation(data as LocationRow);
  },

  async rename(id, name) {
    return this.update(id, { name });
  },

  async remove(id) {
    if (!hasSupabase || !supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  },
};
