import React from 'react';
import { Box, Chip, CircularProgress, Paper, Typography } from '@mui/material';
import { useAgentDetail } from '../hooks/useAgentDetail';

const AgentSkillPanel = ({ agentId, pollInterval = 8000 }) => {
  const { data, loading, error } = useAgentDetail(agentId, { pollInterval });
  const skills = data?.skills || [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffe4e6 100%)',
        height: '100%',
        overflowY: 'auto'
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Skills ({skills.length})
      </Typography>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading skills…</Typography>
        </Box>
      )}
      {error && (
        <Typography variant="body2" color="error">
          Unable to load skills
        </Typography>
      )}
      {!loading && !skills.length && (
        <Typography variant="body2" color="text.secondary">
          No skills detected for this agent yet.
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {skills.map((skill) => (
          <Box key={skill.name} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={skill.name} color="primary" size="small" />
              {skill.primaryEnv && (
                <Chip label={skill.primaryEnv} variant="outlined" size="small" />
              )}
            </Box>
            {skill.description && (
              <Typography variant="body2" color="text.secondary">
                {skill.description}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default AgentSkillPanel;
