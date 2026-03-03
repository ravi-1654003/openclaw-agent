import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useSkills = ({ agentId, pollInterval = 8000 } = {}) => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId;

    const fetchSkills = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (agentId) params.set('agentId', agentId);
        const res = await apiFetch(`/api/skills?${params.toString()}`);
        if (!res.ok) throw new Error('Unable to load skills');
        const data = await res.json();
        const payload = data.skills || data?.skills || [];
        if (!cancelled) setSkills(payload);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && pollInterval) {
          timerId = setTimeout(fetchSkills, pollInterval);
        }
      }
    };

    fetchSkills();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [agentId, pollInterval]);

  return { skills, loading, error };
};
