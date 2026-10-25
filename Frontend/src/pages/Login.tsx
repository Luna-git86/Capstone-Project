// Frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      const role = String(user?.role || '').toUpperCase();

      localStorage.setItem('token', token);
      localStorage.setItem('userRole', role);
      localStorage.setItem('user', JSON.stringify(user));

      switch (role) {
        case 'STAF':
          navigate('/dashboard-staff', { replace: true });
          break;
        case 'KOORDINATOR':
          navigate('/dashboard-koordinator', { replace: true });
          break;
        case 'KADIV':
          navigate('/performa', { replace: true });
          break;
        case 'DIREKTUR':
          navigate('/dashboard-direktur', { replace: true });
          break;
        default:
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('user');
          setErrorMsg('Role akun tidak dikenali. Hubungi administrator.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Login gagal. Periksa kembali email dan password Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">E-Ticketing RSIA</h2>
        {errorMsg && <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{errorMsg}</div>}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Alamat Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-md border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Masukkan email Anda" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-md border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isLoading} className={`w-full rounded-md p-2.5 font-semibold text-white transition ${isLoading ? 'cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          Belum punya akun? <Link to="/register" className="text-blue-600 hover:underline">Daftar di sini</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
