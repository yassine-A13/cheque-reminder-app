import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { useAppTheme } from '@/providers/ThemeProvider';
import { radii } from '@/constants/design';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  compact = false,
  style,
}: AppButtonProps) {
  const { colors } = useAppTheme();

  const variants = {
    primary: { backgroundColor: colors.primary, color: '#FFFFFF', borderColor: colors.primary },
    secondary: { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
    ghost: { backgroundColor: 'transparent', color: colors.primary, borderColor: 'transparent' },
    danger: {
      backgroundColor: colors.danger.background,
      color: colors.danger.text,
      borderColor: colors.danger.background,
    },
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.compact,
        {
          backgroundColor: variants[variant].backgroundColor,
          borderColor: variants[variant].borderColor,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: variants[variant].color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  compact: {
    minHeight: 44,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
