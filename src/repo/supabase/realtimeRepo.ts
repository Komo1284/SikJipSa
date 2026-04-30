import type { RealtimeRepo } from '@/repo/contracts';
import type { Unsubscribe } from '@/repo/types';
import type { LogEntry, Plant, PlantMood } from '@/types/plant';
import { hasSupabase, supabase } from './client';

type PlantRow = {
  id: string; name: string; species: string; location: string;
  light: string; humidity: string;
  water_cycle_days: number; fert_cycle_days: number;
  last_water: string; last_fert: string; next_water: string;
  note: string; thumb_color: string; thumb_mood: PlantMood;
  photo_url: string | null;
};

const toPlant = (r: PlantRow): Plant => ({
  id: r.id, name: r.name, species: r.species, location: r.location,
  light: r.light, humidity: r.humidity,
  waterCycle: r.water_cycle_days, fertCycle: r.fert_cycle_days,
  lastWater: r.last_water, lastFert: r.last_fert, nextWater: r.next_water,
  note: r.note, color: r.thumb_color, mood: r.thumb_mood, photoUrl: r.photo_url,
});

const noop: Unsubscribe = () => {};

export const supabaseRealtimeRepo: RealtimeRepo = {
  subscribeToPlants(ownerId, handler) {
    if (!hasSupabase || !supabase) return noop;
    const channel = supabase
      .channel(`plants-${ownerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plants', filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string } | undefined;
            if (old?.id) handler({ kind: 'delete', id: old.id });
            return;
          }
          if (payload.new && Object.keys(payload.new).length) {
            const row = payload.new as PlantRow & { deleted_at?: string | null };
            // Soft-delete arrives as UPDATE with deleted_at set — treat as delete.
            if (row.deleted_at) {
              handler({ kind: 'delete', id: row.id });
            } else {
              handler({ kind: 'upsert', plant: toPlant(row) });
            }
          }
        },
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  },

  subscribeToLogs(ownerId, handler) {
    if (!hasSupabase || !supabase) return noop;
    const channel = supabase
      .channel(`logs-${ownerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'plant_logs', filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          const r = payload.new as { plant_id: string; action: LogEntry['action']; occurred_at: string; note: string | null; photo_url: string | null };
          handler({
            plantId: r.plant_id,
            action: r.action,
            date: r.occurred_at.slice(0, 10),
            note: r.note ?? '',
            photoUrl: r.photo_url ?? null,
          });
        },
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  },
};
