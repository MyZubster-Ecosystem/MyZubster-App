import api from './api';

const BASE = '/skill-exchange';
const unwrap = response => response?.data || {};

export async function listSkillExchangeOffers(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.offeredSkill) params.offeredSkill = filters.offeredSkill;
  if (filters.requestedSkill) params.requestedSkill = filters.requestedSkill;
  if (filters.location) params.location = filters.location;
  return unwrap(await api.get(`${BASE}/offers`, { params })).offers || [];
}

export async function listMySkillExchanges() {
  return unwrap(await api.get(`${BASE}/mine`)).offers || [];
}

export async function createSkillExchangeOffer(payload) {
  return unwrap(await api.post(`${BASE}/offers`, payload)).offer;
}

export async function applyToSkillExchangeOffer(offerId, message = '') {
  return unwrap(await api.post(`${BASE}/offers/${encodeURIComponent(offerId)}/applications`, { message })).application;
}

export async function listOfferApplications(offerId) {
  return unwrap(await api.get(`${BASE}/offers/${encodeURIComponent(offerId)}/applications`)).applications || [];
}

export async function acceptSkillExchangeApplication(offerId, applicationId) {
  return unwrap(await api.post(`${BASE}/offers/${encodeURIComponent(offerId)}/applications/${encodeURIComponent(applicationId)}/accept`)).offer;
}

export async function confirmSkillExchangeStart(offerId) {
  return unwrap(await api.post(`${BASE}/offers/${encodeURIComponent(offerId)}/start-confirmation`));
}

export async function confirmSkillExchangeCompletion(offerId) {
  return unwrap(await api.post(`${BASE}/offers/${encodeURIComponent(offerId)}/completion-confirmation`));
}

export async function reviewSkillExchange(offerId, rating, comment = '') {
  return unwrap(await api.post(`${BASE}/offers/${encodeURIComponent(offerId)}/reviews`, { rating, comment })).review;
}
