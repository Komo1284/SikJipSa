import { Sidebar } from '@/components/web/Sidebar';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { View } from 'react-native';

/**
 * Wraps the current route's content with the persistent desktop sidebar.
 * Only renders the sidebar at width ≥ 1024; on compact viewports, returns
 * children untouched so the mobile tab bar layout takes over.
 */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  const spaceFilter = useUIStore((s) => s.spaceFilter);
  const setSpaceFilter = useUIStore((s) => s.setSpaceFilter);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.bg }}>
      <Sidebar spaceFilter={spaceFilter} onSpaceFilter={setSpaceFilter} />
      <View style={{ flex: 1, backgroundColor: palette.bg }}>{children}</View>
    </View>
  );
}
