/**
 * 약관·정책 문서 URL.
 *
 * GitHub Pages(gh-pages 브랜치)에 정적 HTML로 배포된다.
 * 저장소: Komo1284/SikJipSa → https://komo1284.github.io/SikJipSa/
 * 문서 소스는 gh-pages 브랜치의 terms.html / privacy.html.
 */
const BASE = 'https://komo1284.github.io/SikJipSa';

export const LEGAL_URLS = {
  terms: `${BASE}/terms.html`,
  privacy: `${BASE}/privacy.html`,
} as const;
