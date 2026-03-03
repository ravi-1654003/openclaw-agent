import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ agents: [
    { id: 1, name: 'Main Agent', status: 'online' },
    { id: 2, name: 'JIRA Skillbot', status: 'online' }
  ] });
});

export default router;
