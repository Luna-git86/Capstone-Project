// Frontend/src/pages/Register.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    namaLengkap: '',
    email: '',
    password: '',
    role: 'STAF', // Default
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      // Memanggil endpoint POST /api/auth/register di Backend
      await api.post('/auth/register', formData);
      setSuccess('Akun berhasil dibuat! Silakan login.');
      
      // Opsional: Langsung arahkan ke halaman login setelah 2 detik
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mendaftar. Silakan coba lagi.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Tambah Akun Baru</h2>
        
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700">Nama Lengkap</label>
            <input 
              type="text" name="namaLengkap" value={formData.namaLengkap} 
              onChange={handleChange} required
              className="w-full p-2 border rounded mt-1" 
            />
          </div>
          
          <div>
            <label className="block text-gray-700">Email</label>
            <input 
              type="email" name="email" value={formData.email} 
              onChange={handleChange} required
              className="w-full p-2 border rounded mt-1" 
            />
          </div>
          
          <div>
            <label className="block text-gray-700">Password</label>
            <input 
              type="password" name="password" value={formData.password} 
              onChange={handleChange} required
              className="w-full p-2 border rounded mt-1" 
            />
          </div>
          
          <div>
            <label className="block text-gray-700">Role</label>
            <select 
              name="role" value={formData.role} 
              onChange={handleChange}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="STAF">STAF</option>
              <option value="KOORDINATOR">KOORDINATOR</option>
              <option value="KADIV">KADIV</option>
              <option value="DIREKTUR">DIREKTUR</option>
              {/* Opsi ADMIN bisa disembunyikan agar tidak sembarang orang buat Admin */}
            </select>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Daftar Akun
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;