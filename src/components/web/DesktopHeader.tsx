import { Button } from '@/components/Button';
import { ThemedText } from '@/components/Typography';
import { useUIStore } from '@/store/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { formatKickerLong } from '@/utils/date';
import { RefreshCw, Search } from 'lucide-react-native';
import React from 'react';
import { TextInput, View } from 'react-native';

type Props = {
  kicker?: string;
  title: string;
  showSearch?: boolean;
  onRefresh?: () => void;
  /** true 면 새로고침 버튼을 비활성화해 진행 중임을 보여준다. */
  refreshing?: boolean;
};

export function DesktopHeader({ kicker = formatKickerLong(), title, showSearch = true, onRefresh, refreshing }: Props) {
  const { palette, weights } = useTheme();
  const query = useUIStore((s) => s.query);
  const setQuery = useUIStore((s) => s.setQuery);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <View>
        <ThemedText variant="tiny" family="mono" uppercase color={palette.ink3} style={{ letterSpacing: 1.4, marginBottom: 6 }}>
          {kicker}
        </ThemedText>
        <ThemedText
          family="serif"
          style={{ fontSize: 36, lineHeight: 40, fontFamily: weights.serifRegular, letterSpacing: -0.72 }}
        >
          {title}
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {showSearch ? (
          <View style={{ position: 'relative' }}>
            <View
              style={{
                position: 'absolute',
                left: 12,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                zIndex: 1,
              }}
            >
              <Search size={14} color={palette.ink3} strokeWidth={1.8} />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="이름이나 학명 검색…"
              placeholderTextColor={palette.ink3}
              style={{
                width: 260,
                paddingVertical: 10,
                paddingLeft: 36,
                paddingRight: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.lineStrong,
                backgroundColor: palette.surface,
                fontSize: 13,
                fontFamily: weights.sansRegular,
                color: palette.ink,
              }}
            />
          </View>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={refreshing}
          leftIcon={<RefreshCw size={16} color={refreshing ? palette.ink4 : palette.ink2} strokeWidth={1.8} />}
          onPress={onRefresh}
        />
      </View>
    </View>
  );
}
