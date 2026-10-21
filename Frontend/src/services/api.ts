// Frontend/src/services/api.ts
import axios from 'axios';

// Ini akan selalu mengarah ke server Express Anda
const API_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor: Otomatis menyisipkan Token JWT ke setiap request (jika ada)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;