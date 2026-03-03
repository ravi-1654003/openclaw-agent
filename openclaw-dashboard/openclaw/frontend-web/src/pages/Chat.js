import React from 'react';
import { Box, Divider } from '@mui/material';
import ChatConsole from '../components/ChatConsole';
import { useAgentContext } from '../context/AgentContext';

function Chat() {
  const { selectedAgentId } = useAgentContext();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <ChatConsole key={selectedAgentId} agentId={selectedAgentId} />
      </Box>
    </Box>
  );
}
export default Chat;
