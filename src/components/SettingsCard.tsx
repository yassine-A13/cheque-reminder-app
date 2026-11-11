import { PropsWithChildren, ReactElement } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useAppTheme } from '@/providers/ThemeProvider';
import { radii, spacing } from '@/constants/design';

function SettingsAction({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.88}
      style={[styles.action, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
    >
      <ThemedText>{label}</ThemedText>
      <ThemedText type="caption" style={{ color: colors.primary }}>
        {value}
      </ThemedText>
    </TouchableOpacity>
  );
}

type SettingsCardComponent = ((props: PropsWithChildren<{ title: string; description: string }>) => ReactElement) & {
  Action: typeof SettingsAction;
};

function SettingsCardBase({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <ThemedText type="subtitle">{title}</ThemedText>
        <ThemedText>{description}</ThemedText>
      </View>
      {children}
    </View>
  );
}

export const SettingsCard = SettingsCardBase as typeof SettingsCardBase & {
  Action: typeof SettingsAction;
};

SettingsCard.Action = SettingsAction;

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  action: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
