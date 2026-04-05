import {
  Cheque,
  ChequeInput,
  ChequeQueryOptions,
  ChequeSortField,
  ChequeStatus,
  DashboardStats,
  SortDirection,
} from '@/core/types/cheque';
import { getDatabase } from '@/db/client';
import { deleteChequeImageIfManaged } from '@/features/cheques/image-service';
import {
  cancelChequeNotification,
  rescheduleChequeNotification,
  scheduleChequeNotification,
} from '@/features/notifications/notification-service';
import { formatAmount } from '@/utils/format';

function normalizeStatus(status: ChequeStatus, dueDate: string): ChequeStatus {
  if (status === 'En cours' && new Date(dueDate).getTime() < Date.now()) {
    return 'Expiré';
  }

  return status;
}

function rowToCheque(row: Record<string, unknown>): Cheque {
  return {
    id: Number(row.id),
    beneficiary: String(row.beneficiary),
    amount: Number(row.amount),
    chequeNumber: String(row.chequeNumber),
    bank: row.bank ? String(row.bank) : null,
    issueDate: String(row.issueDate),
    dueDate: String(row.dueDate),
    status: String(row.status) as ChequeStatus,
    note: row.note ? String(row.note) : null,
    imagePath: row.imagePath ? String(row.imagePath) : null,
    notificationId: row.notificationId ? String(row.notificationId) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

async function syncExpiredCheques() {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.runAsync(
    "UPDATE cheques SET status = 'Expiré', updatedAt = ?, notificationId = NULL WHERE status = 'En cours' AND dueDate < ?",
    [now, now],
  );
}

function resolveSortField(field?: ChequeSortField) {
  switch (field) {
    case 'issueDate':
      return 'issueDate';
    case 'amount':
      return 'amount';
    case 'createdAt':
      return 'createdAt';
    case 'dueDate':
    default:
      return 'dueDate';
  }
}

function resolveSortDirection(direction?: SortDirection) {
  return direction === 'desc' ? 'DESC' : 'ASC';
}

function buildListQuery(options: ChequeQueryOptions = {}) {
  const clauses: string[] = [];
  const params: Array<string> = [];

  if (options.search?.trim()) {
    clauses.push('(beneficiary LIKE ? OR chequeNumber LIKE ?)');
    const term = `%${options.search.trim()}%`;
    params.push(term, term);
  }

  if (options.status && options.status !== 'Tous') {
    clauses.push('status = ?');
    params.push(options.status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = resolveSortField(options.sortBy);
  const direction = resolveSortDirection(options.sortDirection);

  return {
    sql: `SELECT * FROM cheques ${where} ORDER BY ${orderBy} ${direction}, id DESC`,
    params,
  };
}

export async function listCheques(options: ChequeQueryOptions = {}) {
  await syncExpiredCheques();
  const db = await getDatabase();
  const query = buildListQuery(options);
  const rows = await db.getAllAsync(query.sql, query.params);
  return rows.map((row) => rowToCheque(row as Record<string, unknown>));
}

export async function listRecentCheques(limit = 5) {
  await syncExpiredCheques();
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM cheques ORDER BY datetime(createdAt) DESC, id DESC LIMIT ?',
    [limit],
  );
  return rows.map((row) => rowToCheque(row as Record<string, unknown>));
}

export async function listUrgentCheques(limit = 5) {
  await syncExpiredCheques();
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const in48hIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const rows = await db.getAllAsync(
    `
      SELECT * FROM cheques
      WHERE status = 'En cours' AND dueDate BETWEEN ? AND ?
      ORDER BY dueDate ASC, id DESC
      LIMIT ?
    `,
    [nowIso, in48hIso, limit],
  );
  return rows.map((row) => rowToCheque(row as Record<string, unknown>));
}

export async function getChequeById(id: number) {
  await syncExpiredCheques();
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM cheques WHERE id = ?', [id]);
  return row ? rowToCheque(row as Record<string, unknown>) : null;
}

export async function createCheque(input: ChequeInput) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const status = normalizeStatus(input.status, input.dueDate);
  const notificationId =
    status === 'En cours'
      ? await scheduleChequeNotification({
          beneficiary: input.beneficiary,
          amount: input.amount,
          dueDate: input.dueDate,
          chequeNumber: input.chequeNumber,
        })
      : null;

  await db.runAsync(
    `INSERT INTO cheques (
      beneficiary, amount, chequeNumber, bank, issueDate, dueDate,
      status, note, imagePath, notificationId, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.beneficiary,
      input.amount,
      input.chequeNumber,
      input.bank ?? null,
      input.issueDate,
      input.dueDate,
      status,
      input.note ?? null,
      input.imagePath ?? null,
      notificationId,
      now,
      now,
    ],
  );

  const created = await db.getFirstAsync('SELECT * FROM cheques WHERE id = last_insert_rowid()');

  if (!created) {
    throw new Error('Failed to create cheque');
  }

  return rowToCheque(created as Record<string, unknown>);
}

export async function updateCheque(id: number, input: ChequeInput) {
  const current = await getChequeById(id);

  if (!current) {
    throw new Error('Cheque not found');
  }

  const db = await getDatabase();
  const updatedAt = new Date().toISOString();
  const status = normalizeStatus(input.status, input.dueDate);
  const notificationId =
    status === 'En cours'
      ? await rescheduleChequeNotification(
          {
            beneficiary: input.beneficiary,
            amount: input.amount,
            dueDate: input.dueDate,
            chequeNumber: input.chequeNumber,
          },
          current.notificationId,
        )
      : (
          await cancelChequeNotification(current.notificationId),
          null
        );

  await db.runAsync(
    `UPDATE cheques
     SET beneficiary = ?, amount = ?, chequeNumber = ?, bank = ?, issueDate = ?, dueDate = ?,
         status = ?, note = ?, imagePath = ?, notificationId = ?, updatedAt = ?
     WHERE id = ?`,
    [
      input.beneficiary,
      input.amount,
      input.chequeNumber,
      input.bank ?? null,
      input.issueDate,
      input.dueDate,
      status,
      input.note ?? null,
      input.imagePath ?? null,
      notificationId,
      updatedAt,
      id,
    ],
  );

  if (current.imagePath && current.imagePath !== input.imagePath) {
    await deleteChequeImageIfManaged(current.imagePath);
  }

  const updated = await getChequeById(id);

  if (!updated) {
    throw new Error('Failed to update cheque');
  }

  return updated;
}

export async function deleteCheque(id: number) {
  const cheque = await getChequeById(id);

  if (!cheque) {
    return;
  }

  await cancelChequeNotification(cheque.notificationId);
  await deleteChequeImageIfManaged(cheque.imagePath);
  const db = await getDatabase();
  await db.runAsync('DELETE FROM cheques WHERE id = ?', [id]);
}

export async function replaceAllCheques(items: Cheque[]) {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM cheques');

  for (const item of items) {
    await db.runAsync(
      `INSERT INTO cheques (
        id, beneficiary, amount, chequeNumber, bank, issueDate, dueDate,
        status, note, imagePath, notificationId, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.beneficiary,
        item.amount,
        item.chequeNumber,
        item.bank ?? null,
        item.issueDate,
        item.dueDate,
        normalizeStatus(item.status, item.dueDate),
        item.note ?? null,
        item.imagePath ?? null,
        item.notificationId ?? null,
        item.createdAt,
        item.updatedAt,
      ],
    );
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await syncExpiredCheques();
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const in48hIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const totals = (await db.getFirstAsync(
    `
      SELECT
        COUNT(*) AS totalCheques,
        SUM(CASE WHEN status = 'En cours' THEN 1 ELSE 0 END) AS activeCheques,
        SUM(CASE WHEN status = 'En cours' AND dueDate BETWEEN ? AND ? THEN 1 ELSE 0 END) AS dueSoonCheques,
        SUM(CASE WHEN status = 'Expiré' THEN 1 ELSE 0 END) AS expiredCheques,
        COALESCE(SUM(amount), 0) AS totalAmount
      FROM cheques
    `,
    [nowIso, in48hIso],
  )) as Record<string, unknown> | null;

  const totalAmount = Number(totals?.totalAmount ?? 0);

  return {
    totalCheques: Number(totals?.totalCheques ?? 0),
    activeCheques: Number(totals?.activeCheques ?? 0),
    dueSoonCheques: Number(totals?.dueSoonCheques ?? 0),
    expiredCheques: Number(totals?.expiredCheques ?? 0),
    totalAmount,
    totalAmountFormatted: formatAmount(totalAmount),
  };
}
