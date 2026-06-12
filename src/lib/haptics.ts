import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * 햅틱 래퍼 — 웹/미지원 기기에서는 조용히 no-op. 호출처는 실패를 신경
 * 쓰지 않아도 된다 (모든 함수 fire-and-forget).
 */
const canVibrate = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  /** 물주기 완료, 저장 성공 같은 긍정 피드백. */
  success() {
    if (!canVibrate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** 기록 실패, 검증 에러 같은 부정 피드백. */
  error() {
    if (!canVibrate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  /** 삭제 확인 등 무게감 있는 동작. */
  heavy() {
    if (!canVibrate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** 토글·선택 같은 가벼운 터치 반응. */
  light() {
    if (!canVibrate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
};
