/**
 * 약관·정책 문서 URL (현재 앱 언어에 맞춰 반환).
 *
 * GitHub Pages(gh-pages 브랜치)에 언어별 정적 HTML로 배포된다.
 * 저장소: Komo1284/SikJipSa → https://komo1284.github.io/SikJipSa/
 *   ko: terms.html / privacy.html
 *   en: terms.en.html / privacy.en.html
 *   ja: terms.ja.html / privacy.ja.html
 */
import i18n from '@/i18n';

const BASE = 'https://komo1284.github.io/SikJipSa';

function legalUrl(doc: 'terms' | 'privacy'): string {
  const lang = (i18n.language ?? 'ko').split('-')[0];
  const suffix = lang === 'en' || lang === 'ja' ? `.${lang}` : '';
  return `${BASE}/${doc}${suffix}.html`;
}

// getter 라서 호출 시점의 현재 언어로 URL을 만든다 (LEGAL_URLS.terms 사용처 변경 불필요).
export const LEGAL_URLS = {
  get terms() {
    return legalUrl('terms');
  },
  get privacy() {
    return legalUrl('privacy');
  },
};
