import React from 'react';
import { Box, CircularProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import { useCronJobs } from '../hooks/useCronJobs';

function CronJobs() {
  const { jobs, loading, error } = useCronJobs(10000);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Typography variant="h5" fontWeight={700}>Cron Jobs</Typography>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading scheduled tasks…</Typography>
        </Box>
      )}
      {error && (
        <Typography color="error">Unable to load cron jobs</Typography>
      )}
      <List sx={{ flex: 1, overflowY: 'auto', borderRadius: 2, bgcolor: '#fff', p: 2 }}>
        {jobs.map((job) => (
          <ListItem key={job.id} divider>
            <ListItemText
              primary={`${job.name} (${job.status})`}
              secondary={`Schedule: ${job.schedule}`}
            />
          </ListItem>
        ))}
        {!loading && !jobs.length && (
          <Typography variant="body2" color="text.secondary">No cron jobs configured.</Typography>
        )}
      </List>
    </Box>
  );
}

export default CronJobs;
