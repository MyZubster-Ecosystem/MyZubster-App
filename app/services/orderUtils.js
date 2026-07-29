export const PAYMENT_WINDOW_MINUTES = 15;

export const ORDER_TOKENS = [
  {
    symbol: 'ZUB',
    name: 'MyZubster token',
    unitPriceXmr: 0.015,
  },
  {
    symbol: 'SERVICE',
    name: 'Service credit',
    unitPriceXmr: 0.05,
  },
  {
    symbol: 'ESCROW',
    name: 'Escrow deposit',
    unitPriceXmr: 0.1,
  },
];

const STATUS_MAP = {
  awaiting_payment: 'pending',
  created: 'pending',
  new: 'pending',
  open: 'pending',
  payment_pending: 'pending',
  pending: 'pending',
  confirming: 'processing',
  in_progress: 'processing',
  processing: 'processing',
  paid: 'completed',
  complete: 'completed',
  completed: 'completed',
  confirmed: 'completed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  failed: 'cancelled',
  timeout: 'expired',
  expired: 'expired',
};

export function parseAmount(value, fallback = 0) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : fallback;
}

export function normalizeOrderStatus(status) {
  if (!status) {
    return 'pending';
  }

  const normalized = String(status).trim().toLowerCase();
  return STATUS_MAP[normalized] || normalized;
}

export function calculateOrderTotals(token, amount) {
  const tokenAmount = Math.max(parseAmount(amount), 0);
  const unitPriceXmr = Math.max(parseAmount(token?.unitPriceXmr), 0);
  const moneroAmount = tokenAmount * unitPriceXmr;

  return {
    tokenAmount,
    unitPriceXmr,
    moneroAmount,
  };
}

export function formatXmr(value) {
  return parseAmount(value).toFixed(8);
}

export function buildMoneroPaymentUri(address, amount, label = 'MyZubster order') {
  if (!address) {
    return '';
  }

  const params = [];
  const xmrAmount = parseAmount(amount);

  if (xmrAmount > 0) {
    params.push(`amount=${encodeURIComponent(formatXmr(xmrAmount))}`);
  }

  if (label) {
    params.push(`tx_description=${encodeURIComponent(label)}`);
  }

  const query = params.join('&');
  return `monero:${address}${query ? `?${query}` : ''}`;
}

export function getPaymentExpiry(createdAt = new Date(), minutes = PAYMENT_WINDOW_MINUTES) {
  const createdTime = new Date(createdAt).getTime();
  const baseTime = Number.isFinite(createdTime) ? createdTime : Date.now();
  return new Date(baseTime + minutes * 60 * 1000).toISOString();
}

export function getRemainingPaymentSeconds(order, now = Date.now()) {
  const expiresAt = order?.paymentExpiresAt || order?.expiresAt;

  if (!expiresAt) {
    return 0;
  }

  const expiryTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiryTime)) {
    return 0;
  }

  return Math.max(0, Math.ceil((expiryTime - now) / 1000));
}

export function formatCountdown(seconds) {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function normalizeOrder(rawOrder = {}, fallback = {}) {
  const source = rawOrder?.order || rawOrder?.data || rawOrder || {};
  const payment = source.payment || source.moneroPayment || {};
  const token = source.token || fallback.token || {};
  const createdAt = source.createdAt || source.created_at || fallback.createdAt || new Date().toISOString();
  const paymentExpiresAt =
    source.paymentExpiresAt ||
    source.payment_expires_at ||
    source.expiresAt ||
    source.expires_at ||
    payment.expiresAt ||
    fallback.paymentExpiresAt ||
    getPaymentExpiry(createdAt);

  return {
    ...fallback,
    ...source,
    id: source.id || source.orderId || source.order_id || fallback.id,
    tokenSymbol: source.tokenSymbol || source.token_symbol || token.symbol || fallback.tokenSymbol,
    tokenName: source.tokenName || source.token_name || token.name || fallback.tokenName,
    tokenAmount: parseAmount(
      source.tokenAmount ?? source.token_amount ?? source.quantity ?? fallback.tokenAmount,
      fallback.tokenAmount || 0
    ),
    unitPriceXmr: parseAmount(
      source.unitPriceXmr ?? source.unit_price_xmr ?? source.pricePerToken ?? fallback.unitPriceXmr,
      fallback.unitPriceXmr || 0
    ),
    amount: parseAmount(source.amount ?? source.totalPrice ?? fallback.amount, fallback.amount || 0),
    currency: source.currency || fallback.currency || 'XMR',
    moneroAmount: parseAmount(
      source.moneroAmount ?? source.xmrAmount ?? source.xmr_amount ?? payment.amount ?? fallback.moneroAmount,
      fallback.moneroAmount || 0
    ),
    moneroAddress:
      source.moneroAddress ||
      source.monero_address ||
      source.subaddress ||
      source.paymentAddress ||
      source.payment_address ||
      payment.address ||
      fallback.moneroAddress,
    confirmations: parseAmount(
      source.confirmations ?? payment.confirmations ?? fallback.confirmations,
      fallback.confirmations || 0
    ),
    amountReceived: parseAmount(
      source.amountReceived ?? source.amount_received ?? payment.amountReceived ?? fallback.amountReceived,
      fallback.amountReceived || 0
    ),
    status: normalizeOrderStatus(source.status || source.paymentStatus || payment.status || fallback.status),
    createdAt,
    updatedAt: source.updatedAt || source.updated_at || fallback.updatedAt,
    paymentExpiresAt,
  };
}

export function normalizeOrderList(responseData = []) {
  const source =
    responseData?.orders ||
    responseData?.data?.orders ||
    responseData?.data ||
    responseData?.items ||
    responseData;

  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => normalizeOrder(item));
}
