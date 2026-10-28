// Frontend/src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { getDashboardByRole } from '../App';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    noHp: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userDivisiId');
  }, []);

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

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.nama || user.noHp);
      if (user.divisiId) {
        localStorage.setItem('userDivisiId', String(user.divisiId));
      }

      const targetDashboard = getDashboardByRole(user.role);
      navigate(targetDashboard, { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Gagal login. Periksa kembali Nomor HP dan password Anda.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
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
            <label htmlFor="noHp" className="block text-sm font-medium text-slate-700 mb-1">
              Nomor HP / WhatsApp
            </label>
            <input
              type="text"
              id="noHp"
              name="noHp"
              value={formData.noHp}
              onChange={handleChange}
              required
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Contoh: 081100000001"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotInfo(!showForgotInfo)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Lupa Password?
              </button>
            </div>
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

          {showForgotInfo && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Prosedur Reset Password Internal:</p>
              <p>
                Sesuai kebijakan keamanan RBAC RSIA Qurrata A'yun, silakan hubungi <strong>Admin Sistem IT (081100000001)</strong> untuk melakukan reset password akun Anda melalui Panel Manajemen Akun.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition duration-200"
          >
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          Akses Terbatas Internal • Pendaftaran & Reset Password dikelola oleh Admin Sistem IT
        </div>
      </div>
    </div>
  );
};

export default Login;