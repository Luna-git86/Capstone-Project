// Frontend/src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Sparkles, Lock, Phone } from 'lucide-react';
import api from '../services/api';
import { getDashboardByRole } from '../App';
import { setAuthSession } from '../utils/authStorage';

interface SuccessData {
  nama: string;
  role: string;
  divisi?: string | null;
  targetDashboard: string;
}

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    noHp: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showForgotInfo, setShowForgotInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState<SuccessData | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.clear();
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

      setAuthSession({
        token,
        userId: user.id,
        userRole: user.role,
        userName: user.nama || user.noHp,
        telegramLinked: user.telegramLinked,
        userDivisiId: user.divisiId,
        userDivisiNama: user.namaDivisi || null,
      });

      const target = getDashboardByRole(user.role);

      // Tampilkan animasi transisi sukses login yang memanjakan mata
      setLoginSuccess({
        nama: user.nama || user.noHp,
        role: user.role,
        divisi: user.namaDivisi || null,
        targetDashboard: target,
      });

      // Tunggu 900ms agar animasi sukses dinikmati oleh user, lalu alihkan ke dashboard
      setTimeout(() => {
        navigate(target, { replace: true });
      }, 950);
    } catch (err: any) {
      setError(
        !err.response
          ? 'Tidak dapat terhubung ke server backend. Pastikan server Backend (port 3000) dan database PostgreSQL sudah berjalan.'
          : (err.response?.data?.message || 'Gagal login. Periksa kembali Nomor HP dan password Anda.')
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-brand-deep lg:bg-clinical-bg lg:flex lg:items-center lg:justify-center lg:p-8 relative overflow-hidden">
      {/* Modal / Overlay Animasi Sukses Login */}
      {loginSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-sm w-full shadow-2xl text-center animate-success-pop space-y-4 border border-slate-100">
            {/* Lingkaran Glowing Centang Hijau */}
            <div className="w-20 h-20 rounded-full bg-[#0f5c43] text-white flex items-center justify-center mx-auto animate-pulse-glow shadow-xl shadow-[#0f5c43]/30">
              <CheckCircle2 className="w-10 h-10 animate-in zoom-in-75 duration-300" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Otentikasi Berhasil!
              </h2>
              <p className="text-sm font-semibold text-slate-600">
                Selamat datang kembali, <span className="text-[#0f5c43] font-extrabold">{loginSuccess.nama}</span>
              </p>
            </div>

            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-[#0f5c43] border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-[#f47a45]" />
                <span>{loginSuccess.role}</span>
                {loginSuccess.divisi && <span>• {loginSuccess.divisi}</span>}
              </span>
            </div>

            {/* Spinner Progress Halus */}
            <div className="pt-4 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
              <div className="w-4 h-4 border-2 border-[#0f5c43] border-t-transparent rounded-full animate-spin" />
              <span>Menyiapkan ruang kerja Anda...</span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full lg:max-w-5xl lg:grid lg:grid-cols-2 lg:rounded-[2rem] lg:overflow-hidden lg:shadow-2xl lg:shadow-brand-deep/20 bg-white">
        {/* Panel Hero: atas pada mobile, kiri pada desktop */}
        <div className="relative bg-brand-deep text-white overflow-hidden h-[38dvh] min-h-[240px] lg:h-auto lg:min-h-[600px] flex flex-col">
          <div aria-hidden="true" className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-brand-mint/25 blur-2xl" />
          <div aria-hidden="true" className="absolute bottom-10 -left-16 w-48 h-48 rounded-full bg-white/5" />

          <div className="relative z-10 flex items-center gap-3 p-5 lg:p-8">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center font-extrabold text-sm">
              RS
            </div>
            <div>
              <p className="font-extrabold leading-tight">E-Ticketing RSIA</p>
              <p className="text-xs text-white/70">{"Qurrata A'yun Samarinda"}</p>
            </div>
          </div>

          <img
            src="/images/hero-clinic.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 mx-auto h-[78%] lg:h-[62%] w-auto object-contain object-bottom lg:bottom-28 [mask-image:radial-gradient(closest-side,black_72%,transparent)]"
          />

          <div className="relative z-10 mt-auto hidden lg:block p-8">
            <h2 className="text-3xl font-extrabold leading-tight text-balance">
              Kelola tugas & laporan rumah sakit dengan mudah
            </h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed max-w-sm">
              Pantau penugasan, eskalasi tiket, dan analitik kunjungan dalam satu dasbor terpadu.
            </p>
          </div>
        </div>

        {/* Panel Form: lembar putih membulat pada mobile */}
        <div className="relative -mt-8 lg:mt-0 rounded-t-[2rem] lg:rounded-none bg-white px-6 pt-8 pb-10 sm:px-10 lg:p-12 flex flex-col justify-center min-h-[calc(62dvh+2rem)] lg:min-h-0">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-clinical-ink">
              Selamat Datang
            </h1>
            <p className="text-sm text-slate-400 mt-1">Masuk ke Sistem E-Ticketing RSIA</p>
          </div>

          {error && (
            <div role="alert" className="mb-4 p-3.5 text-sm text-rose-700 bg-rose-50 rounded-2xl border border-rose-200 animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="noHp" className="block text-sm font-bold text-clinical-ink mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Nomor HP / WhatsApp</span>
              </label>
              <input
                type="text"
                id="noHp"
                name="noHp"
                value={formData.noHp}
                onChange={handleChange}
                required
                inputMode="tel"
                autoComplete="username"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-clinical-ink placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f5c43] focus:ring-4 focus:ring-emerald-100 transition"
                placeholder="Contoh: 081100000001"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-bold text-clinical-ink flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotInfo(!showForgotInfo)}
                  className="text-xs font-bold text-brand-orange hover:underline"
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
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-clinical-ink placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0f5c43] focus:ring-4 focus:ring-emerald-100 transition"
                placeholder="Masukkan password"
              />
            </div>

            {showForgotInfo && (
              <div className="p-4 bg-brand-orange-soft/60 rounded-2xl text-xs text-orange-900 space-y-1 animate-in fade-in duration-200 border border-orange-200">
                <p className="font-bold">Prosedur Reset Password Internal:</p>
                <p className="leading-relaxed">
                  {"Sesuai kebijakan keamanan RBAC RSIA Qurrata A'yun, silakan hubungi "}<strong>Admin Sistem IT (081100000001)</strong> untuk melakukan reset password akun Anda melalui Panel Manajemen Akun.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || Boolean(loginSuccess)}
              className="w-full py-3.5 px-4 bg-[#0f5c43] hover:bg-[#0c4935] disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-[#0f5c43]/20 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk ke Sistem</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed">
            {'Akses Terbatas Internal \u2022 Pendaftaran & Reset Password dikelola oleh Admin Sistem IT'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
