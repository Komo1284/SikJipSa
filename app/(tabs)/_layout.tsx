import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabsLayout() {
  const { palette } = useTheme();
  const { isDesktop } = useResponsive();

  // On desktop the persistent Sidebar replaces the floating TabBar.
  return (
    <Tabs
      tabBar={isDesktop ? () => null : (props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="list" options={{ title: '식물' }} />
      <Tabs.Screen name="schedule" options={{ title: '일정' }} />
      <Tabs.Screen name="me" options={{ title: '나' }} />
    </Tabs>
  );
}
