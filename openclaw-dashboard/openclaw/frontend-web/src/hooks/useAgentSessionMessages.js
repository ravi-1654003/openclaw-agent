import { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';

export const useAgentSessionMessages = (agentId, sessionId, limit = 200) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!agentId || !sessionId) {
      setMessages([]);
      return undefined;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (limit) params.set('limit', String(limit));
        const res = await apiFetch(`/api/agents/${agentId}/sessions/${sessionId}?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load session messages');
        const data = await res.json();
        if (!cancelled) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [agentId, sessionId, limit]);

  return { messages, loading, error };
};
