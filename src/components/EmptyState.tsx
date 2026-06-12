import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import { Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  /** 이미 크기·색이 정해진 lucide 아이콘 노드. */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * compact: 섹션 안에 끼워 넣는 카드형 (홈 '오늘 할 일', 상세 기록 탭 등).
   * 기본(full): 화면 전체를 채우는 빈 상태 (목록/일정의 식물 0개 등).
   */
  compact?: boolean;
};

/**
 * 빈 상태 공용 컴포넌트 — 화면마다 텍스트 한 줄, 아이콘+CTA 풀 구성이
 * 제각각이던 것을 통일한다. CTA 는 full 이면 pill 버튼, compact 면
 * 텍스트 링크로 그려진다.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction, compact }: Props) {
  const { palette, radii } = useTheme();

  if (compact) {
    return (
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: radii.lg,
          paddingVertical: 28,
          paddingHorizontal: 20,
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon}
        <ThemedText variant="body" weight="medium" color={palette.ink2}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText variant="tiny" color={palette.ink3} style={{ textAlign: 'center', lineHeight: 18 }}>
            {description}
          </ThemedText>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} style={{ marginTop: 4 }}>
            <ThemedText variant="meta" weight="semibold" color={palette.green}>
              {actionLabel}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
      {icon ? (
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: palette.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          {icon}
        </View>
      ) : null}
      <ThemedText variant="subsection" weight="semibold" style={{ marginBottom: 8 }}>
        {title}
      </ThemedText>
      {description ? (
        <ThemedText variant="meta" color={palette.ink3} style={{ textAlign: 'center', marginBottom: 24 }}>
          {description}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingVertical: 12,
            paddingHorizontal: 22,
            borderRadius: 999,
            backgroundColor: palette.ink,
          }}
        >
          <Plus size={16} color={palette.bg} strokeWidth={2.2} />
          <ThemedText variant="meta" weight="semibold" color={palette.bg}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}
