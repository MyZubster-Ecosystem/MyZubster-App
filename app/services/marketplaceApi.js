import axios from 'axios';

const { normalizeApiBaseUrl } = require('./apiUrlUtils');

const marketplaceApi = axios.create({
  baseURL: normalizeApiBaseUrl(
    process.env.EXPO_PUBLIC_MARKETPLACE_API_URL,
    'http://192.168.1.10:4000/api'
  ),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

marketplaceApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default marketplaceApi;
