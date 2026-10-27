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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', formData);
      const { token, user } = response.data;

      // Simpan identitas lengkap ke localStorage untuk UI dinamis
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.nama || user.email);
      if (user.divisiId) {
        localStorage.setItem('userDivisiId', String(user.divisiId));
      }

      // Arahkan langsung melalui RootRedirect ('/')
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal login. Periksa kembali email dan password Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Sistem E-Ticketing
          </h2>
          <p className="text-sm text-slate-500 mt-1">RSIA Qurrata A'yun Samarinda</p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Masukkan email resmi RSIA"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Masukkan password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition duration-200"
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          Pengelolaan Akun Internal:{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Registrasi Akun
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;