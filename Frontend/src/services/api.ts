// Frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // Pastikan URL ini mengarah ke endpoint backend Anda
});

// Interceptor REQUEST: Menyisipkan token ke setiap request API secara otomatis
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor RESPONSE: Menangkap error jika token ditolak/kedaluwarsa
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Jika Backend menolak akses (401), hapus token usang dan paksa login ulang
      localStorage.removeItem('token');
      localStorage.removeItem('userRole'); 
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;