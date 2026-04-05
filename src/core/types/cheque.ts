export type ChequeStatus = 'En cours' | 'Encaissé' | 'Annulé' | 'Expiré';
export type ChequeFilterStatus = 'Tous' | ChequeStatus;
export type ChequeSortField = 'dueDate' | 'issueDate' | 'amount' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

export type Cheque = {
  id: number;
  beneficiary: string;
  amount: number;
  chequeNumber: string;
  bank?: string | null;
  issueDate: string;
  dueDate: string;
  status: ChequeStatus;
  note?: string | null;
  imagePath?: string | null;
  notificationId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChequeInput = Omit<Cheque, 'id' | 'notificationId' | 'createdAt' | 'updatedAt'>;

export type DashboardStats = {
  totalCheques: number;
  activeCheques: number;
  dueSoonCheques: number;
  expiredCheques: number;
  totalAmount: number;
  totalAmountFormatted: string;
};

export type ChequeQueryOptions = {
  search?: string;
  status?: ChequeFilterStatus;
  sortBy?: ChequeSortField;
  sortDirection?: SortDirection;
};

export const CHEQUE_FIELD_LABELS: Record<keyof Omit<Cheque, 'id' | 'notificationId'>, string> = {
  beneficiary: 'Bénéficiaire',
  amount: 'Montant',
  chequeNumber: 'Numéro du chèque',
  bank: 'Banque',
  issueDate: "Date d'émission",
  dueDate: "Date d'échéance",
  status: 'Statut',
  note: 'Note',
  imagePath: 'Image du chèque',
  createdAt: 'Créé le',
  updatedAt: 'Mis à jour le',
};
