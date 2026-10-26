import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { useAuth } from '../../shared/context/AuthContext';
import { toast } from '../../shared/context/ToastContext';
import {
  User, Lock, Save, Eye, EyeOff,
  Mail, Phone, MapPin, Shield, Building2
} from 'lucide-react';

export const AdminProfilePage: React.FC = () => {
  const { user } = useAuth();

  const [profileForm, setProfileForm] = useState({
    nama: '', email: '', telp: '', alamat: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', new_password_confirmation: ''
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const baseEndpoint = user?.role === 'guru' ? '/teacher/profile' : '/admin/profile';

  const fetchProfile = async () => {
    try {
      const res = await apiClient.get(baseEndpoint);
      setProfileData(res.data);
      setProfileForm({
        nama: res.data.nama || '',
        email: res.data.email || '',
        telp: res.data.telp || '',
        alamat: res.data.alamat || '',
      });
    } catch {
      // Use fallback from auth context
      setProfileForm({
        nama: user?.name || '',
        email: user?.email || '',
        telp: '',
        alamat: '',
      });
    }
  };

  useEffect(() => { fetchProfile(); }, [baseEndpoint]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await apiClient.put(baseEndpoint, profileForm);
      toast.success('Profil berhasil diperbarui!');
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password.length < 8) {
      toast.error('Password baru minimal 8 karakter.');
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      toast.error('Konfirmasi password baru tidak cocok.');
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      toast.error('Password baru tidak boleh sama dengan password lama.');
      return;
    }
    setPwLoading(true);
    try {
      await apiClient.post(`${baseEndpoint}/change-password`, passwordForm);
      toast.success('Password berhasil diubah!');
      setPasswordForm({ current_password: '', new_password: '', new_password_confirmation: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengubah password.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Profil & Keamanan</h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Kelola informasi profil dan keamanan akun Anda</p>
      </div>

      {/* Profile Card */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-200/60 dark:border-white/5">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-500/30">
            {profileForm.nama?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{profileForm.nama || user?.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                user?.role === 'super_admin'
                  ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
                  : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
              }`}>
                <Shield className="h-3 w-3 inline mr-1" />
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin Instansi'}
              </span>
              {profileData?.instansi && (
                <span className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {profileData.instansi}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 font-mono">@{profileData?.username || user?.username}</p>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" /> Edit Profil
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <User className="h-3.5 w-3.5" /> Nama Lengkap
              </label>
              <input
                type="text"
                value={profileForm.nama}
                onChange={e => setProfileForm({...profileForm, nama: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <Phone className="h-3.5 w-3.5" /> No. Telepon
              </label>
              <input
                type="text"
                value={profileForm.telp}
                onChange={e => setProfileForm({...profileForm, telp: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5" /> Alamat
              </label>
              <input
                type="text"
                value={profileForm.alamat}
                onChange={e => setProfileForm({...profileForm, alamat: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-500" /> Ganti Password
        </h3>
        <p className="text-xs text-slate-500 dark:text-gray-400">Untuk keamanan, masukkan password lama Anda terlebih dahulu sebelum mengubah ke password baru.</p>

        <div className="space-y-3 max-w-md">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-1.5 block">Password Lama</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})}
                className="w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              <button onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-1.5 block">Password Baru</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={passwordForm.new_password}
                onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})}
                className="w-full px-4 py-3 pr-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
              <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-gray-400 mb-1.5 block">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.new_password_confirmation}
              onChange={e => setPasswordForm({...passwordForm, new_password_confirmation: e.target.value})}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleChangePassword}
            disabled={pwLoading || !passwordForm.current_password || !passwordForm.new_password}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-600/30 transition"
          >
            <Lock className="h-4 w-4" />
            <span>{pwLoading ? 'Memproses...' : 'Ubah Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default AdminProfilePage;
