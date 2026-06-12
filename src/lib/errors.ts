/**
 * 사용자에게 보여줄 에러 메시지 매핑 — 표시 전용 레이어.
 *
 * Supabase/Postgres 코드(PGRST301, 42501…), 영어 fetch 에러, SDK 메시지가
 * 토스트/Alert 에 그대로 노출되는 것을 막는다. 원본 에러는 호출부에서
 * console.warn 으로 남기고, 화면에는 이 함수의 결과만 내보낸다.
 */
export function humanizeError(
  e: unknown,
  fallback = '문제가 생겼어요. 잠시 후 다시 시도해주세요.',
): string {
  const raw = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  const code = String((e as { code?: unknown })?.code ?? '');
  const text = `${code} ${raw}`.toLowerCase();

  if (/network|fetch|timeout|connection|socket|offline|econn|enotfound/.test(text))
    return '네트워크 연결을 확인해주세요.';
  if (/play.?services/.test(text))
    return 'Google Play 서비스를 사용할 수 없어요. 기기 설정을 확인해주세요.';
  if (/jwt|invalid token|refresh token|expired|auth session/.test(text))
    return '로그인이 만료됐어요. 다시 로그인해주세요.';
  if (/42501|pgrst301|row-level security|permission|unauthorized|forbidden/.test(text))
    return '접근 권한이 없어요. 다시 로그인한 뒤 시도해주세요.';
  if (/23505|duplicate|already exists/.test(text))
    return '이미 같은 항목이 있어요.';
  if (/payload too large|entity too large|\b413\b/.test(text))
    return '파일이 너무 커요. 더 작은 사진으로 시도해주세요.';
  if (/rate limit|too many requests|\b429\b/.test(text))
    return '요청이 너무 잦아요. 잠시 후 다시 시도해주세요.';
  if (/internal server|\b50[0-4]\b/.test(text))
    return '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.';
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
