import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ChequeCard } from '@/components/ChequeCard';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { Screen } from '@/components/Screen';
import { SearchBar } from '@/components/SearchBar';
import { ThemedText } from '@/components/ThemedText';
import { Cheque, ChequeFilterStatus, ChequeSortField, SortDirection } from '@/core/types/cheque';
import { listCheques } from '@/features/cheques/repository';
import { useAppTheme } from '@/providers/ThemeProvider';
import { useExportFilters } from '@/features/export/ExportFilterContext';

const statuses: ChequeFilterStatus[] = ['Tous', 'En cours', 'Encaissé', 'Annulé', 'Expiré'];
const sortOptions: Array<{ label: string; value: ChequeSortField }> = [
  { label: "Date d'échéance", value: 'dueDate' },
  { label: "Date d'émission", value: 'issueDate' },
  { label: 'Montant', value: 'amount' },
];

export default function ChequesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string; dueSoon?: string; actionOnly?: string }>();
  const { colors } = useAppTheme();
  const { setFilters } = useExportFilters();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ChequeFilterStatus>('Tous');
  const [sortBy, setSortBy] = useState<ChequeSortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'filter' | 'sort' | null>(null);
  const dueSoonOnly = params.dueSoon === '1';
  const actionOnly = params.actionOnly === '1';

  useEffect(() => {
    const requested = statuses.find((item) => item === params.status);
    setStatus(requested ?? 'Tous');
  }, [params.status]);

  const chooseStatus = (nextStatus: ChequeFilterStatus) => {
    setStatus(nextStatus);
    if (dueSoonOnly || actionOnly) router.setParams({ dueSoon: '', actionOnly: '' });
  };

  useEffect(() => setFilters({ search, status }), [search, setFilters, status]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCheques({ search, status: dueSoonOnly ? 'En cours' : status, sortBy, sortDirection });
      const now = Date.now();
      const filteredRows = dueSoonOnly
        ? rows.filter((cheque) => { const due = new Date(cheque.dueDate).getTime(); return cheque.status === 'En cours' && due >= now && due <= now + 48 * 60 * 60 * 1000; })
        : actionOnly
          ? rows.filter((cheque) => cheque.status === 'Expiré' || (cheque.status === 'En cours' && new Date(cheque.dueDate).getTime() >= now && new Date(cheque.dueDate).getTime() <= now + 48 * 60 * 60 * 1000))
          : rows;
      setCheques(filteredRows);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Impossible de charger les chèques.');
    } finally {
      setLoading(false);
    }
  }, [actionOnly, dueSoonOnly, search, sortBy, sortDirection, status]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const content = useMemo(() => {
    if (loading) return <ActivityIndicator size="large" color={colors.primary} />;
    if (loadError) return <EmptyState title="Chargement impossible" description={loadError} actionLabel="Réessayer" onAction={() => void loadData()} />;
    if (!cheques.length) return <EmptyState title="Aucun résultat" description="Aucun chèque ne correspond à votre recherche ou à vos filtres." actionLabel="Créer un chèque" onAction={() => router.push('/cheque/new')} />;
    return <View style={styles.list}>{cheques.map((cheque) => <ChequeCard key={cheque.id} cheque={cheque} onPress={() => router.push(`/cheque/${cheque.id}`)} />)}</View>;
  }, [cheques, colors.primary, loadData, loadError, loading, router]);

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="title">Chèques</ThemedText>
          <ThemedText type="caption">{loading ? 'Chargement…' : `${cheques.length} chèque${cheques.length === 1 ? '' : 's'} affiché${cheques.length === 1 ? '' : 's'}`}</ThemedText>
        </View>
        <AppButton label="Analyse" variant="secondary" compact onPress={() => router.push('/analysis')} />
        <AppButton label="Ajouter" compact onPress={() => router.push('/cheque/new')} />
      </View>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Bénéficiaire ou numéro" onSubmit={loadData} />
      <View style={styles.toolbar}>
        <AppButton label={`Filtrer${status !== 'Tous' ? ` · ${status}` : dueSoonOnly ? ' · Sous 48 h' : actionOnly ? ' · À traiter' : ''}`} variant="secondary" compact style={styles.toolbarButton} onPress={() => setPanel('filter')} />
        <AppButton label={`Trier · ${sortOptions.find((item) => item.value === sortBy)?.label}`} variant="secondary" compact style={styles.toolbarButton} onPress={() => setPanel('sort')} />
        <Pressable accessibilityLabel="Changer le sens du tri" onPress={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')} style={[styles.directionButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size={18} color={colors.primary} />
        </Pressable>
      </View>
      {content}
      <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPanel(null)}>
          <Pressable onPress={() => undefined} style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="subtitle">{panel === 'filter' ? 'Filtrer les chèques' : 'Trier par'}</ThemedText>
              <Pressable accessibilityLabel="Fermer" onPress={() => setPanel(null)}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
            </View>
            {panel === 'filter' ? <View style={styles.options}>{statuses.map((item) => <FilterChip key={item} label={item} active={status === item} onPress={() => { chooseStatus(item); setPanel(null); }} />)}</View> : <View style={styles.optionList}>{sortOptions.map((item) => <Pressable key={item.value} onPress={() => { setSortBy(item.value); setPanel(null); }} style={[styles.optionRow, { borderBottomColor: colors.border }]}><ThemedText style={{ color: sortBy === item.value ? colors.primary : colors.text }}>{item.label}</ThemedText>{sortBy === item.value && <Ionicons name="checkmark" size={20} color={colors.primary} />}</Pressable>)}</View>}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, gap: 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarButton: { flex: 1, paddingHorizontal: 8 },
  directionButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.48)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, padding: 20, paddingBottom: 34, gap: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionList: { gap: 0 },
  optionRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
