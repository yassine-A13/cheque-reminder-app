import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ChequeCard } from '@/components/ChequeCard';
import { FilterChip } from '@/components/FilterChip';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { Cheque, ChequeStatus } from '@/core/types/cheque';
import { AnalysisFilters, AnalysisPeriod, calculateAnalysis, calculateMonthlyAnalysis, groupAnalysisByBeneficiary } from '@/features/cheques/financial-analysis';
import { listChequesSnapshot } from '@/features/cheques/repository';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatAmount } from '@/utils/format';

const periods: AnalysisPeriod[] = ['Tous', 'Aujourd’hui', 'Cette semaine', 'Ce mois', 'Mois précédent', 'Ce trimestre', 'Cette année', 'Personnalisée'];
const statuses: Array<'Tous' | ChequeStatus> = ['Tous', 'En cours', 'Encaissé', 'Expiré', 'Annulé'];
const defaultFilters = (): AnalysisFilters => ({ beneficiary: 'Tous', status: 'Tous', period: 'Tous', dateField: 'dueDate', startDate: new Date(), endDate: new Date() });
const sortOptions = [
  { label: 'Total ↓', value: 'total-desc' }, { label: 'Total ↑', value: 'total-asc' },
  { label: 'Encaissé', value: 'cashed' }, { label: 'En cours', value: 'pending' }, { label: 'Nombre', value: 'count' },
] as const;
const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
type MonthlyMetric = 'total' | 'cashed' | 'pending';
const dateLabel = (date: Date | null) => date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date) : 'Choisir une date';
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

export default function AnalysisScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalysisFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<AnalysisFilters>(defaultFilters);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [dateTarget, setDateTarget] = useState<'startDate' | 'endDate' | null>(null);
  const [beneficiaryPickerQuery, setBeneficiaryPickerQuery] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]['value']>('total-desc');
  const [expandedStatus, setExpandedStatus] = useState<ChequeStatus | null>(null);
  const [beneficiaryDetail, setBeneficiaryDetail] = useState<string | null>(null);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [monthlyMetric, setMonthlyMetric] = useState<MonthlyMetric>('total');
  const [monthlyDetailsVisible, setMonthlyDetailsVisible] = useState(false);

  const loadCheques = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try { setCheques(await listChequesSnapshot()); }
    catch (error) { setLoadError(error instanceof Error ? error.message : 'Impossible de charger les chèques.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void listChequesSnapshot().then((rows) => { if (active) { setCheques(rows); setLoadError(null); } })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Impossible de charger les chèques.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const beneficiaries = useMemo(() => ['Tous', ...Array.from(new Set(cheques.map((cheque) => cheque.beneficiary))).sort((a, b) => a.localeCompare(b, 'fr'))], [cheques]);
  const result = useMemo(() => calculateAnalysis(cheques, filters), [cheques, filters]);
  const beneficiaryRows = useMemo(() => groupAnalysisByBeneficiary(result.cheques)
    .filter((row) => row.beneficiary.toLocaleLowerCase('fr').includes(beneficiarySearch.trim().toLocaleLowerCase('fr')))
    .sort((a, b) => sortBy === 'total-desc' ? b.total - a.total : sortBy === 'total-asc' ? a.total - b.total : sortBy === 'cashed' ? b.cashed - a.cashed : sortBy === 'pending' ? b.pending - a.pending : b.count - a.count),
  [beneficiarySearch, result.cheques, sortBy]);
  const monthlyRows = useMemo(() => calculateMonthlyAnalysis(cheques, filters, monthlyYear), [cheques, filters.beneficiary, filters.dateField, filters.status, monthlyYear]);
  const selectedMonthData = monthlyRows[selectedMonth];
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    for (const cheque of cheques) { const date = new Date(cheque[filters.dateField]); if (!Number.isNaN(date.getTime())) years.add(date.getFullYear()); }
    return Array.from(years).sort((a, b) => b - a);
  }, [cheques, filters.dateField]);
  const maxMonthlyAmount = Math.max(1, ...monthlyRows.map((row) => row[monthlyMetric]));
  const activeFilterCount = Number(filters.beneficiary !== 'Tous') + Number(filters.status !== 'Tous') + Number(filters.period !== 'Tous') + Number(filters.dateField !== 'dueDate');
  const filterSummary = [filters.beneficiary !== 'Tous' ? filters.beneficiary : null, filters.status !== 'Tous' ? filters.status : null,
    filters.period !== 'Tous' ? filters.period : null, filters.dateField === 'issueDate' ? 'Émission' : null].filter(Boolean).join(' · ') || 'Aucun filtre actif';
  const setDraft = <K extends keyof AnalysisFilters>(key: K, value: AnalysisFilters[K]) => setDraftFilters((current) => ({ ...current, [key]: value }));
  const openFilters = () => { setDraftFilters({ ...filters }); setFiltersVisible(true); };
  const resetFilters = () => setDraftFilters(defaultFilters());
  const applyFilters = () => { setFilters({ ...draftFilters }); setFiltersVisible(false); setExpandedStatus(null); setBeneficiaryDetail(null); };
  const filteredBeneficiaries = beneficiaries.filter((name) => name.toLocaleLowerCase('fr').includes(beneficiaryPickerQuery.trim().toLocaleLowerCase('fr')));
  const beneficiaryCheques = beneficiaryDetail ? result.cheques.filter((cheque) => cheque.beneficiary === beneficiaryDetail) : [];
  const beneficiaryDetailStats = beneficiaryDetail ? groupAnalysisByBeneficiary(beneficiaryCheques)[0] : null;

  const statusLine = (status: ChequeStatus, count: number, amount: number, tone: string) => {
    const open = expandedStatus === status;
    const matching = result.cheques.filter((cheque) => cheque.status === status);
    return <View key={status}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => { animate(); setExpandedStatus(open ? null : status); }} style={[styles.statusRow, { borderBottomColor: colors.border }]}>
        <View style={[styles.statusDot, { backgroundColor: tone }]} /><ThemedText style={styles.statusName}>{status}</ThemedText>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>{count}</ThemedText><ThemedText style={styles.statusAmount}>{formatAmount(amount)}</ThemedText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </Pressable>
      {open && <View style={styles.inlineCheques}>{matching.length ? matching.map((cheque) => <ChequeCard key={cheque.id} cheque={cheque} onPress={() => router.push(`/cheque/${cheque.id}`)} />) : <ThemedText type="caption" style={{ color: colors.textMuted }}>Aucun chèque pour ce statut.</ThemedText>}</View>}
    </View>;
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerText}><ThemedText type="title">Analyse financière</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Votre portefeuille, en un coup d’œil</ThemedText></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name="arrow-back" size={19} color={colors.text} /></Pressable>
      </View>
      {loading && <ThemedText type="caption" style={{ color: colors.textMuted }}>Chargement des chèques…</ThemedText>}
      {loadError && <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.danger.text }]}><ThemedText style={{ color: colors.danger.text }}>Le chargement a échoué : {loadError}</ThemedText><AppButton label="Réessayer" variant="secondary" compact onPress={() => void loadCheques()} /></View>}

      <Pressable accessibilityRole="button" onPress={openFilters} style={[styles.filterSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.filterIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="options-outline" size={18} color={colors.primary} /></View>
        <View style={styles.filterCopy}><ThemedText style={styles.filterTitle}>Filtres</ThemedText><ThemedText type="caption" numberOfLines={1} style={{ color: colors.textMuted }}>{filterSummary}</ThemedText></View>
        <View style={[styles.countBadge, { backgroundColor: colors.primarySoft }]}><ThemedText style={[styles.countBadgeText, { color: colors.primary }]}>{activeFilterCount}</ThemedText></View>
        <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
      </Pressable>

      <View style={[styles.summaryCard, { backgroundColor: colors.primarySoft, borderColor: colors.primary + '55' }]}>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>Montant total</ThemedText>
        <ThemedText style={[styles.totalAmount, { color: colors.primary }]}>{formatAmount(result.totals.total)}</ThemedText>
        <ThemedText type="caption" style={{ color: colors.textMuted }}>{result.totals.count} chèque{result.totals.count === 1 ? '' : 's'} correspondant{result.totals.count === 1 ? '' : 's'}</ThemedText>
      </View>
      <View style={styles.metricsRow}>
        {[
          ['Encaissé', result.totals.cashed, colors.success.text],
          ['En cours', result.totals.pending, colors.primary],
          ['À régulariser', result.totals.expired, colors.warning.text],
        ].map(([label, amount, tone]) => <View key={String(label)} style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.metricDot, { backgroundColor: String(tone) }]} /><ThemedText type="caption" style={{ color: colors.textMuted }}>{String(label)}</ThemedText>
          <ThemedText style={styles.metricAmount}>{formatAmount(Number(amount))}</ThemedText>
        </View>)}
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}><ThemedText type="subtitle">Par statut</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Touchez une ligne</ThemedText></View>
        {statusLine('En cours', result.totals.pendingCount, result.totals.pending, colors.primary)}
        {statusLine('Encaissé', result.totals.cashedCount, result.totals.cashed, colors.success.text)}
        {statusLine('Expiré', result.totals.expiredCount, result.totals.expired, colors.warning.text)}
        {statusLine('Annulé', result.totals.cancelledCount, result.totals.cancelled, colors.danger.text)}
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}><View><ThemedText type="subtitle">Par mois</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Date par {filters.dateField === 'issueDate' ? 'émission' : 'échéance'}</ThemedText></View>
          <View style={styles.yearControls}><Pressable accessibilityLabel="Année précédente" onPress={() => { const index = availableYears.indexOf(monthlyYear); if (index < availableYears.length - 1) setMonthlyYear(availableYears[index + 1]); }}><Ionicons name="chevron-back" size={18} color={colors.primary} /></Pressable><ThemedText style={styles.yearLabel}>{monthlyYear}</ThemedText><Pressable accessibilityLabel="Année suivante" onPress={() => { const index = availableYears.indexOf(monthlyYear); if (index > 0) setMonthlyYear(availableYears[index - 1]); }}><Ionicons name="chevron-forward" size={18} color={colors.primary} /></Pressable></View>
        </View>
        <View style={styles.metricChips}>{([['total', 'Émis'], ['cashed', 'Encaissé'], ['pending', 'En cours']] as const).map(([key, label]) => <FilterChip key={key} label={label} active={monthlyMetric === key} onPress={() => setMonthlyMetric(key)} />)}</View>
        <View style={styles.chart}>
          {monthlyRows.map((row) => <Pressable key={row.month} accessibilityRole="button" accessibilityLabel={`${monthLabels[row.month]} ${formatAmount(row[monthlyMetric])}`} onPress={() => { animate(); setSelectedMonth(row.month); }} style={styles.chartMonth}>
            <View style={[styles.chartTrack, { backgroundColor: colors.card }]}><View style={[styles.chartBar, { height: Math.max(row[monthlyMetric] ? 4 : 0, row[monthlyMetric] / maxMonthlyAmount * 76), backgroundColor: selectedMonth === row.month ? colors.primary : colors.primary + '88' }]} /></View>
            <ThemedText type="caption" style={{ color: selectedMonth === row.month ? colors.primary : colors.textMuted, fontWeight: selectedMonth === row.month ? '700' : '400' }}>{monthLabels[row.month]}</ThemedText>
          </Pressable>)}
        </View>
        <View style={[styles.selectedMonth, { backgroundColor: colors.card }]}>
          <View><ThemedText style={styles.monthTitle}>{monthLabels[selectedMonth]} {monthlyYear}</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>{selectedMonthData.count} chèque{selectedMonthData.count === 1 ? '' : 's'}</ThemedText></View>
          <ThemedText style={[styles.monthAmount, { color: colors.primary }]}>{formatAmount(selectedMonthData[monthlyMetric])}</ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: monthlyDetailsVisible }} onPress={() => { animate(); setMonthlyDetailsVisible((value) => !value); }} style={styles.detailsButton}>
          <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>{monthlyDetailsVisible ? 'Masquer les détails' : 'Voir les détails'}</ThemedText><Ionicons name={monthlyDetailsVisible ? 'chevron-up' : 'chevron-down'} size={17} color={colors.primary} />
        </Pressable>
        {monthlyDetailsVisible && <View style={[styles.monthDetails, { borderTopColor: colors.border }]}>{([['Montant émis', selectedMonthData.total], ['Encaissé', selectedMonthData.cashed], ['En cours', selectedMonthData.pending], ['Expiré', selectedMonthData.expired], ['Annulé', selectedMonthData.cancelled]] as const).map(([label, amount]) => <View key={label} style={styles.detailRow}><ThemedText type="caption" style={{ color: colors.textMuted }}>{label}</ThemedText><ThemedText style={styles.detailAmount}>{formatAmount(amount)}</ThemedText></View>)}</View>}
      </View>

      <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}><View><ThemedText type="subtitle">Par bénéficiaire</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>{beneficiaryRows.length} résultat{beneficiaryRows.length === 1 ? '' : 's'}</ThemedText></View></View>
        <TextInput value={beneficiarySearch} onChangeText={setBeneficiarySearch} placeholder="Rechercher un bénéficiaire" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortOptions}>{sortOptions.map((option) => <FilterChip key={option.value} label={option.label} active={sortBy === option.value} onPress={() => setSortBy(option.value)} />)}</ScrollView>
        {beneficiaryRows.length === 0 ? <ThemedText type="caption" style={{ color: colors.textMuted }}>Aucun bénéficiaire pour ces filtres.</ThemedText> : beneficiaryRows.map((row, index) => <View key={row.beneficiary} style={[styles.beneficiaryRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.rank, { backgroundColor: colors.card }]}><ThemedText type="caption" style={{ color: colors.textMuted }}>{index + 1}</ThemedText></View>
          <View style={styles.beneficiaryCopy}><ThemedText numberOfLines={1} style={styles.beneficiaryName}>{row.beneficiary}</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>{row.count} chèque{row.count === 1 ? '' : 's'}</ThemedText></View>
          <View style={styles.beneficiaryTotal}><ThemedText style={styles.detailAmount}>{formatAmount(row.total)}</ThemedText><Pressable accessibilityRole="button" onPress={() => setBeneficiaryDetail(row.beneficiary)} hitSlop={8}><ThemedText type="caption" style={{ color: colors.primary }}>Détails</ThemedText></Pressable></View>
        </View>)}
      </View>

      <Modal visible={filtersVisible} transparent animationType="slide" onRequestClose={() => setFiltersVisible(false)}>
        <View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersVisible(false)} accessibilityLabel="Fermer les filtres" />
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}><View><ThemedText type="subtitle">Filtres</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Affinez votre analyse</ThemedText></View><Pressable accessibilityLabel="Fermer" onPress={() => setFiltersVisible(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={colors.text} /></Pressable></View>
            <ScrollView style={styles.filterScroll} contentContainerStyle={styles.filterFields} keyboardShouldPersistTaps="handled">
              <ThemedText type="caption" style={styles.fieldLabel}>Bénéficiaire</ThemedText>
              <TextInput value={beneficiaryPickerQuery} onChangeText={setBeneficiaryPickerQuery} placeholder="Rechercher" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
              <View style={styles.beneficiaryChoices}>{filteredBeneficiaries.map((name) => <Pressable key={name} accessibilityRole="button" onPress={() => setDraft('beneficiary', name)} style={[styles.choice, { backgroundColor: draftFilters.beneficiary === name ? colors.primarySoft : colors.surface, borderColor: draftFilters.beneficiary === name ? colors.primary : colors.border }]}><ThemedText numberOfLines={1} style={{ color: draftFilters.beneficiary === name ? colors.primary : colors.text }}>{name}</ThemedText>{draftFilters.beneficiary === name && <Ionicons name="checkmark" size={17} color={colors.primary} />}</Pressable>)}</View>
              <ThemedText type="caption" style={styles.fieldLabel}>Statut</ThemedText><View style={styles.chips}>{statuses.map((status) => <FilterChip key={status} label={status} active={draftFilters.status === status} onPress={() => setDraft('status', status)} />)}</View>
              <ThemedText type="caption" style={styles.fieldLabel}>Période</ThemedText><View style={styles.chips}>{periods.map((period) => <FilterChip key={period} label={period} active={draftFilters.period === period} onPress={() => setDraft('period', period)} />)}</View>
              {draftFilters.period === 'Personnalisée' && <View style={styles.dates}>{(['startDate', 'endDate'] as const).map((key) => <Pressable key={key} onPress={() => setDateTarget(key)} style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}><ThemedText type="caption" style={{ color: colors.textMuted }}>{key === 'startDate' ? 'Début' : 'Fin'}</ThemedText><ThemedText>{dateLabel(draftFilters[key])}</ThemedText></Pressable>)}</View>}
              <ThemedText type="caption" style={styles.fieldLabel}>Date utilisée</ThemedText><View style={styles.chips}><FilterChip label="Échéance" active={draftFilters.dateField === 'dueDate'} onPress={() => setDraft('dateField', 'dueDate')} /><FilterChip label="Émission" active={draftFilters.dateField === 'issueDate'} onPress={() => setDraft('dateField', 'issueDate')} /></View>
              {dateTarget && <DateTimePicker value={draftFilters[dateTarget] ?? new Date()} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, date) => { if (date && event.type !== 'dismissed') setDraft(dateTarget, date); if (Platform.OS !== 'ios' || event.type === 'dismissed') setDateTarget(null); }} />}
            </ScrollView>
            <View style={styles.filterActions}><Pressable onPress={resetFilters} style={[styles.resetButton, { borderColor: colors.border }]}><ThemedText style={{ color: colors.textMuted, fontWeight: '600' }}>Réinitialiser</ThemedText></Pressable><Pressable onPress={applyFilters} style={[styles.applyButton, { backgroundColor: colors.primary }]}><ThemedText style={styles.applyText}>Appliquer</ThemedText></Pressable></View>
          </View>
        </View>
      </Modal>

      <Modal visible={beneficiaryDetail !== null} transparent animationType="slide" onRequestClose={() => setBeneficiaryDetail(null)}>
        <View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={() => setBeneficiaryDetail(null)} accessibilityLabel="Fermer les détails" />
          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHeader}><View style={styles.detailHeaderCopy}><ThemedText type="subtitle">{beneficiaryDetail}</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>Détail du bénéficiaire</ThemedText></View><Pressable accessibilityLabel="Fermer" onPress={() => setBeneficiaryDetail(null)} style={styles.closeButton}><Ionicons name="close" size={21} color={colors.text} /></Pressable></View>
            {beneficiaryDetailStats && <View style={[styles.detailSummary, { backgroundColor: colors.primarySoft }]}><ThemedText type="caption" style={{ color: colors.textMuted }}>{beneficiaryDetailStats.count} chèque{beneficiaryDetailStats.count === 1 ? '' : 's'}</ThemedText><ThemedText type="subtitle" style={{ color: colors.primary }}>{formatAmount(beneficiaryDetailStats.total)}</ThemedText></View>}
            <ScrollView style={styles.detailChequeList} contentContainerStyle={styles.inlineCheques}>{beneficiaryCheques.map((cheque) => <ChequeCard key={cheque.id} cheque={cheque} onPress={() => router.push(`/cheque/${cheque.id}`)} />)}</ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 24 }, header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerText: { gap: 1 }, backButton: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterSummary: { minHeight: 62, borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, filterIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, filterCopy: { flex: 1, gap: 2 }, filterTitle: { fontWeight: '700' }, countBadge: { minWidth: 25, height: 25, paddingHorizontal: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, countBadgeText: { fontSize: 12, fontWeight: '700' },
  summaryCard: { minHeight: 126, borderWidth: 1, borderRadius: 18, padding: 16, gap: 3, justifyContent: 'center' }, totalAmount: { fontSize: 29, fontWeight: '800' }, metricsRow: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, minWidth: 0, minHeight: 82, borderWidth: 1, borderRadius: 15, padding: 10, gap: 5 }, metricDot: { width: 7, height: 7, borderRadius: 4 }, metricAmount: { fontSize: 13, fontWeight: '700' },
  panel: { padding: 13, borderWidth: 1, borderRadius: 17, gap: 8 }, sectionHeading: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, statusRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth }, statusDot: { width: 8, height: 8, borderRadius: 4 }, statusName: { flex: 1, fontWeight: '500' }, statusAmount: { width: 105, textAlign: 'right', fontSize: 13, fontWeight: '700' }, inlineCheques: { gap: 7, paddingVertical: 5 },
  yearControls: { flexDirection: 'row', alignItems: 'center', gap: 9 }, yearLabel: { fontWeight: '700', minWidth: 40, textAlign: 'center' }, metricChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chart: { height: 112, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 1 }, chartMonth: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }, chartTrack: { width: 12, height: 82, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' }, chartBar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 }, selectedMonth: { minHeight: 54, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, monthTitle: { fontWeight: '700' }, monthAmount: { fontSize: 15, fontWeight: '700' }, detailsButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, monthDetails: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 8 }, detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, detailAmount: { fontSize: 13, fontWeight: '700' },
  searchInput: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11 }, sortOptions: { gap: 6, paddingRight: 4 }, beneficiaryRow: { minHeight: 61, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 }, rank: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, beneficiaryCopy: { flex: 1, gap: 2 }, beneficiaryName: { fontWeight: '600' }, beneficiaryTotal: { alignItems: 'flex-end', gap: 4 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }, sheet: { maxHeight: '92%', borderTopLeftRadius: 23, borderTopRightRadius: 23, borderWidth: 1, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 24, gap: 12 }, sheetHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailHeaderCopy: { flex: 1, gap: 2 }, closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, filterScroll: { flexShrink: 1 }, filterFields: { gap: 9, paddingBottom: 10 }, fieldLabel: { marginTop: 4, fontWeight: '600' }, beneficiaryChoices: { maxHeight: 130, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, choice: { minHeight: 35, maxWidth: '48%', borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, dates: { flexDirection: 'row', gap: 8 }, dateButton: { flex: 1, minWidth: 120, minHeight: 54, borderWidth: 1, borderRadius: 12, padding: 9, gap: 3 }, filterActions: { flexDirection: 'row', gap: 9, paddingTop: 2 }, resetButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, applyButton: { flex: 1.3, minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, applyText: { color: '#fff', fontWeight: '700' }, detailSummary: { minHeight: 68, borderRadius: 13, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailChequeList: { flexGrow: 0, maxHeight: '65%' },
});
