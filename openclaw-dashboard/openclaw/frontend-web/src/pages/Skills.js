import React from 'react';
import { Box, Chip, CircularProgress, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import AgentSwitcher from '../components/AgentSwitcher';
import { useAgentContext } from '../context/AgentContext';
import { useSkills } from '../hooks/useSkills';

function Skills() {
  const { selectedAgentId } = useAgentContext();
  const { skills, loading, error } = useSkills({ agentId: selectedAgentId, pollInterval: 8000 });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight={700}>Skills</Typography>
        <AgentSwitcher sx={{ maxWidth: 300 }} />
      </Box>
      <Divider />
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading skills…</Typography>
        </Box>
      )}
      {error && (
        <Typography color="error">Unable to load skills</Typography>
      )}
      <List dense sx={{ flex: 1, overflowY: 'auto', borderRadius: 2, bgcolor: '#fff', p: 2 }}>
        {skills.map((skill) => (
          <ListItem key={skill.name} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700}>{skill.name}</Typography>
              {skill.source && <Chip size="small" label={skill.source} />}
            </Box>
            {skill.description && (
              <ListItemText primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}>
                {skill.description}
              </ListItemText>
            )}
          </ListItem>
        ))}
        {!loading && !skills.length && (
          <Typography variant="body2" color="text.secondary">No skills detected for this agent yet.</Typography>
        )}
      </List>
    </Box>
  );
}

export default Skills;
