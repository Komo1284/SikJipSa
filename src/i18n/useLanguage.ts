import { useTranslation } from 'react-i18next';
import { type AppLanguage, setAppLanguage } from './index';

export const LANGUAGE_OPTIONS: { code: AppLanguage; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

/** 현재 언어와 전환 함수를 제공. 언어 변경 시 useTranslation이 리렌더를 트리거한다. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split('-')[0] ?? 'ko') as AppLanguage;
  return {
    language: current,
    setLanguage: setAppLanguage,
    options: LANGUAGE_OPTIONS,
  };
}
