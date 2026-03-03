import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Divider,
} from '@mui/material';
import { apiFetch } from '../utils/api';

const initialForm = { name: '', email: '', phone: '' };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      const data = await res.json();
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (error) {
      console.error('loadContacts failed', error);
      setStatus({ type: 'error', message: 'Unable to load saved contacts.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email';
    if (form.phone && !/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim())) nextErrors.phone = 'Enter a valid phone';
    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus({ type: 'error', message: 'Please fix the errors highlighted below.' });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await apiFetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors || {});
        throw new Error(data.error || 'Failed to save contact');
      }
      setForm(initialForm);
      setErrors({});
      setStatus({ type: 'success', message: 'Thanks! Your details have been saved.' });
      await loadContacts();
    } catch (error) {
      console.error('handleSubmit failed', error);
      setStatus({ type: 'error', message: error.message || 'Unable to save contact.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <Paper
        sx={{
          maxWidth: 760,
          mx: 'auto',
          my: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #fdf2fb 0%, #eef2ff 100%)',
          boxShadow: '0 25px 55px rgba(15, 23, 42, 0.12)',
        }}
      >
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Contact Us
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Leave your details and we’ll get back to you. The form saves submissions into the shared contacts list below.
        </Typography>

        {status && (
          <Alert severity={status.type} sx={{ mb: 3 }} onClose={() => setStatus(null)}>
            {status.message}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Full name"
              value={form.name}
              onChange={handleChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name}
              required
              fullWidth
            />
            <TextField
              label="Email address"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              error={Boolean(errors.email)}
              helperText={errors.email}
              required
              fullWidth
            />
            <TextField
              label="Phone number"
              value={form.phone}
              onChange={handleChange('phone')}
              error={Boolean(errors.phone)}
              helperText={errors.phone}
              fullWidth
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Saving…' : 'Submit'}
              </Button>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent contacts
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : contacts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No contacts saved yet.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Added</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id || contact.created_at}>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell>{contact.created_at ? new Date(contact.created_at).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
