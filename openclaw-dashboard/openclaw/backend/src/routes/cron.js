import express from 'express';
const router = express.Router();

router.get('/', (_req, res) => {
  res.json({ cronjobs: [
    { id: 1, name: 'Daily Report', schedule: '0 9 * * *', status: 'active' },
    { id: 2, name: 'Sprint Reminder', schedule: '0 12 * * 1', status: 'active' }
  ] });
});

export default router;
