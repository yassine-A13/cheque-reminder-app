import { useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SettingsCard } from '@/components/SettingsCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemeSelector } from '@/components/ThemeSelector';
import { exportChequesExcel, exportChequesPdf, exportFinancialAnalysisExcel, exportFinancialAnalysisPdf } from '@/features/export/export-service';
import { calculateAnalysis } from '@/features/cheques/financial-analysis';
import { listChequesSnapshot } from '@/features/cheques/repository';
import { ExportSelectionSheet } from '@/features/export/ExportSelectionSheet';
import { Cheque } from '@/core/types/cheque';
import { useAuth } from '@/providers/AuthProvider';
import { useAppTheme } from '@/providers/ThemeProvider';
import { useState } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { preference, setPreference } = useAppTheme();
  const { biometricEnabled, biometricSupported, setBiometricEnabled, lock } = useAuth();
  const [exportFormat, setExportFormat] = useState<'PDF' | 'Excel' | null>(null);
  const [analysisExporting, setAnalysisExporting] = useState<'PDF' | 'Excel' | null>(null);

  const handleExport = async (cheques: Cheque[]) => {
    if (exportFormat === 'PDF') return exportChequesPdf(cheques);
    if (exportFormat === 'Excel') return exportChequesExcel(cheques);
  };
  const handleAnalysisExport = async (format: 'PDF' | 'Excel') => {
    if (analysisExporting) return;
    setAnalysisExporting(format);
    try {
      const filters = { beneficiary: 'Tous', status: 'Tous' as const, period: 'Tous' as const, dateField: 'dueDate' as const, startDate: null, endDate: null };
      const result = calculateAnalysis(await listChequesSnapshot(), filters);
      if (format === 'PDF') await exportFinancialAnalysisPdf(result.cheques, filters, result.totals);
      else await exportFinancialAnalysisExcel(result.cheques, filters, result.totals);
      Alert.alert('Export terminé', `L’analyse financière a été partagée au format ${format}.`);
    } catch (error) {
      Alert.alert(`Export ${format}`, error instanceof Error ? error.message : 'Le fichier n’a pas pu être généré ou partagé.');
    } finally {
      setAnalysisExporting(null);
    }
  };
  const handleBiometricToggle = async () => {
    if (!biometricSupported) {
      Alert.alert('Biométrie indisponible', 'Aucun capteur biométrique utilisable n’a été détecté.');
      return;
    }
    const success = await setBiometricEnabled(!biometricEnabled);
    if (!success && !biometricEnabled) Alert.alert('Activation refusée', 'La biométrie n’a pas pu être activée.');
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Réglages</ThemedText>
        <ThemedText>Apparence, sécurité et export de vos chèques.</ThemedText>
      </View>
      <SettingsCard title="Apparence" description="Thème de l’application">
        <ThemeSelector selected={preference} onChange={setPreference} />
      </SettingsCard>
      <SettingsCard title="Sécurité" description="Protégez l’accès à vos chèques">
        <View style={styles.actions}>
          <SettingsCard.Action label="Biométrie" value={biometricSupported ? (biometricEnabled ? 'Activée' : 'Désactivée') : 'Indisponible'} onPress={handleBiometricToggle} />
          <SettingsCard.Action label="Changer le PIN" value="Modifier" onPress={() => router.push('/change-pin')} />
          <SettingsCard.Action label="Verrouiller maintenant" value="PIN" onPress={lock} />
        </View>
      </SettingsCard>
      <SettingsCard title="Export" description="Partagez ou ouvrez le fichier dans un tableur">
        <View style={styles.actions}>
          <SettingsCard.Action label="Exporter en PDF" value="Sélectionner" onPress={() => setExportFormat('PDF')} />
          <SettingsCard.Action label="Exporter en Excel" value="Sélectionner" onPress={() => setExportFormat('Excel')} />
        </View>
      </SettingsCard>
      <SettingsCard title="Analyse financière" description="Exporter la synthèse de tous vos chèques">
        <View style={styles.actions}>
          <SettingsCard.Action label="Exporter l’analyse en PDF" value={analysisExporting === 'PDF' ? 'Préparation…' : 'PDF'} onPress={() => void handleAnalysisExport('PDF')} />
          <SettingsCard.Action label="Exporter l’analyse en Excel" value={analysisExporting === 'Excel' ? 'Préparation…' : 'Excel'} onPress={() => void handleAnalysisExport('Excel')} />
        </View>
      </SettingsCard>
      <ExportSelectionSheet
        visible={exportFormat !== null}
        format={exportFormat}
        onClose={() => setExportFormat(null)}
        onExport={handleExport}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 18 },
  header: { gap: 4 },
  actions: { gap: 8 },
});
