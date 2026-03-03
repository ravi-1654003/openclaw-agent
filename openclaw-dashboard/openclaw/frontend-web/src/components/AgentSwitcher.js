import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useAgentContext } from '../context/AgentContext';

const AgentSwitcher = ({ label = 'Active Agent', size = 'small', sx }) => {
  const { agents, loading, selectedAgentId, setSelectedAgentId } = useAgentContext();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, ...sx }}>
      <FormControl size={size} fullWidth>
        <InputLabel
          id="agent-switcher-label"
          sx={{ color: '#fff', '&.Mui-focused': { color: '#fff' } }}
        >
          {label}
        </InputLabel>
        <Select
          labelId="agent-switcher-label"
          value={selectedAgentId || ''}
          label={label}
          onChange={(event) => setSelectedAgentId(event.target.value)}
          disabled={loading || !agents.length}
          sx={{
            color: '#fff',
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
            '& .MuiSvgIcon-root': { color: '#fff' }
          }}
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
