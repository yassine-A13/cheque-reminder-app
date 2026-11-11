import { Cheque, ChequeStatus } from '@/core/types/cheque';

export type AnalysisPeriod = 'Tous' | 'Aujourd’hui' | 'Cette semaine' | 'Ce mois' | 'Mois précédent' | 'Ce trimestre' | 'Cette année' | 'Personnalisée';
export type AnalysisDateField = 'issueDate' | 'dueDate';

export type AnalysisFilters = {
  beneficiary: string;
  status: 'Tous' | ChequeStatus;
  period: AnalysisPeriod;
  dateField: AnalysisDateField;
  startDate: Date | null;
  endDate: Date | null;
};

export type AnalysisTotals = {
  count: number;
  total: number;
  cashed: number;
  pending: number;
  expired: number;
  cancelled: number;
  cashedCount: number;
  pendingCount: number;
  expiredCount: number;
  cancelledCount: number;
};

export type BeneficiaryAnalysis = { beneficiary: string; count: number; total: number; cashed: number; pending: number; expired: number; cancelled: number };
export type MonthlyAnalysis = { month: number; count: number; total: number; cashed: number; pending: number; expired: number; cancelled: number };

export function groupAnalysisByBeneficiary(cheques: Cheque[]): BeneficiaryAnalysis[] {
  const groups = new Map<string, Cheque[]>();
  for (const cheque of cheques) groups.set(cheque.beneficiary, [...(groups.get(cheque.beneficiary) ?? []), cheque]);
  return Array.from(groups, ([beneficiary, items]) => {
    const sum = (status: ChequeStatus) => items.reduce((total, cheque) => total + (cheque.status === status ? cheque.amount : 0), 0);
    return { beneficiary, count: items.length, total: items.reduce((total, cheque) => total + cheque.amount, 0), cashed: sum('Encaissé'), pending: sum('En cours'), expired: sum('Expiré'), cancelled: sum('Annulé') };
  });
}

function startOfDay(date: Date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }

export function getPeriodRange(period: AnalysisPeriod, now = new Date()): { start: Date; end: Date } | null {
  const today = startOfDay(now);
  const end = new Date(today); end.setDate(end.getDate() + 1);
  if (period === 'Tous' || period === 'Personnalisée') return null;
  if (period === 'Aujourd’hui') return { start: today, end };
  if (period === 'Cette semaine') {
    const start = new Date(today); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return { start, end };
  }
  if (period === 'Ce mois') return { start: new Date(today.getFullYear(), today.getMonth(), 1), end };
  if (period === 'Mois précédent') return { start: new Date(today.getFullYear(), today.getMonth() - 1, 1), end: new Date(today.getFullYear(), today.getMonth(), 1) };
  if (period === 'Ce trimestre') return { start: new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), end };
  return { start: new Date(today.getFullYear(), 0, 1), end };
}

export function calculateAnalysis(cheques: Cheque[], filters: AnalysisFilters, now = new Date()): { cheques: Cheque[]; totals: AnalysisTotals } {
  const periodRange = getPeriodRange(filters.period, now);
  const range = filters.period === 'Personnalisée' && filters.startDate && filters.endDate
    ? { start: startOfDay(filters.startDate), end: new Date(filters.endDate.getFullYear(), filters.endDate.getMonth(), filters.endDate.getDate() + 1) }
    : periodRange;
  const selected = cheques.filter((cheque) => {
    if (filters.beneficiary !== 'Tous' && cheque.beneficiary !== filters.beneficiary) return false;
    if (filters.status !== 'Tous' && cheque.status !== filters.status) return false;
    if (range) {
      const value = new Date(cheque[filters.dateField]);
      if (value < range.start || value >= range.end) return false;
    }
    return true;
  });
  const sum = (status: ChequeStatus) => selected.reduce((total, cheque) => total + (cheque.status === status ? cheque.amount : 0), 0);
  return { cheques: selected, totals: { count: selected.length, total: selected.reduce((total, cheque) => total + cheque.amount, 0), cashed: sum('Encaissé'), pending: sum('En cours'), expired: sum('Expiré'), cancelled: sum('Annulé'), cashedCount: selected.filter((cheque) => cheque.status === 'Encaissé').length, pendingCount: selected.filter((cheque) => cheque.status === 'En cours').length, expiredCount: selected.filter((cheque) => cheque.status === 'Expiré').length, cancelledCount: selected.filter((cheque) => cheque.status === 'Annulé').length } };
}

/** Group filtered records into local calendar months for the selected year. */
export function calculateMonthlyAnalysis(cheques: Cheque[], filters: AnalysisFilters, year: number): MonthlyAnalysis[] {
  const buckets = Array.from({ length: 12 }, (_, month) => ({ month, count: 0, total: 0, cashed: 0, pending: 0, expired: 0, cancelled: 0 }));
  for (const cheque of cheques) {
    if (filters.beneficiary !== 'Tous' && cheque.beneficiary !== filters.beneficiary) continue;
    if (filters.status !== 'Tous' && cheque.status !== filters.status) continue;
    const date = new Date(cheque[filters.dateField]);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) continue;
    const bucket = buckets[date.getMonth()];
    bucket.count += 1;
    bucket.total += cheque.amount;
    if (cheque.status === 'Encaissé') bucket.cashed += cheque.amount;
    else if (cheque.status === 'En cours') bucket.pending += cheque.amount;
    else if (cheque.status === 'Expiré') bucket.expired += cheque.amount;
    else if (cheque.status === 'Annulé') bucket.cancelled += cheque.amount;
  }
  return buckets;
}
