import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getChequeImageDataUri } from '@/features/cheques/image-service';
import { listCheques } from '@/features/cheques/repository';
import { formatDisplayDate } from '@/utils/date';
import { formatAmount } from '@/utils/format';

function escapeCsvField(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function exportChequesCsv() {
  const cheques = await listCheques({ sortBy: 'dueDate', sortDirection: 'asc' });
  const rows = [
    ['Beneficiaire', 'Montant', 'NumeroCheque', 'Banque', 'DateEmission', 'DateEcheance', 'Statut', 'Note'],
    ...cheques.map((cheque) => [
      cheque.beneficiary,
      cheque.amount.toFixed(2),
      cheque.chequeNumber,
      cheque.bank ?? '',
      cheque.issueDate,
      cheque.dueDate,
      cheque.status,
      cheque.note ?? '',
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => escapeCsvField(String(cell))).join(',')).join('\n');
  const fileUri = `${FileSystem.cacheDirectory}cheques-${Date.now()}.csv`;

  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Exporter les chèques en CSV',
    UTI: 'public.comma-separated-values-text',
  });
}

export async function exportChequesPdf() {
  const cheques = await listCheques({ sortBy: 'dueDate', sortDirection: 'asc' });
  const sections = await Promise.all(
    cheques.map(async (cheque) => {
      const imageDataUri = await getChequeImageDataUri(cheque.imagePath);

      return `
        <article class="cheque-card">
          <div class="card-header">
            <div>
              <h2>${escapeHtml(cheque.beneficiary)}</h2>
              <p class="cheque-number">Chèque n° ${escapeHtml(cheque.chequeNumber)}</p>
            </div>
            <div class="amount">${escapeHtml(formatAmount(cheque.amount))}</div>
          </div>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Date d'émission</span>
              <strong>${escapeHtml(formatDisplayDate(cheque.issueDate))}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date d'échéance</span>
              <strong>${escapeHtml(formatDisplayDate(cheque.dueDate))}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-label">Statut</span>
              <strong>${escapeHtml(cheque.status)}</strong>
            </div>
            <div class="detail-item">
              <span class="detail-label">Banque</span>
              <strong>${escapeHtml(cheque.bank ?? '-')}</strong>
            </div>
          </div>
          ${
            cheque.note
              ? `
                <div class="note-block">
                  <span class="detail-label">Note</span>
                  <p>${escapeHtml(cheque.note)}</p>
                </div>
              `
              : ''
          }
          <div class="image-block">
            <span class="detail-label">Image du chèque</span>
            ${
              imageDataUri
                ? `<img src="${imageDataUri}" alt="Image du chèque ${escapeHtml(cheque.chequeNumber)}" />`
                : '<div class="image-placeholder">Aucune image enregistrée</div>'
            }
          </div>
        </article>
      `;
    }),
  );

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; background: #f8fafc; }
          h1 { margin: 0 0 8px; }
          h2 { margin: 0; font-size: 18px; }
          p { color: #475569; margin-top: 0; }
          .page-subtitle { margin-bottom: 24px; }
          .cheque-card {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 18px;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .card-header {
            display: table;
            width: 100%;
            margin-bottom: 18px;
          }
          .card-header > div {
            display: table-cell;
            vertical-align: top;
          }
          .card-header > div:last-child {
            text-align: right;
          }
          .cheque-number {
            margin: 4px 0 0;
          }
          .amount {
            font-size: 20px;
            font-weight: bold;
            color: #0f766e;
          }
          .details-grid {
            display: table;
            width: 100%;
            border-spacing: 0 12px;
            margin-bottom: 12px;
          }
          .detail-item {
            display: table-cell;
            width: 50%;
            padding-right: 16px;
          }
          .detail-label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
            margin-bottom: 4px;
          }
          .note-block {
            margin: 6px 0 18px;
          }
          .note-block p {
            margin: 0;
            color: #0f172a;
          }
          .image-block img {
            display: block;
            width: 100%;
            max-height: 320px;
            object-fit: contain;
            border-radius: 14px;
            border: 1px solid #cbd5e1;
            background: #f8fafc;
          }
          .image-placeholder {
            padding: 28px 16px;
            text-align: center;
            color: #64748b;
            border: 1px dashed #cbd5e1;
            border-radius: 14px;
            background: #f8fafc;
          }
        </style>
      </head>
      <body>
        <h1>Cheque Reminder</h1>
        <p class="page-subtitle">Export du ${escapeHtml(formatDisplayDate(new Date().toISOString(), true))}</p>
        ${sections.join('')}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Exporter les chèques en PDF',
    UTI: '.pdf',
  });
}
