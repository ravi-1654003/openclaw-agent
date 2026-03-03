const guessApiBase = () => {
  if (typeof window === 'undefined' || !window.location) return '';
  try {
    const current = new URL(window.location.href);
    const portNum = Number(current.port || (current.protocol === 'https:' ? 443 : 80));
    if (!Number.isNaN(portNum)) {
      if (portNum === 3000) return `${current.protocol}//${current.hostname}:4000`;
      if (portNum === 3001) return `${current.protocol}//${current.hostname}:4001`;
    }
    return '';
  } catch {
    return '';
  }
};

export const API_BASE = (process.env.REACT_APP_API_BASE || guessApiBase() || '').replace(/\/$/, '');

export const apiFetch = (path, options) => {
  const url = path.startsWith('http') ? path : `${API_BASE || ''}${path}`;
  return fetch(url, options);
};
