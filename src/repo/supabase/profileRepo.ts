import type { ProfilePrefs, ProfileRepo } from '@/repo/contracts';
import { hasSupabase, supabase } from './client';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  theme: 'light' | 'dark' | 'system';
  accent: 'green' | 'sage' | 'ochre' | 'forest';
  font: 'pretendard' | 'gowun' | 'myeongjo';
  lat: number | null;
  lng: number | null;
  place_label: string | null;
  location_source: 'gps' | 'ip' | 'manual' | null;
  location_set_at?: string | null;
};

const rowToPrefs = (r: ProfileRow): ProfilePrefs => ({
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
  theme: r.theme,
  accent: r.accent,
  font: r.font,
  lat: r.lat,
  lng: r.lng,
  placeLabel: r.place_label,
  locationSource: r.location_source,
});

export const supabaseProfileRepo: ProfileRepo = {
  async get() {
    if (!hasSupabase || !supabase) return null;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToPrefs(data as ProfileRow) : null;
  },

  async update(patch) {
    if (!hasSupabase || !supabase) return;
    const row: Partial<ProfileRow> = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (patch.theme !== undefined) row.theme = patch.theme;
    if (patch.accent !== undefined) row.accent = patch.accent;
    if (patch.font !== undefined) row.font = patch.font;
    if (patch.lat !== undefined) row.lat = patch.lat;
    if (patch.lng !== undefined) row.lng = patch.lng;
    if (patch.placeLabel !== undefined) row.place_label = patch.placeLabel;
    if (patch.locationSource !== undefined) row.location_source = patch.locationSource;
    if (patch.lat !== undefined || patch.lng !== undefined || patch.placeLabel !== undefined) {
      row.location_set_at = new Date().toISOString();
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error('Not authenticated');
    const { error } = await supabase.from('profiles').update(row).eq('id', auth.user.id);
    if (error) throw error;
  },

  async savePlace(place) {
    return this.update({
      lat: place.lat,
      lng: place.lng,
      placeLabel: place.label,
      locationSource: place.source,
    });
  },
};
