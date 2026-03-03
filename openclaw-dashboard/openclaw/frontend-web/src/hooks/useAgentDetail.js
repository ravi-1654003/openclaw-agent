import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useAgentDetail = (agentId, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(agentId));
  const [error, setError] = useState(null);
  const pollInterval = Number(options.pollInterval || 0);

  useEffect(() => {
    let cancelled = false;
    let timerId;
    if (!agentId) {
      setData(null);
      setLoading(false);
      return undefined;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const detailResponse = await apiFetch(`/api/agents/${agentId}`);
        if (!detailResponse.ok) throw new Error('Unable to load agent detail');
        const detail = await detailResponse.json();
        if (cancelled) return;
        setData(detail);
      } catch (err) {
        if (cancelled) return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollInterval) {
          timerId = setTimeout(fetchDetail, pollInterval);
        }
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [agentId, pollInterval]);

  return { data, loading, error };
};
