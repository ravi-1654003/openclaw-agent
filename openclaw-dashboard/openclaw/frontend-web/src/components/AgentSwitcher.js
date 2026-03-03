import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useAgentContext } from '../context/AgentContext';

const AgentSwitcher = ({ label = 'Active Agent', size = 'small', sx, resetOnMount = true }) => {
  const { agents, loading, selectedAgentId, setSelectedAgentId } = useAgentContext();
  const didSetDefaultRef = React.useRef(false);

  React.useEffect(() => {
    if (!resetOnMount || didSetDefaultRef.current) return;
    if (loading || !agents.length) return;
    const mainAgent = agents.find((agent) => agent.id === 'main');
    const fallback = mainAgent?.id || agents[0].id;
    setSelectedAgentId(fallback);
    didSetDefaultRef.current = true;
  }, [agents, loading, resetOnMount, setSelectedAgentId]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ...sx }}>
      <Typography variant="caption" color="text.secondary">
        {loading ? 'Loading agents…' : 'Select the agent to drive this view'}
      </Typography>
      <FormControl size={size} fullWidth>
        <InputLabel id="agent-switcher-label">{label}</InputLabel>
        <Select
          labelId="agent-switcher-label"
          value={selectedAgentId || ''}
          label={label}
          onChange={(event) => setSelectedAgentId(event.target.value)}
          disabled={loading || !agents.length}
        >
          {agents.map((agent) => (
            <MenuItem key={agent.id} value={agent.id}>
              {agent.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default AgentSwitcher;
