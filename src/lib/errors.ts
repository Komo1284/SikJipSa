import i18n from '@/i18n';

/**
 * 사용자에게 보여줄 에러 메시지 매핑 — 표시 전용 레이어.
 *
 * Supabase/Postgres 코드(PGRST301, 42501…), 영어 fetch 에러, SDK 메시지가
 * 토스트/Alert 에 그대로 노출되는 것을 막는다. 원본 에러는 호출부에서
 * console.warn 으로 남기고, 화면에는 이 함수의 결과만 내보낸다.
 */
export function humanizeError(
  e: unknown,
  fallback = i18n.t('errors.generic'),
): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  const code = String((e as { code?: unknown })?.code ?? '');
  const text = `${code} ${raw}`.toLowerCase();

  if (/network|fetch|timeout|connection|socket|offline|econn|enotfound/.test(text))
    return i18n.t('errors.network');
  if (/play.?services/.test(text))
    return i18n.t('errors.playServices');
  if (/jwt|invalid token|refresh token|expired|auth session/.test(text))
    return i18n.t('errors.sessionExpired');
  if (/42501|pgrst301|row-level security|permission|unauthorized|forbidden/.test(text))
    return i18n.t('errors.forbidden');
  if (/23505|duplicate|already exists/.test(text))
    return i18n.t('errors.duplicate');
  if (/payload too large|entity too large|\b413\b/.test(text))
    return i18n.t('errors.payloadTooLarge');
  if (/rate limit|too many requests|\b429\b/.test(text))
    return i18n.t('errors.rateLimit');
  if (/internal server|\b50[0-4]\b/.test(text))
    return i18n.t('errors.serverError');
  return fallback;
}

/**
 * 사용자가 스스로 닫은(취소한) 로그인/선택 시도인지 — 취소에는 에러
 * 토스트나 Alert 를 띄우지 않기 위한 판별.
 */
export function isUserCancelled(e: unknown): boolean {
  const raw = e instanceof Error ? e.message : String(e ?? '');
  const code = String((e as { code?: unknown })?.code ?? '');
  return /cancel|dismiss/i.test(`${code} ${raw}`);
}
