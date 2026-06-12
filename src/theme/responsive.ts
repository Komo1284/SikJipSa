import { useWindowDimensions, type ViewStyle } from 'react-native';

/** Breakpoint matches design handoff §반응형 레이아웃. */
export const BP = { tablet: 768, desktop: 1024 } as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const breakpoint: Breakpoint = width >= BP.desktop ? 'desktop' : width >= BP.tablet ? 'tablet' : 'mobile';
  return {
    width,
    height,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    /** Mobile OR tablet — anything below desktop. */
    isCompact: breakpoint !== 'desktop',
  };
}

/**
 * 태블릿(768–1023px)은 데스크톱 분기를 타지 않아 모바일 레이아웃이 화면
 * 전체 폭으로 늘어진다. ScrollView contentContainerStyle 등에 끼워 넣으면
 * 콘텐츠 폭을 묶고 중앙 정렬해준다 — 모바일/데스크톱에서는 null.
 */
export function useTabletContentCap(max = 640): ViewStyle | null {
  const { isTablet } = useResponsive();
  return isTablet ? { maxWidth: max, width: '100%', alignSelf: 'center' } : null;
}
