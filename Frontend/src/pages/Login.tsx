import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
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
      // Mengirim request ke Backend API yang Anda buat di index.js
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Jika sukses, simpan token dan data user ke localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Arahkan ke halaman utama Dashboard
        navigate('/');
      } else {
        // Jika gagal (email/password salah), tampilkan pesan error dari backend
        setErrorMsg(data.message || 'Gagal login, periksa kembali data Anda.');
      }
    } catch (error) {
      setErrorMsg('Tidak dapat terhubung ke server. Pastikan backend sudah menyala.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
        
        {/* Header Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-sky-500 rounded-xl flex justify-center items-center mb-4 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-7 h-7">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <path d="M3 9h18M9 21V9"></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Selamat Datang</h1>
          <p className="text-sm text-slate-500 mt-1">Silakan masuk ke akun Anda</p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center border border-red-100">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda" 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-400"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all placeholder-slate-400"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#005bb5] hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-colors mt-2 disabled:opacity-70"
          >
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

      </div>
    </div>
  );
}