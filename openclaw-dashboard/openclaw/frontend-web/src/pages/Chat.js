import React from 'react';
import { Box, Divider } from '@mui/material';
import ChatConsole from '../components/ChatConsole';
import AgentSwitcher from '../components/AgentSwitcher';
import AgentSkillPanel from '../components/AgentSkillPanel';
import { useAgentContext } from '../context/AgentContext';

function Chat() {
  const { selectedAgentId } = useAgentContext();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <AgentSwitcher sx={{ maxWidth: 320 }} />
      <Divider />
      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 3, minHeight: 0 }}>
          <ChatConsole agentId={selectedAgentId} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 260, minHeight: 0 }}>
          <AgentSkillPanel agentId={selectedAgentId} />
        </Box>
      </Box>
    </Box>
  );
}
export default Chat;
