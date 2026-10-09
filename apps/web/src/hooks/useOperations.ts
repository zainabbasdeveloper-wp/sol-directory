import { useCallback, useEffect, useState } from 'react';
import { getOperations, type OperationsData } from '../api/adminDashboardResources';
import { ApiError } from '../api/client';

/** Loads the live operations numbers and re-fetches them on a timer (paused while the browser tab is hidden). */
export function useOperations(intervalMs = 30_000) {
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    setRefreshing(true);
    getOperations()
      .then((d) => { setData(d); setError(''); })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load live data.'))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    reload();
    const id = setInterval(() => { if (!document.hidden) reload(); }, intervalMs);
    return () => clearInterval(id);
  }, [reload, intervalMs]);

  return { data, error, refreshing, reload };
}
