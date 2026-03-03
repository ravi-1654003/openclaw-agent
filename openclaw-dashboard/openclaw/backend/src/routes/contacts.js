import express from 'express';
import { randomUUID } from 'crypto';
import { insertContact, listContacts } from '../db/contacts.js';
import { isDatabaseConfigured } from '../db/client.js';

const router = express.Router();
const inMemoryContacts = [];

const sanitize = (value) => (typeof value === 'string' ? value.trim() : '');

const validatePayload = ({ name, email, phone }) => {
  const errors = {};
  if (!name) errors.name = 'Name is required';
  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
    errors.phone = 'Enter a valid phone number';
  }
  return errors;
};

router.get('/', async (req, res) => {
  const limit = Number(req.query.limit) || 100;
  if (!isDatabaseConfigured()) {
    return res.json({ contacts: inMemoryContacts.slice(0, limit) });
  }
  try {
    const contacts = await listContacts(limit);
    res.json({ contacts });
  } catch (error) {
    console.error('[contacts:get] failed', error);
    res.status(500).json({ error: 'Unable to fetch contacts' });
  }
});

router.post('/', async (req, res) => {
  const payload = {
    name: sanitize(req.body?.name),
    email: sanitize(req.body?.email).toLowerCase(),
    phone: sanitize(req.body?.phone || '') || null,
  };

  const errors = validatePayload(payload);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: 'Invalid contact details', errors });
  }

  try {
    if (isDatabaseConfigured()) {
      const saved = await insertContact(payload);
      return res.status(201).json({ contact: saved });
    }
    const contact = { ...payload, id: randomUUID(), created_at: new Date().toISOString() };
    inMemoryContacts.unshift(contact);
    return res.status(201).json({ contact });
  } catch (error) {
    console.error('[contacts:post] failed', error);
    res.status(500).json({ error: 'Unable to save contact' });
  }
});

export default router;
