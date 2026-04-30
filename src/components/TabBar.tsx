import { Tap } from '@/components/Tap';
import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Calendar, Grid3x3, Home, Plus, User } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Item =
  | { kind: 'tab'; route: string; label: string; icon: typeof Home }
  | { kind: 'add' };

const ITEMS: Item[] = [
  { kind: 'tab', route: 'home', label: '홈', icon: Home },
  { kind: 'tab', route: 'list', label: '식물', icon: Grid3x3 },
  { kind: 'add' },
  { kind: 'tab', route: 'schedule', label: '일정', icon: Calendar },
  { kind: 'tab', route: 'me', label: '나', icon: User },
];

export function TabBar(props: BottomTabBarProps) {
  const { palette, shadows, weights } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const current = props.state.routes[props.state.index]?.name;

  const go = (routeName: string) => {
    const target = props.state.routes.find((r) => r.name === routeName);
    if (!target) return;
    const event = props.navigation.emit({
      type: 'tabPress',
      target: target.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented && current !== routeName) {
      props.navigation.navigate(target.name, target.params);
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: Math.max(insets.bottom, 14),
      }}
    >
      <View
        style={{
          height: 64,
          borderRadius: 999,
          backgroundColor: palette.surfaceRaised,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 10,
          ...shadows.lg,
        }}
      >
        {ITEMS.map((it) => {
          if (it.kind === 'add') {
            return <AddTabButton key="add" onPress={() => router.push('/add')} />;
          }
          const active = current === it.route;
          return (
            <TabButton
              key={it.route}
              label={it.label}
              icon={it.icon}
              active={active}
              onPress={() => go(it.route)}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  label, icon: IconCmp, active, onPress,
}: {
  label: string; icon: typeof Home; active: boolean; onPress: () => void;
}) {
  const { palette, weights } = useTheme();
  // Animated indicator: a thin pill grows behind the icon when active.
  const pillOpacity = useSharedValue(active ? 1 : 0);
  const pillScale = useSharedValue(active ? 1 : 0.6);
  React.useEffect(() => {
    pillOpacity.value = withTiming(active ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
    pillScale.value   = withTiming(active ? 1 : 0.6, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [active, pillOpacity, pillScale]);
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ scale: pillScale.value }],
  }));

  const color = active ? palette.greenDeep : palette.ink3;

  return (
    <Tap
      onPress={onPress}
      pressedScale={0.92}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingVertical: 8,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ width: 44, height: 26, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0, right: 0, top: 0, bottom: 0,
              backgroundColor: palette.greenBg,
              borderRadius: 999,
            },
            pillStyle,
          ]}
        />
        <IconCmp size={22} color={color} strokeWidth={active ? 2 : 1.8} />
      </View>
      <ThemedText
        variant="tiny"
        family="mono"
        color={color}
        style={{
          fontFamily: weights.monoMedium,
          fontSize: 10,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </ThemedText>
    </Tap>
  );
}

function AddTabButton({ onPress }: { onPress: () => void }) {
  const { palette, shadows } = useTheme();
  return (
    <Tap
      onPress={onPress}
      pressedScale={0.9}
      style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: palette.green,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ translateY: -8 }],
        ...shadows.md,
      }}
    >
      <Plus size={26} color={palette.bg} strokeWidth={2.4} />
    </Tap>
  );
}
