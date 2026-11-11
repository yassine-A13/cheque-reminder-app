import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import { ThemedText } from '@/components/ThemedText';
import { Cheque } from '@/core/types/cheque';
import { listChequesSnapshot } from '@/features/cheques/repository';
import { useExportFilters } from '@/features/export/ExportFilterContext';
import { useAppTheme } from '@/providers/ThemeProvider';
import { formatAmount } from '@/utils/format';

type ExportFormat = 'PDF' | 'Excel';
type SelectionMode = 'all' | 'custom' | 'filtered';

type ExportSelectionSheetProps = {
  visible: boolean;
  format: ExportFormat | null;
  onClose: () => void;
  onExport: (cheques: Cheque[]) => Promise<void>;
};

export function ExportSelectionSheet({ visible, format, onClose, onExport }: ExportSelectionSheetProps) {
  const { colors } = useAppTheme();
  const { search, status } = useExportFilters();
  const [allCheques, setAllCheques] = useState<Cheque[]>([]);
  const [filteredCheques, setFilteredCheques] = useState<Cheque[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [mode, setMode] = useState<SelectionMode>('all');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setMode('all');
    setAllCheques([]);
    setFilteredCheques([]);
    setSelectedIds([]);
    setLoading(true);
    Promise.all([
      listChequesSnapshot({ sortBy: 'dueDate', sortDirection: 'asc' }),
      listChequesSnapshot({ search, status, sortBy: 'dueDate', sortDirection: 'asc' }),
    ]).then(([all, filtered]) => {
      if (!active) return;
      setAllCheques(all);
      setFilteredCheques(filtered);
      setSelectedIds(all.map((cheque) => cheque.id));
    }).catch((error: unknown) => {
      if (active) Alert.alert('Sélection des chèques', error instanceof Error ? error.message : 'Impossible de charger les chèques.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [search, status, visible]);

  const selectedCheques = useMemo(() => {
    if (mode === 'all') return allCheques;
    if (mode === 'filtered') return filteredCheques;
    const selected = new Set(selectedIds);
    return allCheques.filter((cheque) => selected.has(cheque.id));
  }, [allCheques, filteredCheques, mode, selectedIds]);
  const total = selectedCheques.reduce((sum, cheque) => sum + cheque.amount, 0);

  const toggleCheque = (id: number) => setSelectedIds((current) =>
    current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
  );

  const confirmExport = async () => {
    if (!selectedCheques.length || exporting) return;
    setExporting(true);
    try {
      await onExport(selectedCheques);
      onClose();
      Alert.alert('Export terminé', `Le fichier ${format ?? ''} a bien été généré.`);
    } catch (error) {
      Alert.alert(`Export ${format ?? ''}`, error instanceof Error ? error.message : 'Le fichier n’a pas pu être généré ou partagé.');
    } finally {
      setExporting(false);
    }
  };

  const modes: Array<{ key: SelectionMode; title: string; description: string }> = [
    { key: 'all', title: 'Tous les chèques', description: `${allCheques.length} chèque${allCheques.length === 1 ? '' : 's'}` },
    { key: 'custom', title: 'Sélection personnalisée', description: 'Choisir les chèques à exporter' },
    { key: 'filtered', title: 'Chèques filtrés', description: `${filteredCheques.length} correspondant${filteredCheques.length === 1 ? '' : 's'} aux filtres de la liste` },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer la sélection" />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="subtitle">Préparer l’export {format}</ThemedText>
              <ThemedText type="caption" style={{ color: colors.textMuted }}>Choisissez les chèques à inclure</ThemedText>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Fermer"><Ionicons name="close" size={22} color={colors.text} /></Pressable>
          </View>

          <View style={styles.modes}>
            {modes.map((item) => (
              <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.mode, { borderColor: mode === item.key ? colors.primary : colors.border, backgroundColor: mode === item.key ? colors.primarySoft : colors.surface }]}>
                <Ionicons name={mode === item.key ? 'radio-button-on' : 'radio-button-off'} size={19} color={mode === item.key ? colors.primary : colors.textMuted} />
                <View style={styles.modeCopy}><ThemedText>{item.title}</ThemedText><ThemedText type="caption" style={{ color: colors.textMuted }}>{item.description}</ThemedText></View>
              </Pressable>
            ))}
          </View>

          {mode === 'custom' && <>
            <View style={styles.bulkActions}>
              <ThemedText type="caption" style={{ color: colors.textMuted }}>Sélection personnalisée</ThemedText>
              <View style={styles.bulkButtons}>
                <Pressable onPress={() => setSelectedIds(allCheques.map((cheque) => cheque.id))}><ThemedText type="caption" style={{ color: colors.primary }}>Tout sélectionner</ThemedText></Pressable>
                <Pressable onPress={() => setSelectedIds([])}><ThemedText type="caption" style={{ color: colors.primary }}>Tout désélectionner</ThemedText></Pressable>
              </View>
            </View>
            <ScrollView style={styles.chequeList} contentContainerStyle={styles.chequeListContent} showsVerticalScrollIndicator>
              {allCheques.map((cheque) => {
                const checked = selectedIds.includes(cheque.id);
                return (
                  <Pressable key={cheque.id} onPress={() => toggleCheque(cheque.id)} style={[styles.chequeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={21} color={checked ? colors.primary : colors.textMuted} />
                    <View style={styles.chequeCopy}>
                      <ThemedText>{cheque.beneficiary}</ThemedText>
                      <ThemedText type="caption" style={{ color: colors.textMuted }}>N° {cheque.chequeNumber}</ThemedText>
                    </View>
                    <View style={styles.chequeMeta}><ThemedText type="caption">{formatAmount(cheque.amount)}</ThemedText><StatusBadge status={cheque.status} /></View>
                  </Pressable>
                );
              })}
              {!loading && !allCheques.length && <ThemedText type="caption" style={{ color: colors.textMuted }}>Aucun chèque enregistré.</ThemedText>}
            </ScrollView>
          </>}

          {loading ? <ThemedText type="caption" style={{ color: colors.textMuted }}>Chargement des chèques…</ThemedText> : null}
          <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
            <ThemedText>{selectedCheques.length} chèque{selectedCheques.length === 1 ? '' : 's'} sélectionné{selectedCheques.length === 1 ? '' : 's'}</ThemedText>
            <ThemedText type="subtitle" style={{ color: colors.primary }}>{formatAmount(total)}</ThemedText>
          </View>
          <Pressable disabled={loading || exporting || !selectedCheques.length} onPress={() => void confirmExport()} style={[styles.confirmButton, { backgroundColor: colors.primary, opacity: loading || exporting || !selectedCheques.length ? 0.45 : 1 }]}>
            <ThemedText style={styles.confirmText}>{exporting ? 'Préparation…' : `Exporter en ${format}`}</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '94%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: 2 },
  modes: { gap: 7 },
  mode: { minHeight: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeCopy: { flex: 1, gap: 1 },
  bulkActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  bulkButtons: { flexDirection: 'row', gap: 14 },
  chequeList: { flexGrow: 0, maxHeight: 270 },
  chequeListContent: { gap: 6, paddingBottom: 2 },
  chequeRow: { minHeight: 54, borderWidth: 1, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chequeCopy: { flex: 1, gap: 2 },
  chequeMeta: { alignItems: 'flex-end', gap: 3 },
  summary: { borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmButton: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
