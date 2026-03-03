import React from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Grid, IconButton, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAgentContext } from '../context/AgentContext';

function Agents() {
  const { agents, loading, error, selectedAgentId, setSelectedAgentId, refreshAgents } = useAgentContext();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" fontWeight={700}>Agents</Typography>
        <IconButton aria-label="Refresh agents" onClick={refreshAgents} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading agents…</Typography>
        </Box>
      )}
      {error && (
        <Typography color="error">Unable to load agents</Typography>
      )}
      <Grid container spacing={2}>
        {agents.map((agent) => (
          <Grid item xs={12} md={6} lg={4} key={agent.id}>
            <Card
              variant={selectedAgentId === agent.id ? 'outlined' : undefined}
              sx={{
                borderColor: selectedAgentId === agent.id ? 'primary.main' : 'divider',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h6" fontWeight={700}>{agent.id}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sessions: {agent.sessionCount} • Skills: {agent.skillCount}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(agent.channels || []).map((channel) => (
                    <Chip key={channel} label={channel} size="small" />
                  ))}
                </Box>
                {agent.lastUpdated && (
                  <Typography variant="caption" color="text.secondary">
                    Updated: {new Date(agent.lastUpdated).toLocaleString()}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {!loading && !agents.length && (
        <Typography variant="body2" color="text.secondary">No agents detected in ~/.openclaw/agents yet.</Typography>
      )}
    </Box>
  );
}

export default Agents;
