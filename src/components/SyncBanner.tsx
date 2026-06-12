import { ThemedText } from '@/components/Typography';
import { useSyncStatus } from '@/lib/offlineQueue';
import { useTheme } from '@/theme/ThemeProvider';
import { CloudOff, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

/**
 * 오프라인/동기화 대기 상태를 알려주는 얇은 배너. 온라인이고 대기 작업이
 * 없으면 아무것도 그리지 않으므로 화면 상단에 상시 배치해도 된다 —
 * 예전엔 큐에 기록이 쌓여도 사용자가 알 길이 없었다.
 */
export function SyncBanner() {
  const { palette, radii } = useTheme();
  const { pending, online } = useSyncStatus();

  if (online && pending === 0) return null;

  const Icon = online ? RefreshCw : CloudOff;
  const message = !online
    ? pending > 0
      ? `오프라인 — 기록 ${pending}개가 연결을 기다리고 있어요`
      : '오프라인 — 기록은 저장해뒀다가 연결되면 보낼게요'
    : `동기화 중 — ${pending}개 남음`;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: palette.bg2,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: radii.sm,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 10,
      }}
    >
      <Icon size={14} color={palette.ink3} strokeWidth={1.8} />
      <ThemedText variant="tiny" color={palette.ink2} style={{ flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}
