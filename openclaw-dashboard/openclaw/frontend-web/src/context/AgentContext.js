import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const AgentContext = createContext({
  agents: [],
  loading: true,
  error: null,
  selectedAgentId: 'main',
  setSelectedAgentId: () => {},
  refreshAgents: () => {}
});

const REFRESH_INTERVAL_MS = Number(process.env.REACT_APP_AGENT_REFRESH_MS || 8000);

export const AgentProvider = ({ children }) => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('main');

  const fetchAgents = useCallback(async () => {
    setError(null);
    try {
      const res = await apiFetch('/api/agents');
      if (!res.ok) throw new Error('Failed to load agents');
      const data = await res.json();
      const nextAgents = data.agents || [];
      setAgents(nextAgents);
      setSelectedAgentId((current) => {
        if (current && nextAgents.some((a) => a.id === current)) return current;
        return nextAgents[0]?.id || 'main';
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (!REFRESH_INTERVAL_MS) return undefined;
    const intervalId = setInterval(fetchAgents, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchAgents]);

  const value = useMemo(() => ({
    agents,
    loading,
    error,
    selectedAgentId,
    setSelectedAgentId,
    refreshAgents: fetchAgents
  }), [agents, loading, error, selectedAgentId, fetchAgents]);

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => useContext(AgentContext);
