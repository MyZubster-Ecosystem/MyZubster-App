const MAX_RECONNECT = 3;
const BASE_DELAY = 1000;

function extractApiHost(apiUrl) {
  if (!apiUrl) return null;
  let trimmed = apiUrl.replace(/\/$/, '');
  if (trimmed.endsWith('/api')) trimmed = trimmed.slice(0, -4);
  if (trimmed.startsWith('http://')) return trimmed.slice('http://'.length);
  if (trimmed.startsWith('https://')) return trimmed.slice('https://'.length);
  return trimmed;
}

export function deriveWsUrl(apiUrl, orderId) {
  const host = extractApiHost(apiUrl);
  if (!host) throw new Error('Invalid API_URL for WebSocket');
  const wsHost = host.replace(/^https?:\/\//, '');
  const path = `/orders/${encodeURIComponent(orderId)}`;
  const secure = apiUrl.startsWith('https://') ? 'wss' : 'ws';
  return `${secure}://${wsHost}${path}`;
}

export function createOrderSocket({ apiUrl, orderId, onMessage, onError, onClose }) {
  let ws = null;
  let reconnectAttempts = 0;
  let manualClose = false;
  let timeout = null;

  const connect = () => {
    if (manualClose) return;
    if (typeof WebSocket === 'undefined') {
      if (onError) onError(new Error('WebSocket is not available'));
      return;
    }
    try {
      ws = new WebSocket(deriveWsUrl(apiUrl, orderId));
    } catch (err) {
      if (onError) onError(err);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (onMessage) onMessage(data);
      } catch {
        if (onMessage) onMessage(event.data);
      }
    };

    ws.onerror = (err) => {
      if (onError) onError(err);
    };

    ws.onclose = (event) => {
      if (onClose) onClose(event);
      if (!manualClose) scheduleReconnect();
    };
  };

  const scheduleReconnect = () => {
    if (manualClose) return;
    if (reconnectAttempts >= MAX_RECONNECT) return;
    const delay = BASE_DELAY * Math.pow(2, reconnectAttempts);
    reconnectAttempts += 1;
    timeout = setTimeout(connect, delay);
  };

  const close = () => {
    manualClose = true;
    if (timeout) clearTimeout(timeout);
    if (ws) ws.close();
  };

  connect();

  return {
    close,
    get readyState() {
      return ws ? ws.readyState : 0;
    },
  };
}
