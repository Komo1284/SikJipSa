import { SEED_LOG } from '@/data/plants';
import type { LogRepo } from '@/repo/contracts';
import type { LogEntry } from '@/types/plant';
import { parseISODate } from '@/utils/date';
import { hasSupabase, supabase } from './client';

type LogRow = {
  id: number;
  plant_id: string;
  owner_id: string;
  action: LogEntry['action'];
  occurred_at: string; // ISO timestamptz
  note: string | null;
  photo_url: string | null;
  created_at?: string;
};

const rowToLog = (r: LogRow): LogEntry => ({
  date: r.occurred_at.slice(0, 10),
  action: r.action,
  plantId: r.plant_id,
  note: r.note ?? '',
  photoUrl: r.photo_url ?? null,
});

const seedStore = { log: [...SEED_LOG] };

export const supabaseLogRepo: LogRepo = {
  async listForPlant(plantId, limit = 50) {
    if (!hasSupabase || !supabase) {
      return seedStore.log.filter((l) => l.plantId === plantId).slice(0, limit);
    }
    const { data, error } = await supabase
      .from('plant_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as LogRow[]).map(rowToLog);
  },

  async listRecent(days) {
    if (!hasSupabase || !supabase) return [...seedStore.log];
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data, error } = await supabase
      .from('plant_logs')
      .select('*')
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: false });
    if (error) throw error;
    return (data as LogRow[]).map(rowToLog);
  },

  async insert(entry) {
    if (!hasSupabase || !supabase) {
      const full: LogEntry = { ...entry };
      seedStore.log.unshift(full);
      return full;
    }
    // owner_id is auto-filled via DB default (auth.uid()).
    const { data, error } = await supabase
      .from('plant_logs')
      .insert({
        plant_id: entry.plantId,
        action: entry.action,
        // entry.date is a "YYYY-MM-DD" calendar day. Anchor it to local
        // midnight before serializing — `new Date('YYYY-MM-DD')` treats the
        // string as UTC midnight, which lands the timestamptz on +09:00 of the
        // intended day in KST and on the wrong day in some timezones.
        occurred_at: parseISODate(entry.date).toISOString(),
        note: entry.note ?? '',
        photo_url: entry.photoUrl ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToLog(data as LogRow);
  },
};
