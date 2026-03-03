import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextField, Paper, CircularProgress, IconButton, Typography, Button } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import KeyboardVoiceRoundedIcon from '@mui/icons-material/KeyboardVoiceRounded';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../utils/api';

const PAGE_SIZE = Number(process.env.REACT_APP_CHAT_PAGE_SIZE || 10);

const markdownComponents = {
  p: ({ children }) => (
    <Box component="p" sx={{ m: 0, '&:not(:last-child)': { mb: 1 } }}>
      {children}
    </Box>
  ),
  ul: ({ children }) => (
    <Box component="ul" sx={{ pl: 3, m: 0, '&:not(:last-child)': { mb: 1 } }}>
      {children}
    </Box>
  ),
  ol: ({ children }) => (
    <Box component="ol" sx={{ pl: 3, m: 0, '&:not(:last-child)': { mb: 1 } }}>
      {children}
    </Box>
  ),
  li: ({ children }) => (
    <Box component="li" sx={{ pl: 0.5, mb: 0.5 }}>
      {children}
    </Box>
  ),
  a: ({ href, children }) => (
    <Box component="a" href={href} target="_blank" rel="noreferrer" sx={{ color: '#1976d2', textDecoration: 'underline' }}>
      {children}
    </Box>
  ),
  code: ({ inline, children }) => {
    if (inline) {
      return (
        <Box component="code" sx={{ px: 0.6, py: 0.2, borderRadius: 1, backgroundColor: 'rgba(0,0,0,0.08)', fontFamily: 'Consolas, Menlo, monospace', fontSize: '0.85rem' }}>
          {children}
        </Box>
      );
    }
    return (
      <Box component="pre" sx={{ p: 1.5, borderRadius: 2, backgroundColor: '#0f172a', color: '#e2e8f0', overflowX: 'auto', fontFamily: 'Consolas, Menlo, monospace', fontSize: '0.85rem' }}>
        <code>{children}</code>
      </Box>
    );
  },
};

export default function ChatConsole({ agentId = 'main' }) {
  const callApi = useCallback((path, options) => apiFetch(path, options), []);

  const conversationCacheRef = useRef({});
  const messagesCacheRef = useRef({});
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const speechRecognitionRef = useRef(null);
  const [thinkingIdx, setThinkingIdx] = useState(null);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const messagesContainerRef = useRef(null);
  const endRef = useRef(null);
  const suppressAutoScrollRef = useRef(false);

  const setMessagesForAgent = useCallback((updater) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesCacheRef.current[agentId] = next;
      return next;
    });
  }, [agentId]);

  useEffect(() => {
    setConversationId(conversationCacheRef.current[agentId] || null);
    const cachedMessages = messagesCacheRef.current[agentId];
    if (cachedMessages) {
      setMessagesForAgent(cachedMessages);
      setInitialLoading(false);
    } else {
      setMessagesForAgent([]);
      setInitialLoading(true);
    }
    setHistoryCursor(null);
    setHasMore(true);
  }, [agentId, setMessagesForAgent]);

  const initializeSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current || typeof window === 'undefined') return speechRecognitionRef.current;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return null;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
    };
    speechRecognitionRef.current = recognition;
    return recognition;
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = initializeSpeechRecognition();
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      try {
        recognition.start();
        setListening(true);
      } catch (error) {
        console.error('Failed to start speech recognition', error);
      }
    }
  }, [initializeSpeechRecognition, listening]);
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior });
    });
  }, []);

  const fetchMessages = useCallback(async ({ cursor = null, prepend = false } = {}) => {
    setLoadingHistory(true);
    const params = new URLSearchParams({ limit: PAGE_SIZE.toString() });
    if (cursor) params.set('before', cursor);
    if (conversationId) params.set('conversationId', conversationId);
    if (agentId) params.set('agentId', agentId);

    const container = messagesContainerRef.current;
    const previousHeight = prepend && container ? container.scrollHeight : 0;
    const previousScrollTop = prepend && container ? container.scrollTop : 0;

    try {
      const res = await callApi(`/api/chat?${params.toString()}`);
      const data = await res.json();
      const nextConversationId = data.conversationId || null;
      conversationCacheRef.current[agentId] = nextConversationId;
      setConversationId(nextConversationId);
      setHasMore(Boolean(data.hasMore));
      setHistoryCursor(data.nextCursor || null);
      const chunk = data.messages || [];

      setMessagesForAgent(prev => (prepend ? [...chunk, ...prev] : chunk));

      if (prepend && container) {
        suppressAutoScrollRef.current = true;
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight + previousScrollTop;
      } else if (!prepend) {
        scrollToBottom('auto');
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
      if (!prepend) {
        setMessages([{ from: 'agent', text: '⚠️ Unable to load chat history.' }]);
      }
    } finally {
      setLoadingHistory(false);
      setInitialLoading(false);
    }
  }, [callApi, scrollToBottom, conversationId, agentId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (suppressAutoScrollRef.current) {
      suppressAutoScrollRef.current = false;
      return;
    }
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOlderMessages = useCallback(() => {
    if (initialLoading || !hasMore || !historyCursor || loadingHistory) return;
    fetchMessages({ cursor: historyCursor, prepend: true });
  }, [fetchMessages, hasMore, historyCursor, loadingHistory, initialLoading]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (container.scrollTop <= 60) {
        loadOlderMessages();
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loadOlderMessages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const textToSend = input;
    setLoading(true);
    setInput('');
    const thinkingMessage = { from: 'agent', thinking: true };
    setMessagesForAgent(prevMsgs => {
      const nextIdx = prevMsgs.length + 1;
      setThinkingIdx(nextIdx);
      return [...prevMsgs, { from: 'you', text: textToSend }, thinkingMessage];
    });
    try {
      const res = await callApi('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, conversationId, agentId }),
      });
      const data = await res.json();
      if (data.conversationId) {
        conversationCacheRef.current[agentId] = data.conversationId;
        setConversationId(data.conversationId);
      }
      setMessagesForAgent(prevMsgs => {
        const msgsCopy = [...prevMsgs];
        const idx = thinkingIdx ?? msgsCopy.findIndex(m => m.thinking);
        if (idx !== -1) msgsCopy[idx] = { from: 'agent', text: data.reply };
        else msgsCopy.push({ from: 'agent', text: data.reply });
        return msgsCopy;
      });
      scrollToBottom();
    } catch (e) {
      console.error('sendMessage failed', e);
      setMessagesForAgent(prevMsgs => {
        const msgsCopy = [...prevMsgs];
        const idx = thinkingIdx ?? msgsCopy.findIndex(m => m.thinking);
        const fallback = '⚠️ Error contacting OpenClaw agent.';
        if (idx !== -1) msgsCopy[idx] = { from: 'agent', text: fallback };
        else msgsCopy.push({ from: 'agent', text: fallback });
        return msgsCopy;
      });
    } finally {
      setLoading(false);
      setThinkingIdx(null);
    }
  };

  const onEnter = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessage = (msg, i) => {
    const isYou = msg.from === 'you';
    const bubbleStyles = {
      maxWidth: '70%',
      borderRadius: 4,
      px: 2,
      py: 1.5,
      backgroundColor: isYou ? '#E3F2FD' : 'rgba(148, 163, 184, 0.25)',
      color: '#0f172a',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
      border: isYou ? '1px solid rgba(25, 118, 210, 0.2)' : '1px solid rgba(148, 163, 184, 0.35)',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    };
    return (
      <Box key={`${msg.created_at || ''}-${i}`} sx={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start', mb: 2 }}>
        <Box sx={bubbleStyles}>
          {msg.thinking ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#475569' }}>
              <span>Thinking…</span>
              <CircularProgress size={14} sx={{ color: '#475569' }} />
            </Box>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {msg.text || ''}
            </ReactMarkdown>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex' }}>
      <Paper
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          maxWidth: '100%',
          mx: 'auto',
          p: 3,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            pr: 1.5,
            mr: -1,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              borderRadius: 999,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              borderRadius: 999,
            },
          }}
        >
          {hasMore && !initialLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={loadOlderMessages}
                disabled={loadingHistory}
              >
                {loadingHistory ? 'Loading previous messages…' : 'Load previous messages'}
              </Button>
            </Box>
          )}
          {loadingHistory && hasMore && initialLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
              <CircularProgress size={18} sx={{ color: '#475569' }} />
            </Box>
          )}
          {initialLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} sx={{ color: '#475569' }} />
            </Box>
          )}
          {messages.map((msg, i) => renderMessage(msg, i))}
          {!initialLoading && messages.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
              No messages yet. Say hi to start the conversation.
            </Typography>
          )}
          <div ref={endRef} />
        </Box>
        <Box
          component="form"
          sx={{
            display: 'flex',
            gap: 1.5,
            mt: 2,
            alignItems: 'center',
            flexWrap: 'nowrap',
          }}
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={4}
            placeholder="Type your message or use the mic..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onEnter}
            disabled={loading}
            size="small"
            sx={{ backgroundColor: '#fff', borderRadius: 2 }}
          />
          <IconButton
            onClick={toggleListening}
            sx={{
              backgroundColor: listening ? '#f97316' : '#fff',
              color: listening ? '#fff' : '#2563eb',
              width: 56,
              height: 56,
              border: '1px solid rgba(37, 99, 235, 0.4)',
              borderRadius: '50%',
              alignSelf: 'center',
              mr: 1,
              '&:hover': { backgroundColor: listening ? '#ea580c' : 'rgba(37, 99, 235, 0.08)' },
            }}
            aria-label="Toggle microphone"
          >
            <KeyboardVoiceRoundedIcon />
          </IconButton>
          <IconButton
            type="submit"
            disabled={loading || !input.trim()}
            sx={{
              backgroundColor: '#2563eb',
              color: '#fff',
              width: 68,
              height: 68,
              flexShrink: 0,
              borderRadius: '50%',
              alignSelf: 'center',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              '&:hover': { backgroundColor: '#1d4ed8' },
            }}
            aria-label="Send message"
          >
            <SendRoundedIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}
