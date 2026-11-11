import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { Cheque } from '@/core/types/cheque';
import { AnalysisFilters, AnalysisTotals } from '@/features/cheques/financial-analysis';
import { getChequeImageDataUri } from '@/features/cheques/image-service';
import { formatDisplayDate } from '@/utils/date';
import { formatAmount } from '@/utils/format';

const exportColumns = [
  'Bénéficiaire',
  'Numéro du chèque',
  'Montant',
  "Date d'émission",
  "Date d'échéance",
  'Statut',
] as const;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExportDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function excelDateSerial(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day);
  return utc / 86_400_000 + 25569;
}

async function shareGeneratedFile(uri: string, mimeType: string, dialogTitle: string, uti: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || !('size' in info) || info.size <= 0) {
    throw new Error('Le fichier exporté est vide ou introuvable.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: uti });
}

function financialFilterRows(filters: AnalysisFilters) {
  const period = filters.period === 'Personnalisée'
    ? `${filters.startDate ? formatDisplayDate(filters.startDate.toISOString()) : 'Non définie'} – ${filters.endDate ? formatDisplayDate(filters.endDate.toISOString()) : 'Non définie'}`
    : filters.period;
  return [
    ['Bénéficiaire', filters.beneficiary],
    ['Statut', filters.status],
    ['Période', period],
    ['Date utilisée', filters.dateField === 'issueDate' ? "Date d'émission" : "Date d'échéance"],
  ] as const;
}

function financialSummaryRows(totals: AnalysisTotals) {
  return [
    ['Nombre de chèques', totals.count],
    ['Montant total', totals.total],
    ['Montant encaissé', totals.cashed],
    ['Montant en cours', totals.pending],
    ['Montant expiré', totals.expired],
    ['Montant annulé', totals.cancelled],
  ] as const;
}

export async function exportFinancialAnalysisExcel(cheques: Cheque[], filters: AnalysisFilters, totals: AnalysisTotals) {
  const exportedAt = new Date();
  const summaryRows: (string | number)[][] = [
    ['Analyse financière — Cheque Reminder'],
    ['Généré le', formatExportDate(exportedAt)],
    [],
    ['Filtres appliqués'],
    ...financialFilterRows(filters).map(([label, value]) => [label, value]),
    [],
    ['Statistique', 'Valeur'],
    ...financialSummaryRows(totals).map(([label, value]) => [label, value]),
  ];
  const detailsRows: (string | number)[][] = [
    ['Bénéficiaire', 'Numéro du chèque', 'Montant (MAD)', "Date d'émission", "Date d'échéance", 'Statut'],
    ...cheques.map((cheque) => [cheque.beneficiary, cheque.chequeNumber, cheque.amount, excelDateSerial(cheque.issueDate), excelDateSerial(cheque.dueDate), cheque.status]),
    ['TOTAL', '', totals.total, '', '', ''],
  ];
  const summary = XLSX.utils.aoa_to_sheet(summaryRows);
  summary['!cols'] = [{ wch: 28 }, { wch: 30 }];
  for (let row = 11; row <= 15; row += 1) {
    const cell = summary[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (cell) cell.z = '#,##0.00';
  }
  const detail = XLSX.utils.aoa_to_sheet(detailsRows);
  detail['!cols'] = [{ wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 16 }];
  detail['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  if (cheques.length) detail['!autofilter'] = { ref: `A1:F${cheques.length + 1}` };
  for (let row = 1; row <= cheques.length; row += 1) {
    const amountCell = detail[XLSX.utils.encode_cell({ r: row, c: 2 })];
    if (amountCell) amountCell.z = '#,##0.00';
    for (const col of [3, 4]) {
      const cell = detail[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.z = 'dd/mm/yyyy';
    }
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summary, 'Synthèse');
  XLSX.utils.book_append_sheet(workbook, detail, 'Détail des chèques');
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64', compression: true });
  const uri = `${FileSystem.cacheDirectory}analyse-financiere-${Date.now()}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await shareGeneratedFile(uri, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Partager l’analyse financière Excel', 'org.openxmlformats.spreadsheetml.sheet');
}

export async function exportFinancialAnalysisPdf(cheques: Cheque[], filters: AnalysisFilters, totals: AnalysisTotals) {
  const exportedAt = new Date();
  const filterRows = financialFilterRows(filters).map(([label, value]) => `<div class="filter"><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></div>`).join('');
  const rows = cheques.map((cheque) => `<tr><td>${escapeHtml(cheque.beneficiary)}</td><td>${escapeHtml(cheque.chequeNumber)}</td><td class="amount">${escapeHtml(formatAmount(cheque.amount))}</td><td>${escapeHtml(formatDisplayDate(cheque.issueDate))}</td><td>${escapeHtml(formatDisplayDate(cheque.dueDate))}</td><td>${escapeHtml(cheque.status)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"/><style>
    @page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:10pt Arial,sans-serif;color:#17212b;margin:0}h1{font-size:21pt;color:#0f766e;margin:0 0 5px}.generated{color:#64748b;margin-bottom:18px}.filters,.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 16px}.filter,.stat{border:1px solid #dbe3e8;border-radius:7px;padding:8px}.filter b,.filter span,.stat b,.stat span{display:block}.filter b,.stat b{font-size:8pt;color:#64748b;margin-bottom:4px}.stat span{font-size:11pt;font-weight:bold;color:#0f766e}h2{font-size:13pt;margin:17px 0 8px}table{border-collapse:collapse;width:100%;table-layout:fixed}thead{display:table-header-group}tr{page-break-inside:avoid}th{background:#0f766e;color:#fff;text-align:left;font-size:8pt;padding:7px 5px}td{border-bottom:1px solid #dbe3e8;padding:6px 5px;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f3f7f7}th:nth-child(1){width:22%}th:nth-child(2){width:16%}th:nth-child(3){width:14%}.amount{text-align:right;white-space:nowrap} .empty{text-align:center;color:#64748b;padding:16px}
  </style></head><body><h1>Analyse financière — Cheque Reminder</h1><div class="generated">Généré le ${escapeHtml(formatExportDate(exportedAt))}</div><h2>Filtres appliqués</h2><div class="filters">${filterRows}</div><h2>Statistiques financières</h2><div class="stats">${financialSummaryRows(totals).map(([label, value]) => `<div class="stat"><b>${escapeHtml(String(label))}</b><span>${typeof value === 'number' && label !== 'Nombre de chèques' ? escapeHtml(formatAmount(value)) : escapeHtml(String(value))}</span></div>`).join('')}</div><h2>Détail des chèques (${cheques.length})</h2><table><thead><tr>${exportColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">Aucun chèque correspondant aux filtres.</td></tr>'}</tbody></table></body></html>`;
  const { uri } = await Print.printToFileAsync({ html, width: 842, height: 595 });
  await shareGeneratedFile(uri, 'application/pdf', 'Partager l’analyse financière PDF', '.pdf');
}

export async function exportChequesExcel(cheques: Cheque[]) {
  if (!cheques.length) throw new Error('Sélectionnez au moins un chèque à exporter.');
  const exportedAt = new Date();
  const total = cheques.reduce((sum, cheque) => sum + cheque.amount, 0);
  const rows: (string | number)[][] = [
    ['Cheque Reminder'],
    [`Exporté le ${formatExportDate(exportedAt)}`],
    [...exportColumns],
    ...cheques.map((cheque) => [
      cheque.beneficiary,
      cheque.chequeNumber,
      cheque.amount,
      excelDateSerial(cheque.issueDate),
      excelDateSerial(cheque.dueDate),
      cheque.status,
    ]),
    ['TOTAL', '', total, '', '', ''],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [
    { wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 },
  ];
  sheet['!freeze'] = { xSplit: 0, ySplit: 3, topLeftCell: 'A4', activePane: 'bottomLeft', state: 'frozen' };
  sheet['!autofilter'] = { ref: `A3:F${Math.max(3, cheques.length + 3)}` };
  for (let row = 3; row < 3 + cheques.length; row += 1) {
    for (const col of [2]) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.z = '#,##0.00';
    }
    for (const col of [3, 4]) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell) cell.z = 'dd/mm/yyyy';
    }
  }
  const totalCell = sheet[XLSX.utils.encode_cell({ r: cheques.length + 3, c: 2 })];
  if (totalCell) totalCell.z = '#,##0.00';

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Chèques');
  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64', compression: true });
  const uri = `${FileSystem.cacheDirectory}cheques-${Date.now()}.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await shareGeneratedFile(
    uri,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Exporter les chèques en Excel',
    'org.openxmlformats.spreadsheetml.sheet',
  );
}

export async function exportChequesPdf(cheques: Cheque[]) {
  if (!cheques.length) throw new Error('Sélectionnez au moins un chèque à exporter.');
  const exportedAt = new Date();
  const beneficiaryCount = new Set(cheques.map(({ beneficiary }) => beneficiary.trim().toLocaleLowerCase('fr-FR')).filter(Boolean)).size;
  const totals = cheques.reduce((result, cheque) => {
    result.total += cheque.amount;
    if (cheque.status === 'Encaissé') result.cashed += cheque.amount;
    else if (cheque.status === 'En cours') result.pending += cheque.amount;
    else if (cheque.status === 'Expiré') result.expired += cheque.amount;
    else if (cheque.status === 'Annulé') result.cancelled += cheque.amount;
    return result;
  }, { total: 0, cashed: 0, pending: 0, expired: 0, cancelled: 0 });
  const records = await Promise.all(cheques.map(async (cheque) => ({
    cheque,
    imageDataUri: await getChequeImageDataUri(cheque.imagePath),
  })));
  const fiches = records.map(({ cheque, imageDataUri }) => `
    <article class="fiche">
      <header class="fiche-header"><h2>Fiche de chèque</h2><span>${escapeHtml(cheque.status)}</span></header>
      <section class="details">
        <div class="field"><b>Bénéficiaire</b><span>${escapeHtml(cheque.beneficiary)}</span></div>
        <div class="field"><b>Numéro du chèque</b><span>${escapeHtml(cheque.chequeNumber)}</span></div>
        <div class="field"><b>Montant</b><span>${escapeHtml(formatAmount(cheque.amount))}</span></div>
        <div class="field"><b>Date d’émission</b><span>${escapeHtml(formatDisplayDate(cheque.issueDate))}</span></div>
        <div class="field"><b>Date d’échéance</b><span>${escapeHtml(formatDisplayDate(cheque.dueDate))}</span></div>
        <div class="field"><b>Statut</b><span>${escapeHtml(cheque.status)}</span></div>
        ${cheque.note?.trim() ? `<div class="field note"><b>Note</b><span>${escapeHtml(cheque.note)}</span></div>` : ''}
      </section>
      ${imageDataUri ? `<section class="photo"><h3>Image du chèque</h3><img src="${imageDataUri}" alt="Photographie du chèque" /></section>` : ''}
    </article>`).join('');
  const html = `
    <!doctype html>
    <html><head><meta charset="utf-8" />
      <style>
        @page { size: A4 portrait; margin: 14mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #17212b; margin: 0; font-size: 9pt; }
        .cover { min-height: 260mm; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: center; }
        .brand { color: #0f766e; font-size: 12pt; font-weight: 700; margin-bottom: 10px; }
        h1 { color: #17212b; font-size: 27pt; margin: 0 0 8px; }
        .meta { color: #64748b; font-size: 10pt; margin-bottom: 24px; }
        .summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .metric { border: 1px solid #dbe3e8; border-radius: 8px; padding: 12px; }
        .metric b, .metric span { display: block; }
        .metric b { color: #64748b; font-size: 8pt; margin-bottom: 5px; }
        .metric span { font-size: 12pt; font-weight: 700; color: #0f766e; }
        .fiche { border: 1px solid #dbe3e8; border-left: 4px solid #0f766e; border-radius: 8px; padding: 10px 12px; margin: 0 0 10px; page-break-inside: avoid; break-inside: avoid; }
        .fiche-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #dbe3e8; padding-bottom: 6px; margin-bottom: 7px; }
        .fiche-header h2 { font-size: 11pt; margin: 0; }
        .fiche-header span { color: #0f766e; font-size: 8pt; font-weight: 700; }
        .details { display: grid; grid-template-columns: 1fr 1fr; }
        .field { min-height: 34px; padding: 5px 7px; border-bottom: 1px solid #edf1f3; }
        .field:nth-child(odd) { border-right: 1px solid #edf1f3; }
        .field b, .field span { display: block; overflow-wrap: anywhere; }
        .field b { color: #64748b; font-size: 7pt; margin-bottom: 2px; }
        .field span { font-size: 9pt; font-weight: 600; }
        .note { grid-column: 1 / -1; border-right: 0 !important; }
        .photo { margin-top: 7px; page-break-inside: avoid; break-inside: avoid; text-align: center; }
        .photo h3 { color: #64748b; font-size: 7pt; margin: 0 0 4px; text-align: left; }
        .photo img { display: block; width: auto; height: auto; max-width: 100%; max-height: 68mm; object-fit: contain; margin: 0 auto; }
      </style>
    </head><body>
      <section class="cover">
        <div class="brand">Cheque Reminder</div><h1>Rapport global des chèques</h1>
        <div class="meta">Généré le ${escapeHtml(formatExportDate(exportedAt))}</div>
        <div class="summary">
          <div class="metric"><b>Nombre total de chèques</b><span>${cheques.length}</span></div>
          <div class="metric"><b>Bénéficiaires différents</b><span>${beneficiaryCount}</span></div>
          <div class="metric"><b>Montant total</b><span>${escapeHtml(formatAmount(totals.total))}</span></div>
          <div class="metric"><b>Montant encaissé</b><span>${escapeHtml(formatAmount(totals.cashed))}</span></div>
          <div class="metric"><b>Montant en cours</b><span>${escapeHtml(formatAmount(totals.pending))}</span></div>
          <div class="metric"><b>Montant expiré</b><span>${escapeHtml(formatAmount(totals.expired))}</span></div>
          <div class="metric"><b>Montant annulé</b><span>${escapeHtml(formatAmount(totals.cancelled))}</span></div>
        </div>
      </section>
      ${fiches}
    </body></html>`;

  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  await shareGeneratedFile(uri, 'application/pdf', 'Exporter les chèques en PDF', '.pdf');
}
