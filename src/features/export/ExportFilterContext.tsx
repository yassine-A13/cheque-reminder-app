import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { ChequeFilterStatus } from '@/core/types/cheque';

type ExportFilters = { search: string; status: ChequeFilterStatus };
type ExportFilterContextValue = ExportFilters & { setFilters: (filters: ExportFilters) => void };

const ExportFilterContext = createContext<ExportFilterContextValue | null>(null);

export function ExportFilterProvider({ children }: PropsWithChildren) {
  const [filters, setFilters] = useState<ExportFilters>({ search: '', status: 'Tous' });
  const value = useMemo(() => ({ ...filters, setFilters }), [filters]);
  return <ExportFilterContext.Provider value={value}>{children}</ExportFilterContext.Provider>;
}

export function useExportFilters() {
  const context = useContext(ExportFilterContext);
  if (!context) throw new Error('useExportFilters doit être utilisé dans ExportFilterProvider.');
  return context;
}
