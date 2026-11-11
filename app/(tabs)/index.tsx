import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ChequeCard } from '@/components/ChequeCard';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { ThemedText } from '@/components/ThemedText';
import { Cheque, DashboardStats } from '@/core/types/cheque';
import { getDashboardStats, listCheques } from '@/features/cheques/repository';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatAmount } from '@/utils/format';

const within48Hours = (cheque: Cheque, now: number) => {
  const due = new Date(cheque.dueDate).getTime();
  return cheque.status === 'En cours' && due >= now && due <= now + 48 * 60 * 60 * 1000;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nextStats, rows] = await Promise.all([
        getDashboardStats(),
        listCheques({ sortBy: 'dueDate', sortDirection: 'asc' }),
      ]);
      setStats(nextStats);
      setCheques(rows);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const amounts = useMemo(() => cheques.reduce((result, cheque) => {
    if (cheque.status === 'En cours') result.pending += cheque.amount;
    if (cheque.status === 'Encaissé') result.cashed += cheque.amount;
    return result;
  }, { pending: 0, cashed: 0 }), [cheques]);
  const dueSoon = useMemo(() => cheques.filter((cheque) => within48Hours(cheque, Date.now())), [cheques]);
  const actionable = useMemo(() => cheques.filter((cheque) => cheque.status === 'Expiré' || within48Hours(cheque, Date.now())).slice(0, 5), [cheques]);

  if (loadError && !loading) return <Screen scrollable><EmptyState title="Chargement impossible" description={loadError} actionLabel="Réessayer" onAction={() => void loadData()} /></Screen>;
  if (loading || !stats) return <Screen centered><ActivityIndicator size="large" color={colors.primary} /></Screen>;

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={[styles.brandMark, { backgroundColor: colors.primarySoft }]}><Ionicons name="receipt-outline" size={21} color={colors.primary} /></View>
        <View style={styles.headingCopy}><ThemedText type="title">Cheque Reminder</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Vos échéances, en toute clarté.</ThemedText></View>
      </View>
      <AppButton label="＋  Nouveau chèque" compact onPress={() => router.push('/cheque/new')} />

      <View style={[styles.financeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.financeHeading}><View><ThemedText type="caption" style={{ color: colors.textMuted }}>PORTFOLIO</ThemedText><ThemedText type="subtitle">Vue financière</ThemedText></View><Ionicons name="wallet-outline" size={21} color={colors.primary} /></View>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>Montant total des chèques</ThemedText>
        <ThemedText style={[styles.totalAmount, { color: colors.text }]}>{stats.totalAmountFormatted}</ThemedText>
        <View style={[styles.financeDivider, { backgroundColor: colors.border }]} />
        <View style={styles.financeSplit}><View style={styles.financeMetric}><ThemedText type="caption" style={{ color: colors.textMuted }}>En cours</ThemedText><ThemedText style={[styles.financeValue, { color: colors.primary }]}>{formatAmount(amounts.pending)}</ThemedText></View><View style={styles.financeMetric}><ThemedText type="caption" style={{ color: colors.textMuted }}>Encaissé</ThemedText><ThemedText style={styles.financeValue}>{formatAmount(amounts.cashed)}</ThemedText></View></View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/analysis')} style={[styles.analysisLink, { backgroundColor: colors.primarySoft }]}><ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Ouvrir l’analyse financière</ThemedText><Ionicons name="arrow-forward" size={17} color={colors.primary} /></Pressable>
      </View>

      <View style={styles.sectionHeading}><ThemedText type="subtitle">En un coup d’œil</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>{stats.totalCheques} au total</ThemedText></View>
      <View style={styles.statsGrid}>
        <StatCard label="En cours" value={`${stats.activeCheques}`} accent="primary" hint="À encaisser" onPress={() => router.push('/(tabs)/cheques?status=En%20cours')} style={styles.statCard} />
        <StatCard label="Encaissés" value={`${cheques.filter((cheque) => cheque.status === 'Encaissé').length}`} accent="success" hint="Traités" onPress={() => router.push('/(tabs)/cheques?status=Encaissé')} style={styles.statCard} />
        <StatCard label="Expirés" value={`${stats.expiredCheques}`} accent="danger" hint="À vérifier" onPress={() => router.push('/(tabs)/cheques?status=Expiré')} style={styles.statCard} />
        <StatCard label="Sous 48 h" value={`${dueSoon.length}`} accent="warning" hint="Échéance proche" onPress={() => router.push('/(tabs)/cheques?dueSoon=1')} style={styles.statCard} />
      </View>

      <View style={styles.sectionHeading}><View><ThemedText type="subtitle">À traiter</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Échéances proches et chèques expirés</ThemedText></View><Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/cheques?actionOnly=1')}><ThemedText type="caption" style={{ color: colors.primary }}>Tout voir</ThemedText></Pressable></View>
      {actionable.length ? <View style={styles.chequeList}>{actionable.map((cheque) => <ChequeCard key={cheque.id} cheque={cheque} onPress={() => router.push(`/cheque/${cheque.id}`)} />)}</View> : <EmptyState title="Rien à traiter" description="Aucune échéance proche ni chèque expiré pour le moment." />}
      <Pressable accessibilityRole="button" onPress={() => router.push('/analysis')} style={[styles.analysisBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={[styles.analysisIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="analytics-outline" size={20} color={colors.primary} /></View><View style={styles.analysisCopy}><ThemedText style={{ fontWeight: '600' }}>Analyses financières</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Tendances mensuelles, filtres et exports</ThemedText></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({ container: { gap: 14, paddingBottom: 22 }, header: { flexDirection: 'row', alignItems: 'center', gap: 11 }, brandMark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, headingCopy: { flex: 1, gap: 1 }, financeCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 8 }, financeHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }, totalAmount: { fontSize: 27, fontWeight: '800' }, financeDivider: { height: StyleSheet.hairlineWidth, marginVertical: 3 }, financeSplit: { flexDirection: 'row', gap: 22 }, financeMetric: { flex: 1, gap: 3 }, financeValue: { fontSize: 15, fontWeight: '700' }, analysisLink: { minHeight: 40, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 2 }, statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, statCard: { flex: 1, minWidth: 145, width: undefined }, chequeList: { gap: 7 }, analysisBanner: { minHeight: 66, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, analysisIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, analysisCopy: { flex: 1, gap: 3 } });
