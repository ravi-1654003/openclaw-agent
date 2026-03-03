import React from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { useAgentContext } from '../context/AgentContext';
import AgentSkillPanel from '../components/AgentSkillPanel';

function Skills() {
  const { selectedAgentId } = useAgentContext();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>Skills</Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <AgentSkillPanel agentId={selectedAgentId} pollInterval={8000} />
      </Box>
    </Box>
  );
}

export default Skills;
