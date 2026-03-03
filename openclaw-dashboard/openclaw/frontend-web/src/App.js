import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Chat from './pages/Chat';
import Agents from './pages/Agents';
import Skills from './pages/Skills';
import CronJobs from './pages/CronJobs';
import Sessions from './pages/Sessions';
import Contact from './pages/Contact';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { AgentProvider } from './context/AgentContext';

const menuItems = [
  { label: 'Chat', path: '/' },
  { label: 'Agents', path: '/agents' },
  { label: 'Skills', path: '/skills' },
  { label: 'Cron Jobs', path: '/cron' },
  { label: 'Sessions', path: '/sessions' },
  { label: 'Contact Us', path: '/contact' },
];

const SideMenu = () => {
  const location = useLocation();
  return (
    <Box
      component="nav"
      sx={{
        width: { xs: 220, md: '15%' },
        minWidth: 220,
        maxWidth: 320,
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        borderRadius: 3,
        height: '100%',
      }}
    >
      {menuItems.map(item => {
        const active = location.pathname === item.path;
        return (
          <Button
            key={item.path}
            component={Link}
            to={item.path}
            variant={active ? 'contained' : 'outlined'}
            color={active ? 'primary' : 'inherit'}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              fontWeight: 600,
              borderColor: 'rgba(226, 232, 240, 0.2)',
              color: active ? '#fff' : '#e2e8f0',
              backgroundColor: active ? 'rgba(59,130,246,0.35)' : 'transparent',
              '&:hover': {
                backgroundColor: active ? 'rgba(59,130,246,0.45)' : 'rgba(226, 232, 240, 0.08)',
              },
            }}
            fullWidth
          >
            {item.label}
          </Button>
        );
      })}
    </Box>
  );
};

function App() {
  return (
    <AgentProvider>
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          <AppBar position="static" elevation={0} sx={{ backgroundColor: '#111827' }}>
            <Toolbar sx={{ minHeight: 64 }}>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
                Axcel.ai Dashboard
              </Typography>
            </Toolbar>
          </AppBar>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              px: 2,
              py: 2,
              backgroundColor: '#e2e8f0',
              flex: 1,
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <SideMenu />
            <Box
              sx={{
                flexGrow: 1,
                width: '85%',
                height: '100%',
                backgroundColor: 'transparent',
                overflow: 'hidden',
              }}
            >
              <Routes>
                <Route path="/" element={<Chat />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/skills" element={<Skills />} />
                <Route path="/cron" element={<CronJobs />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </Router>
    </AgentProvider>
  );
}
export default App;
