// Frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Memanggil endpoint POST /api/auth/login di Backend
      const response = await api.post('/auth/login', formData);
      const { token, user } = response.data;

      // Simpan Token dan Role ke localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);

      setSuccess('Login berhasil! Mengarahkan...');

      // Arahkan pengguna berdasarkan Role-nya
      setTimeout(() => {
        if (user.role === 'ADMIN' || user.role === 'DIREKTUR') {
          navigate('/dashboard'); // Arahkan Admin/Direktur ke dashboard utama
        } else {
          navigate('/dashboard-staff'); // Arahkan Staf/Kadiv/Koordinator ke dashboard staf
        }
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal login. Periksa email dan password.'
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Sistem E-Ticketing
          </h2>
          <p className="text-gray-600">RSIA Qurrata A'yun Samarinda</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan email Anda"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Masukkan password Anda"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition duration-200"
          >
            Masuk
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Belum punya akun?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;