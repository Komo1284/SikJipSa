import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NAMESPACES, resources } from './resources';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'app.language';
const FALLBACK: AppLanguage = 'en';

function isSupported(code: string | null | undefined): code is AppLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** 기기 로케일을 지원 언어로 매핑. ko/en/ja 외에는 영어 fallback. */
function deviceLanguage(): AppLanguage {
  const code = Localization.getLocales()[0]?.languageCode ?? null;
  return isSupported(code) ? code : FALLBACK;
}

// 첫 렌더 전에 동기 초기화 — 기기 언어로 시작하고, 저장된 수동 선택은 비동기로 덮어쓴다.
i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: FALLBACK,
  ns: NAMESPACES as unknown as string[],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// 저장된 선택이 있으면 적용.
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if (isSupported(saved) && saved !== i18n.language) i18n.changeLanguage(saved);
  })
  .catch(() => {});

/** 언어 전환 + 저장. */
export async function setAppLanguage(lang: AppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // 저장 실패해도 이번 세션 전환은 유지.
  }
}

export default i18n;
