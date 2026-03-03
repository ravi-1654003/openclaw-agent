import express from 'express';
import {
  listAgentsSummary,
  getAgentDetail,
  getAgentSkills,
  getAgentSessions,
  getAgentSessionMessages
} from '../services/openclawAgents.js';

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const agents = await listAgentsSummary();
    res.json({ agents });
  } catch (error) {
    next(error);
  }
});

router.get('/:agentId', async (req, res, next) => {
  try {
    const detail = await getAgentDetail(req.params.agentId);
    res.json(detail);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Agent not found' });
    }
    next(error);
  }
});

router.get('/:agentId/skills', async (req, res, next) => {
  try {
    const skills = await getAgentSkills(req.params.agentId);
    res.json({ agentId: req.params.agentId, skills });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Agent not found' });
    }
    next(error);
  }
});

router.get('/:agentId/sessions', async (req, res, next) => {
  try {
    const { channel, chatType, limit } = req.query;
    const sessions = await getAgentSessions(req.params.agentId, {
      channel,
      chatType,
      limit: limit ? Number(limit) : undefined
    });
    res.json({ agentId: req.params.agentId, sessions });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Agent not found' });
    }
    next(error);
  }
});

router.get('/:agentId/sessions/:sessionId', async (req, res, next) => {
  try {
    const { limit } = req.query;
    const messages = await getAgentSessionMessages(req.params.agentId, req.params.sessionId, {
      limit: limit ? Number(limit) : undefined
    });
    res.json({
      agentId: req.params.agentId,
      sessionId: req.params.sessionId,
      messages
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Session not found' });
    }
    next(error);
  }
});

export default router;
