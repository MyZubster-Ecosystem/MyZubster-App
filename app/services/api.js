import axios from 'axios';

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.10:3000/api';

const api = axios.create({
  baseURL: apiUrl.replace(/\/+$/, ''),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.log('Sessione scaduta');
    }
    return Promise.reject(error);
  }
);

export default api;
