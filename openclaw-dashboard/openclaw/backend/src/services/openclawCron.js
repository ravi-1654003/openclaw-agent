import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const DEFAULT_ROOT = path.join(os.homedir(), '.openclaw');
const WORKSPACE_ROOT = (process.env.OPENCLAW_WORKSPACE || DEFAULT_ROOT).replace(/\/$/, '');
const CRON_FILE = path.join(WORKSPACE_ROOT, 'cron', 'jobs.json');

const readCronFile = async () => {
  try {
    const raw = await fs.readFile(CRON_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.jobs)) return parsed.jobs;
    return [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

export async function listCronJobs() {
  const jobs = await readCronFile();
  return jobs.map((job, index) => ({
    id: job.id || job.name || `job-${index}`,
    name: job.name || job.id || `Job ${index + 1}`,
    schedule: job.schedule || job.expr || job.every || 'n/a',
    status: job.enabled === false ? 'disabled' : 'active',
    raw: job
  }));
}
