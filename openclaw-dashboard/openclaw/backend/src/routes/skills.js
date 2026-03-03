import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ skills: [
    { name: 'Sprint-Skill', status: 'enabled', description: 'JIRA Sprint/Project control' },
    { name: 'Weather', status: 'enabled', description: 'Shows weather forecast' }
  ] });
});

export default router;
