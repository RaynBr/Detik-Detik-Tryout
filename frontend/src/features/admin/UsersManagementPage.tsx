import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import {
  Shield, UserPlus, Search, X, 
  KeyRound, Edit2, Trash2, 
  RefreshCw, Filter, ShieldCheck, Mail, Phone
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface SuperAdminUser {
  id: string | number;
  iduser_bo?: string;
  nama: string;
  username: string;
  email?: string;
  telp?: string;
  alamat?: string;
  role: string;
  role_label?: string;
  status_aktif: string;
  created_at?: string;
  last_login_at?: string | null;
}

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    role: 'super_admin',
    nama: '',
    username: '',
    email: '',
    password: '',
    telp: '',
    alamat: '',
    status_aktif: 'Aktif',
  });

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState<SuperAdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Status Toggle / Nonaktifkan Modal
  const [userToToggle, setUserToToggle] = useState<SuperAdminUser | null>(null);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchUsers = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = { page, per_page: 15, role: 'super_admin' };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/super-admin/users', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsers(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat daftar Super Administrator.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [search, statusFilter, currentPage]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      role: 'super_admin',
      nama: '',
      username: '',
      email: '',
      password: '',
      telp: '',
      alamat: '',
      status_aktif: 'Aktif',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (u: SuperAdminUser) => {
    setIsEditing(true);
    const userId = (u.id || u.iduser_bo || '').toString();
    setFormData({
      id: userId,
      role: 'super_admin',
      nama: u.nama || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      telp: u.telp || '',
      alamat: u.alamat || '',
      status_aktif: isUserActive(u.status_aktif) ? 'Aktif' : 'Non Aktif',
    });
    setShowFormModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.username.trim()) {
      toast.error('Nama dan username wajib diisi.');
      return;
    }
    if (!isEditing && !formData.password.trim()) {
      toast.error('Password wajib diisi untuk Super Administrator baru.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.put(`/super-admin/users/${formData.id}`, {
          ...formData,
          role: 'super_admin',
        });
        toast.success(`Akun Super Administrator ${formData.nama} berhasil diperbarui.`);
      } else {
        await apiClient.post('/super-admin/users', {
          ...formData,
          role: 'super_admin',
        });
        toast.success(`Super Administrator ${formData.nama} berhasil didaftarkan.`);
      }
      setShowFormModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReset = (u: SuperAdminUser) => {
    setUserToReset(u);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset) return;

    setResetting(true);
    try {
      const userId = (userToReset.id || userToReset.iduser_bo || '').toString();
      const res = await apiClient.post(`/super-admin/users/${userId}/reset-password`, {
        password: newPassword.trim() || undefined,
        role: 'super_admin'
      });
      toast.success(res.data?.message || `Password untuk ${userToReset.nama} berhasil direset!`);
      setShowResetModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setResetting(false);
    }
  };

  const isUserActive = (status: any) => {
    if (status === null || status === undefined) return true;
    const s = String(status).trim().toLowerCase();
    return s === 'y' || s === 'aktif' || s === 'active' || s === '1' || s === 'true';
  };

  const handleToggleStatus = async (u: SuperAdminUser) => {
    const userId = (u.id || u.iduser_bo || '').toString();
    const currentActive = isUserActive(u.status_aktif);
    const newStatusAktif = currentActive ? 'N' : 'Y';

    // Optimistic Update
    setUsers(prev => prev.map(item => {
      const itemId = (item.id || item.iduser_bo || '').toString();
      if (itemId === userId) {
        return {
          ...item,
          status_aktif: newStatusAktif
        };
      }
      return item;
    }));

    try {
      const res = await apiClient.post(`/super-admin/users/${userId}/toggle-status`);
      toast.success(res.data?.message || `Status ${u.nama} berhasil diubah.`);
      setUserToToggle(null);
      fetchUsers(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengguna.');
      fetchUsers(currentPage);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                Kelola Pengguna Super Administrator
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Manajemen akun platform owner dan otoritas tertinggi sistem. Data sekolah (Admin Instansi, Guru, Siswa) dikelola terpusat pada menu <strong>Kelola Instansi</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Super Admin</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, username, email Super Admin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Status: Aktif</option>
            <option value="nonaktif">Status: Non Aktif</option>
          </select>

          {(search || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter(''); resetPage(); }}
              className="p-2 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
              title="Reset Filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Super Administrator</th>
                <th className="py-3 px-3">Username & Kontak</th>
                <th className="py-3 px-3">Hak Akses</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Terakhir Login</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Memuat data Super Administrator...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    Tidak ditemukan akun Super Administrator.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const active = isUserActive(u.status_aktif);
                  return (
                    <tr key={u.id || u.iduser_bo} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-700 flex items-center justify-center font-black text-purple-700 dark:text-purple-300 shrink-0">
                            <Shield className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-[#161C2D] dark:text-white block">
                              {u.nama}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ID: {u.id || u.iduser_bo}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-mono font-bold text-[#161C2D] dark:text-white block">
                          @{u.username}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {u.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-2.5 w-2.5" />
                              {u.email}
                            </span>
                          )}
                          {u.telp && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-2.5 w-2.5" />
                              {u.telp}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Full Platform Access</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title="Klik untuk ubah status aktif/non-aktif"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition cursor-pointer ${
                            active 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {active ? 'Aktif' : 'Non Aktif'}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-center text-slate-500 font-mono text-[10px]">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString('id-ID') : 'Belum pernah'}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                            title="Edit Super Admin"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setUserToToggle(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Nonaktifkan Super Admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <Pagination
            currentPage={currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={paginationMeta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Modal Add / Edit Super Admin */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-lg w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    {isEditing ? 'Edit Akun Super Administrator' : 'Tambah Super Administrator Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">Otoritas Akses Penuh Seluruh Platform</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Nama Lengkap Super Admin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, M.Kom"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: superadmin_budi"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="superadmin@cbt.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  {isEditing ? 'Ganti Password (Kosongkan jika tidak diubah)' : 'Password Login *'}
                </label>
                <input
                  type="password"
                  placeholder={isEditing ? 'Biarkan kosong untuk mempertahankan password lama' : 'Minimal 4 karakter'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="08123456789"
                    value={formData.telp}
                    onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formData.status_aktif}
                    onChange={(e) => setFormData({ ...formData, status_aktif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-[#1A1E22] text-[#161C2D] dark:text-white font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non Aktif">Non Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Alamat / Catatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Alamat kantor / tempat tugas..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Informational Access Badge */}
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-purple-600 shrink-0" />
                <div>
                  <span className="font-black text-purple-900 dark:text-purple-200 block text-[11px]">
                    Hak Akses: Super Administrator - Full Access
                  </span>
                  <span className="text-[10px] text-purple-700 dark:text-purple-400">
                    Akun ini memiliki hak akses penuh ke seluruh modul, konfigurasi instansi, dan database platform.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer text-[#161C2D] dark:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Buat Super Admin')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetModal && userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#161C2D] dark:text-white">
                  Reset Password Super Admin
                </h3>
                <p className="text-xs text-slate-400">Akun: {userToReset.nama}</p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Password Baru (Opsional)
                </label>
                <input
                  type="password"
                  placeholder="Kosongkan untuk auto-generate password default"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Jika dikosongkan, sistem akan mengenerate password acak yang aman.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer text-[#161C2D] dark:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Toggle / Nonaktifkan */}
      {userToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#161C2D] dark:text-white">
                  Nonaktifkan Super Administrator?
                </h3>
                <p className="text-xs text-slate-400">Akun: {userToToggle.nama}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-300">
              Apakah Anda yakin ingin menonaktifkan akun <strong>{userToToggle.nama}</strong>? Akun ini tidak akan dapat login ke portal Super Admin hingga diaktifkan kembali.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToToggle(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer text-[#161C2D] dark:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(userToToggle)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
