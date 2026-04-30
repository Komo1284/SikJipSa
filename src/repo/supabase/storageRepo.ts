import type { StorageRepo } from '@/repo/contracts';
import { hasSupabase, supabase } from './client';

const BUCKET = 'plant-photos';

function guessContentType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (ext === 'png') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Reads a local file URI into an ArrayBuffer.
 * RN's `fetch(uri).blob()` path produces empty blobs for file:// URIs, so we
 * must use arrayBuffer() instead.
 */
async function readAsArrayBuffer(fileUri: string): Promise<ArrayBuffer> {
  const response = await fetch(fileUri);
  return response.arrayBuffer();
}

export const supabaseStorageRepo: StorageRepo = {
  async uploadPhoto(plantId, fileUri) {
    if (!hasSupabase || !supabase) {
      // Dev fallback — just return the local URI so PlantThumb can preview.
      return { path: fileUri, publicUrl: fileUri };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다');

    const ext = fileUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${user.id}/${plantId}/${Date.now()}.${ext}`;
    const contentType = guessContentType(fileUri);

    const body = await readAsArrayBuffer(fileUri);
    if (body.byteLength === 0) {
      throw new Error('사진 파일을 읽지 못했어요 (0 bytes)');
    }

    const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
      contentType,
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  },

  async deletePhoto(path) {
    if (!hasSupabase || !supabase) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  },
};
