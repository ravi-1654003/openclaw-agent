import express from 'express';
import { getAgentSkills, listAgentsSummary } from '../services/openclawAgents.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { agentId } = req.query;
    if (agentId) {
      const skills = await getAgentSkills(agentId);
      return res.json({ agentId, skills });
    }

    const summaries = await listAgentsSummary();
    const aggregation = new Map();
    for (const agent of summaries) {
      const skills = await getAgentSkills(agent.id);
      skills.forEach((skill) => {
        if (!aggregation.has(skill.name)) {
          aggregation.set(skill.name, {
            ...skill,
            agents: new Set([agent.id])
          });
        } else {
          aggregation.get(skill.name).agents.add(agent.id);
        }
      });
    }

    const skills = Array.from(aggregation.values()).map((skill) => ({
      ...skill,
      agents: Array.from(skill.agents)
    }));

    res.json({ skills });
  } catch (error) {
    next(error);
  }
});

export default router;
