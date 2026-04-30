import { useWindowDimensions } from 'react-native';

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
