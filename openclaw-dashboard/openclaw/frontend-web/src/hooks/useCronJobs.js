import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useCronJobs = (pollInterval = 10000) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/api/cron');
        if (!res.ok) throw new Error('Unable to load cron jobs');
        const data = await res.json();
        if (!cancelled) setJobs(data.jobs || []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollInterval) {
          timerId = setTimeout(fetchJobs, pollInterval);
        }
      }
    };

    fetchJobs();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [pollInterval]);

  return { jobs, loading, error };
};
