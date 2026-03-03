import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ sessions: [
    { id: 1, agent: 'Main Agent', started: '2024-02-22', status: 'active' },
    { id: 2, agent: 'JIRA Skillbot', started: '2024-02-21', status: 'inactive' }
  ]});
});

export default router;
