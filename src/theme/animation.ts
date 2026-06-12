/**
 * 앱 전역 모션 토큰 — 컴포넌트마다 제각각이던 duration(90/140/200/220/240/
 * 260/300ms…)을 한곳에 모은다. 새 애니메이션을 추가할 때는 여기 값만 쓰고,
 * 새로운 숫자가 필요해지면 토큰을 추가한 뒤 사용한다.
 */
export const durations = {
  /** 누름 피드백 — 눌리는 순간 (Tap pressIn) */
  pressIn: 90,
  /** 누름 피드백 — 떼는 순간 (Tap pressOut) */
  pressOut: 140,
  /** 작은 요소 전환 (탭바 pill, 칩 토글 등) */
  small: 200,
  /** 표준 진입 (토스트 등 화면 위 오버레이) */
  enter: 260,
  /** 표준 이탈 — 진입보다 짧게 끊어 가볍게 */
  exit: 220,
  /** 바텀시트/모달 진입 */
  sheetEnter: 300,
  /** 바텀시트/모달 이탈 */
  sheetExit: 240,
} as const;

/**
 * 시트를 닫고 나서 네비게이션 같은 후속 동작을 미루는 딜레이.
 * sheetExit 와 항상 같은 값이어야 시트가 완전히 사라진 직후에 전환된다 —
 * 예전엔 200/220ms 가 섞여 있어 닫힘 애니메이션이 잘리는 경우가 있었다.
 */
export const SHEET_CLOSE_DELAY = durations.sheetExit;
