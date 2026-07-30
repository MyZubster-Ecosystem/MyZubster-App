const normalizeApiBaseUrl = (value, fallback) => {
  const candidate = String(value ?? '').trim() || String(fallback ?? '').trim();
  return candidate.replace(/\/+$/, '');
};

module.exports = { normalizeApiBaseUrl };
