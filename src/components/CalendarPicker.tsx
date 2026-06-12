import { ThemedText } from '@/components/Typography';
import { useTheme } from '@/theme/ThemeProvider';
import { toISODate } from '@/utils/date';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  value: string;            // ISO YYYY-MM-DD
  onChange: (iso: string) => void;
  /** Latest date the user is allowed to pick. Defaults to today. */
  maxDate?: string;
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function CalendarPicker({ value, onChange, maxDate }: Props) {
  const { palette, weights } = useTheme();
  const today = toISODate(new Date());
  const max = maxDate ?? today;

  const valDate = parseISO(value);
  const [view, setView] = useState({ year: valDate.getFullYear(), month: valDate.getMonth() });

  const grid = useMemo(() => buildMonthGrid(view.year, view.month), [view.year, view.month]);

  const moveMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <View>
      {/* Month header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Pressable onPress={() => moveMonth(-1)} hitSlop={12} style={{ padding: 6 }}>
          <ChevronLeft size={20} color={palette.ink2} strokeWidth={1.8} />
        </Pressable>
        <ThemedText
          family="serif"
          style={{ fontSize: 18, fontFamily: weights.serifRegular }}
        >
          {view.year}년 {MONTH_NAMES[view.month]}
        </ThemedText>
        <Pressable onPress={() => moveMonth(1)} hitSlop={12} style={{ padding: 6 }}>
          <ChevronRight size={20} color={palette.ink2} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Day-of-week row */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {DAY_LABELS.map((d, i) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
            <ThemedText
              variant="tiny"
              family="mono"
              uppercase
              color={i === 0 ? palette.warn : i === 6 ? palette.drop : palette.ink3}
              style={{ letterSpacing: 0.6 }}
            >
              {d}
            </ThemedText>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View>
        {chunk(grid, 7).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={ci} style={{ flex: 1, aspectRatio: 1 }} />;
              const iso = toISODate(cell);
              const isSelected = iso === value;
              const isToday = iso === today;
              const isFuture = iso > max;
              const dow = cell.getDay();
              const dimColor = isFuture ? palette.ink4 : dow === 0 ? palette.warn : dow === 6 ? palette.drop : palette.ink;

              return (
                <Pressable
                  key={ci}
                  onPress={() => !isFuture && onChange(iso)}
                  disabled={isFuture}
                  style={{
                    flex: 1, aspectRatio: 1,
                    alignItems: 'center', justifyContent: 'center',
                    padding: 2,
                    opacity: isFuture ? 0.35 : 1,
                  }}
                >
                  <View
                    style={{
                      width: '88%',
                      height: '88%',
                      borderRadius: 999,
                      backgroundColor: isSelected ? palette.green : 'transparent',
                      borderWidth: isToday && !isSelected ? 1 : 0,
                      borderColor: palette.green,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <ThemedText
                      variant="meta"
                      weight={isSelected ? 'semibold' : isToday ? 'medium' : 'regular'}
                      color={isSelected ? palette.bg : dimColor}
                      style={{ fontSize: 14 }}
                    >
                      {cell.getDate()}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── helpers ────────────────────────────────────────
function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
