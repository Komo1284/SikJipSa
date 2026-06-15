import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import type { Plant } from '@/types/plant';
import { TODAY, daysBetween } from '@/utils/date';
import { Check, Droplet } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';

type Props = {
  plant: Plant;
  onDone: (plant: Plant) => void;
  size?: number;
};

export function WaterButton({ plant, onDone, size = 44 }: Props) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const [done, setDone] = useState(false);
  const scale = useSharedValue(1);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(1);

  const overdue = daysBetween(TODAY, plant.nextWater) < 0;

  const bg = done ? palette.green : overdue ? palette.warn : palette.drop;
  const bgSoft = done ? palette.greenSoft : overdue ? palette.warnSoft : palette.dropSoft;

  // Reset done state when the plant data changes externally.
  useEffect(() => { setDone(false); }, [plant.lastWater]);

  const press = () => {
    if (done) return;
    haptics.success();
    scale.value = withSequence(withTiming(0.9, { duration: 80 }), withTiming(1.05, { duration: 120 }), withTiming(1, { duration: 80 }));
    rippleOpacity.value = 0.55;
    rippleScale.value = 1;
    rippleOpacity.value = withTiming(0, { duration: 550 });
    rippleScale.value = withTiming(1.8, { duration: 550 });
    setTimeout(() => setDone(true), 150);
    onDone(plant);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleOpacity.value,
    transform: [{ scale: rippleScale.value }],
  }));

  return (
    <Pressable
      onPress={press}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={done ? t('components.waterButton.justWatered') : t('components.waterButton.water')}
    >
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgSoft,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animStyle,
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: 2,
              borderColor: bg,
            },
            rippleStyle,
          ]}
        />
        <View>
          {done ? <Check size={size * 0.5} color={bg} strokeWidth={2.4} /> : <Droplet size={size * 0.5} color={bg} fill={bg} />}
        </View>
      </Animated.View>
    </Pressable>
  );
}
