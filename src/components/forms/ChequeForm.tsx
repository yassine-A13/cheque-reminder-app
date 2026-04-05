import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { ChequeImageField } from '@/components/cheques/ChequeImageField';
import { FilterChip } from '@/components/FilterChip';
import { ThemedText } from '@/components/ThemedText';
import { ChequeInput, ChequeStatus } from '@/core/types/cheque';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatDisplayDate } from '@/utils/date';

const statusOptions: ChequeStatus[] = ['En cours', 'Encaissé', 'Annulé', 'Expiré'];

type ChequeFormProps = {
  initialValues?: Partial<ChequeInput>;
  submitLabel: string;
  onSubmit: (values: ChequeInput) => Promise<void>;
};

type DateField = 'issueDate' | 'dueDate' | null;

function toIsoDate(input?: string) {
  return input ? new Date(input).toISOString() : new Date().toISOString();
}

export function ChequeForm({ initialValues, submitLabel, onSubmit }: ChequeFormProps) {
  const { colors } = useAppTheme();
  const [form, setForm] = useState<ChequeInput>({
    beneficiary: initialValues?.beneficiary ?? '',
    amount: initialValues?.amount ?? 0,
    chequeNumber: initialValues?.chequeNumber ?? '',
    bank: initialValues?.bank ?? '',
    issueDate: toIsoDate(initialValues?.issueDate),
    dueDate: toIsoDate(initialValues?.dueDate),
    status: initialValues?.status ?? 'En cours',
    note: initialValues?.note ?? '',
    imagePath: initialValues?.imagePath ?? null,
  });
  const [showPicker, setShowPicker] = useState<DateField>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => form.beneficiary.trim().length > 1 && form.chequeNumber.trim().length > 0 && Number(form.amount) > 0,
    [form.amount, form.beneficiary, form.chequeNumber],
  );

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }

    if (event.type === 'dismissed' || !date || !showPicker) {
      return;
    }

    setForm((current) => ({
      ...current,
      [showPicker]: date.toISOString(),
    }));
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit({
        ...form,
        beneficiary: form.beneficiary.trim(),
        chequeNumber: form.chequeNumber.trim(),
        bank: form.bank?.trim() || null,
        note: form.note?.trim() || null,
        amount: Number(form.amount),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppInput
        label="Bénéficiaire"
        value={form.beneficiary}
        onChangeText={(beneficiary) => setForm((current) => ({ ...current, beneficiary }))}
        placeholder="Nom du bénéficiaire"
      />
      <AppInput
        label="Montant"
        value={String(form.amount || '')}
        onChangeText={(amount) =>
          setForm((current) => ({
            ...current,
            amount: Number(amount.replace(',', '.')) || 0,
          }))
        }
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <AppInput
        label="Numéro du chèque"
        value={form.chequeNumber}
        onChangeText={(chequeNumber) => setForm((current) => ({ ...current, chequeNumber }))}
        placeholder="Référence du chèque"
      />
      <AppInput
        label="Banque"
        value={form.bank ?? ''}
        onChangeText={(bank) => setForm((current) => ({ ...current, bank }))}
        placeholder="Optionnel"
      />

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>
            Date d'émission
          </ThemedText>
          <Pressable
            style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowPicker('issueDate')}
          >
            <ThemedText>{formatDisplayDate(form.issueDate)}</ThemedText>
          </Pressable>
        </View>
        <View style={styles.dateField}>
          <ThemedText type="caption" style={{ color: colors.textMuted }}>
            Date d'échéance
          </ThemedText>
          <Pressable
            style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowPicker('dueDate')}
          >
            <ThemedText>{formatDisplayDate(form.dueDate)}</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.statusSection}>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>
          Statut
        </ThemedText>
        <View style={styles.statusList}>
          {statusOptions.map((status) => (
            <FilterChip
              key={status}
              label={status}
              active={form.status === status}
              onPress={() => setForm((current) => ({ ...current, status }))}
            />
          ))}
        </View>
      </View>

      <AppInput
        label="Note"
        value={form.note ?? ''}
        onChangeText={(note) => setForm((current) => ({ ...current, note }))}
        placeholder="Commentaire interne"
        multiline
        style={styles.multiline}
      />

      <ChequeImageField
        value={form.imagePath}
        originalValue={initialValues?.imagePath ?? null}
        onChange={(imagePath) => setForm((current) => ({ ...current, imagePath }))}
      />

      {showPicker ? (
        <DateTimePicker
          mode="date"
          display="default"
          value={new Date(form[showPicker])}
          onChange={handleDateChange}
        />
      ) : null}

      <AppButton
        label={submitting ? 'Enregistrement...' : submitLabel}
        onPress={handleSubmit}
        style={!canSubmit ? styles.disabledButton : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    marginTop: 16,
    paddingBottom: 30,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 8,
  },
  dateButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  statusSection: {
    gap: 10,
  },
  statusList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  multiline: {
    minHeight: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  disabledButton: {
    opacity: 0.65,
  },
});
