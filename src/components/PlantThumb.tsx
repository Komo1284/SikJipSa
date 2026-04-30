import type { Plant, PlantMood } from '@/types/plant';
import React from 'react';
import { Image, StyleProp, View, ViewStyle } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';

type Props = {
  plant: Pick<Plant, 'id' | 'color' | 'mood' | 'photoUrl'>;
  size?: number;
  style?: StyleProp<ViewStyle>;
  radius?: number;
};

/**
 * Shows the user-uploaded photo when `photoUrl` is present, otherwise falls
 * back to an abstract SVG illustration keyed by mood.
 */
export function PlantThumb({ plant, size = 120, style, radius = 0 }: Props) {
  const wrap: StyleProp<ViewStyle> = [{ width: size, height: size, overflow: 'hidden', borderRadius: radius }, style];

  if (plant.photoUrl) {
    return (
      <View style={wrap}>
        <Image source={{ uri: plant.photoUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    );
  }

  const dark = plant.color;
  const composition = COMPOSITIONS[plant.mood] ?? COMPOSITIONS.tropical;
  const gradId = `vig-${plant.id}`;

  return (
    <View style={wrap}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={gradId} cx="30%" cy="20%" rx="120%" ry="120%" fx="30%" fy="20%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.15" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.35" />
          </RadialGradient>
          <LinearGradient id={`tint-${plant.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0.10" />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill={dark} />
        <Rect width="100" height="100" fill={`url(#tint-${plant.id})`} />
        {composition}
        <Rect width="100" height="100" fill={`url(#${gradId})`} />
      </Svg>
    </View>
  );
}

const velvet = (
  <G>
    <Path d="M50 90 Q20 70 22 40 Q30 15 50 15 Q70 15 78 40 Q80 70 50 90 Z" fill="rgba(255,255,255,0.14)" />
    <Path d="M50 90 Q25 68 25 42" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" fill="none" />
    <Path d="M50 90 Q75 68 75 42" stroke="rgba(255,255,255,0.28)" strokeWidth="0.8" fill="none" />
    <Path d="M50 90 L50 20" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
    <Path d="M50 60 Q38 52 30 48 M50 60 Q62 52 70 48 M50 45 Q40 40 34 36 M50 45 Q60 40 66 36"
      stroke="rgba(255,255,255,0.22)" strokeWidth="0.6" fill="none" />
  </G>
);

const silver = (
  <G>
    <Path d="M50 90 Q18 68 22 38 Q32 14 50 14 Q68 14 78 38 Q82 68 50 90 Z" fill="rgba(210,215,200,0.28)" />
    <Path d="M50 90 L50 18" stroke="rgba(240,240,230,0.55)" strokeWidth="1" />
    <Path d="M50 78 Q34 70 26 62 M50 62 Q34 56 26 48 M50 46 Q36 42 30 36"
      stroke="rgba(240,240,230,0.45)" strokeWidth="0.7" fill="none" />
    <Path d="M50 78 Q66 70 74 62 M50 62 Q66 56 74 48 M50 46 Q64 42 70 36"
      stroke="rgba(240,240,230,0.45)" strokeWidth="0.7" fill="none" />
  </G>
);

const frond = (
  <G stroke="rgba(255,255,255,0.32)" strokeWidth="0.8" fill="none">
    <Path d="M50 95 Q45 60 30 25" />
    <Path d="M50 95 Q55 60 70 25" />
    <Path d="M50 95 Q50 55 50 15" />
    <Path d="M50 95 Q35 70 15 50" />
    <Path d="M50 95 Q65 70 85 50" />
    {Array.from({ length: 12 }).map((_, i) => {
      const ang = -60 + i * 10;
      const r = (Math.PI / 180) * ang;
      const x1 = 50;
      const y1 = 95 - i * 6;
      const x2 = x1 + Math.cos(r) * 14;
      const y2 = y1 - Math.abs(Math.sin(r)) * 4;
      return <Line key={i} x1={x1 - 2} y1={y1} x2={x2 - 2} y2={y2} strokeWidth="0.5" />;
    })}
  </G>
);

const tropical = (dark: string) => (
  <G>
    <Path d="M50 88 Q20 70 22 40 Q32 15 50 15 Q68 15 78 40 Q80 70 50 88 Z" fill="rgba(255,255,255,0.14)" />
    <Path d="M32 40 Q38 44 38 52 L30 50 Z" fill={dark} />
    <Path d="M68 40 Q62 44 62 52 L70 50 Z" fill={dark} />
    <Path d="M30 60 Q36 64 38 72 L28 68 Z" fill={dark} />
    <Path d="M70 60 Q64 64 62 72 L72 68 Z" fill={dark} />
    <Path d="M50 88 L50 18" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
  </G>
);

const variegated = (
  <G>
    <Path d="M50 90 Q22 70 22 40 Q30 14 50 14 Q70 14 78 40 Q78 70 50 90 Z" fill="rgba(255,255,255,0.14)" />
    <Path d="M34 34 Q42 30 46 40 Q42 50 32 46 Z" fill="rgba(250,245,230,0.55)" />
    <Path d="M58 52 Q68 48 70 60 Q62 68 54 62 Z" fill="rgba(250,245,230,0.55)" />
    <Path d="M50 90 L50 18" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
  </G>
);

const tree = (
  <G>
    <Path d="M50 95 L50 55" stroke="rgba(200,180,150,0.6)" strokeWidth="2" />
    <Ellipse cx="50" cy="45" rx="28" ry="22" fill="rgba(255,255,255,0.15)" />
    <Ellipse cx="36" cy="38" rx="12" ry="10" fill="rgba(255,255,255,0.1)" />
    <Ellipse cx="64" cy="42" rx="12" ry="10" fill="rgba(255,255,255,0.1)" />
  </G>
);

const trailing = (
  <G stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" fill="none">
    <Path d="M20 15 Q30 40 28 65 Q26 85 18 95" />
    <Path d="M50 15 Q52 45 48 70 Q44 85 40 95" />
    <Path d="M80 15 Q72 40 75 65 Q78 88 84 95" />
    {[25, 50, 75].map((x, i) => (
      <G key={i}>
        {[30, 55, 80].map((y, j) => (
          <Circle key={j} cx={x + (j % 2 ? 2 : -2)} cy={y} r="2.2" fill="rgba(255,255,255,0.22)" stroke="none" />
        ))}
      </G>
    ))}
  </G>
);

const succulent = (
  <G>
    {Array.from({ length: 8 }).map((_, i) => {
      const ang = (i / 8) * 360;
      const r = (Math.PI / 180) * ang;
      const cx = 50 + Math.cos(r) * 12;
      const cy = 52 + Math.sin(r) * 12;
      return (
        <Ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx="9"
          ry="5"
          fill="rgba(255,255,255,0.18)"
          transform={`rotate(${ang} ${cx} ${cy})`}
        />
      );
    })}
    <Ellipse cx="50" cy="52" rx="10" ry="10" fill="rgba(255,255,255,0.28)" />
  </G>
);

const seedling = (
  <G>
    <Rect x="30" y="70" width="40" height="22" rx="2" fill="rgba(90,60,40,0.5)" />
    <Path d="M50 70 L50 50" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
    <Ellipse cx="44" cy="48" rx="6" ry="4" fill="rgba(255,255,255,0.3)" transform="rotate(-30 44 48)" />
    <Ellipse cx="56" cy="48" rx="6" ry="4" fill="rgba(255,255,255,0.3)" transform="rotate(30 56 48)" />
  </G>
);

// Tropical depends on the bg color, so we precompute a generic variant here
// and override in the switch inside the hook-free object.
const COMPOSITIONS: Record<PlantMood, React.ReactNode> = {
  velvet,
  silver,
  frond,
  tropical: tropical('#2d5a2d'),
  variegated,
  tree,
  trailing,
  succulent,
  seedling,
};
