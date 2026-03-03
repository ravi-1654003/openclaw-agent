import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { useAgentContext } from '../context/AgentContext';

const AgentSwitcher = ({ label = 'Active Agent', size = 'small', sx }) => {
  const { agents, loading, selectedAgentId, setSelectedAgentId } = useAgentContext();

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
