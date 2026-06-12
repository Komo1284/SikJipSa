import { BottomSheet } from '@/components/BottomSheet';
import { Tap } from '@/components/Tap';
import { ThemedText } from '@/components/Typography';
import { SHEET_CLOSE_DELAY } from '@/theme/animation';
import { useTheme } from '@/theme/ThemeProvider';
import React from 'react';
import { View } from 'react-native';

export type ActionItem = {
  key: string;
  label: string;
  /** Optional secondary line below the label. */
  sub?: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionItem[];
};

export function ActionSheet({ visible, onClose, title, actions }: Props) {
  const { palette, radii } = useTheme();

  const handle = (a: ActionItem) => {
    onClose();
    // Defer so the sheet closes cleanly before any further navigation.
    setTimeout(() => a.onPress(), SHEET_CLOSE_DELAY);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={0.7}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 }}>
        {title ? (
          <ThemedText
            variant="tiny" family="mono" uppercase color={palette.ink3}
            style={{ letterSpacing: 1, paddingVertical: 8, textAlign: 'center' }}
          >
            {title}
          </ThemedText>
        ) : null}

        <View
          style={{
            backgroundColor: palette.surfaceRaised,
            borderRadius: radii.md,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: palette.line,
          }}
        >
          {actions.map((a, i) => (
            <Tap
              key={a.key}
              onPress={() => handle(a)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: palette.line,
              }}
            >
              {a.icon ? (
                <View style={{ width: 24, alignItems: 'center' }}>{a.icon}</View>
              ) : null}
              <View style={{ flex: 1 }}>
                <ThemedText
                  variant="body"
                  weight="medium"
                  color={a.destructive ? palette.warn : palette.ink}
                  style={{ fontSize: 15 }}
                >
                  {a.label}
                </ThemedText>
                {a.sub ? (
                  <ThemedText variant="tiny" color={palette.ink3} style={{ marginTop: 2 }}>
                    {a.sub}
                  </ThemedText>
                ) : null}
              </View>
            </Tap>
          ))}
        </View>

        <Tap
          onPress={onClose}
          style={{
            marginTop: 10,
            paddingVertical: 16,
            borderRadius: radii.md,
            backgroundColor: palette.surfaceRaised,
            borderWidth: 1,
            borderColor: palette.line,
            alignItems: 'center',
          }}
        >
          <ThemedText variant="body" weight="medium" color={palette.ink2}>
            취소
          </ThemedText>
        </Tap>
      </View>
    </BottomSheet>
  );
}
