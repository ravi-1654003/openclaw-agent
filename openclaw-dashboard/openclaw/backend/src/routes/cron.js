import express from 'express';
import { listCronJobs } from '../services/openclawCron.js';

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const jobs = await listCronJobs();
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

export default router;
