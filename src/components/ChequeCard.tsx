import { Pressable, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/ThemedText';
import { Cheque } from '@/core/types/cheque';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatDisplayDate } from '@/utils/date';
import { formatAmount } from '@/utils/format';
import { radii, spacing } from '@/constants/design';

type ChequeCardProps = {
  cheque: Cheque;
  onPress: () => void;
};

export function ChequeCard({ cheque, onPress }: ChequeCardProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cheque.beneficiary}, ${formatAmount(cheque.amount)}, échéance ${formatDisplayDate(cheque.dueDate)}, statut ${cheque.status}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <ThemedText style={styles.beneficiary}>{cheque.beneficiary}</ThemedText>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>
            Chèque n° {cheque.chequeNumber}
          </ThemedText>
        </View>
        <StatusBadge status={cheque.status} />
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.amount}>{formatAmount(cheque.amount)}</ThemedText>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>Échéance · {formatDisplayDate(cheque.dueDate)}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  beneficiary: { fontSize: 15, fontWeight: '600' },
  amount: { fontSize: 14, fontWeight: '700' },
});
