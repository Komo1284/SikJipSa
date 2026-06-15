import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';
import { useResponsive } from '@/theme/responsive';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation();
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
      <Tabs.Screen name="home" options={{ title: t('components.tabBar.home') }} />
      <Tabs.Screen name="list" options={{ title: t('components.tabBar.plants') }} />
      <Tabs.Screen name="schedule" options={{ title: t('components.tabBar.schedule') }} />
      <Tabs.Screen name="me" options={{ title: t('components.tabBar.me') }} />
    </Tabs>
  );
}
