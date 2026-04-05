import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ChequeImagePreview } from '@/components/cheques/ChequeImagePreview';
import { DetailRow } from '@/components/DetailRow';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/ThemedText';
import { Cheque } from '@/core/types/cheque';
import { deleteCheque, getChequeById } from '@/features/cheques/repository';
import { formatDisplayDate } from '@/utils/date';
import { formatAmount } from '@/utils/format';

export default function ChequeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cheque, setCheque] = useState<Cheque | null>(null);

  const loadCheque = useCallback(async () => {
    if (!id) {
      return;
    }

    const nextCheque = await getChequeById(Number(id));
    setCheque(nextCheque);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void loadCheque();
    }, [loadCheque]),
  );

  const handleDelete = () => {
    if (!id) {
      return;
    }

    Alert.alert('Supprimer le chèque', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteCheque(Number(id));
          router.replace('/(tabs)/cheques');
        },
      },
    ]);
  };

  if (!cheque) {
    return (
      <Screen centered>
        <ThemedText>Chèque introuvable.</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">{cheque.beneficiary}</ThemedText>
          <ThemedText>{cheque.chequeNumber}</ThemedText>
        </View>
        <StatusBadge status={cheque.status} />
      </View>

      <View style={styles.actions}>
        <AppButton label="Modifier" compact onPress={() => router.push(`/cheque/edit/${cheque.id}`)} />
        <AppButton variant="danger" compact label="Supprimer" onPress={handleDelete} />
      </View>

      <DetailRow label="Montant" value={formatAmount(cheque.amount)} />
      <DetailRow label="Banque" value={cheque.bank || 'Non renseignée'} />
      <DetailRow label="Date d'émission" value={formatDisplayDate(cheque.issueDate)} />
      <DetailRow label="Date d'échéance" value={formatDisplayDate(cheque.dueDate)} />
      <DetailRow label="Statut" value={cheque.status} />
      <DetailRow label="Note" value={cheque.note || 'Aucune note'} />
      <View style={styles.imageSection}>
        <ThemedText type="subtitle">Image du chèque</ThemedText>
        <ChequeImagePreview imagePath={cheque.imagePath} height={260} />
      </View>
      <DetailRow label="Créé le" value={formatDisplayDate(cheque.createdAt, true)} />
      <DetailRow label="Mis à jour le" value={formatDisplayDate(cheque.updatedAt, true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  imageSection: {
    gap: 10,
  },
});
