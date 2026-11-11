import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/providers/ThemeProvider';
import { radii, spacing } from '@/constants/design';

type Accent = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

type StatCardProps = {
  label: string;
  value: string;
  accent: Accent;
  hint?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function StatCard({ label, value, accent, hint, style, onPress }: StatCardProps) {
  const { colors } = useAppTheme();
  const palette =
    accent === 'primary' ? { background: colors.primarySoft, text: colors.primary } : colors[accent];

  return (
    <Pressable disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? `${label} : ${value}${hint ? `. ${hint}` : ''}` : undefined} onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed && onPress ? 0.82 : 1 }, style]}>
      <View style={[styles.badge, { backgroundColor: palette.background }]}>
        <ThemedText type="caption" style={{ color: palette.text }}>
          {label}
        </ThemedText>
      </View>
      <ThemedText type="subtitle">{value}</ThemedText>
      {hint ? (
        <ThemedText type="caption" style={{ color: colors.textMuted }}>
          {hint}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
