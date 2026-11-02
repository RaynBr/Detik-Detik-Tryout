import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import {
  Users, UserPlus, Shield, Search, X, 
  KeyRound, Edit2, Trash2, 
  Eye, GraduationCap, UserCheck, 
  RefreshCw, Filter
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface UserItem {
  id: string | number;
  iduser_bo?: string;
  iduser?: string;
  nama: string;
  username: string;
  email?: string;
  jenis_kelamin?: 'L' | 'P';
  telp?: string;
  alamat?: string;
  role: string;
  idkategori?: string;
  instansi_name?: string;
  instansi?: {
    idkategori: string;
    nama_kategori: string;
    gurus?: any[];
    siswas?: any[];
  };
  status_aktif: string;
  created_at?: string;
  last_login_at?: string | null;
}

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [instansiList, setInstansiList] = useState<any[]>([]);

  // Filters
  const [roleFilter, setRoleFilter] = useState('');
  const [instansiFilter, setInstansiFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    role: 'admin',
    nama: '',
    username: '',
    email: '',
    password: '',
    idkategori: '',
    jenis_kelamin: 'L',
    telp: '',
    alamat: '',
    status_aktif: 'Aktif',
  });

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [userToReset, setUserToReset] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Detail Modal (Admin Instansi drill-down to Guru & Siswa)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'guru' | 'siswa'>('info');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [, setLoadingDetail] = useState(false);

  // Status Toggle Modal
  const [userToToggle, setUserToToggle] = useState<UserItem | null>(null);

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
      const params: any = { page, per_page: 15 };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (instansiFilter) params.idkategori = instansiFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await apiClient.get('/super-admin/users', { params });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsers(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstansiList = async () => {
    try {
      const res = await apiClient.get('/super-admin/instansi', { params: { all: true } });
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setInstansiList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInstansiList();
  }, []);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [search, roleFilter, instansiFilter, statusFilter, currentPage]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      id: '',
      role: 'admin',
      nama: '',
      username: '',
      email: '',
      password: '',
      idkategori: instansiList.length > 0 ? instansiList[0].idkategori : '',
      jenis_kelamin: 'L',
      telp: '',
      alamat: '',
      status_aktif: 'Aktif',
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (u: UserItem) => {
    setIsEditing(true);
    const userId = (u.id || u.iduser_bo || u.iduser || '').toString();
    setFormData({
      id: userId,
      role: u.role || 'admin',
      nama: u.nama || '',
      username: u.username || '',
      email: u.email || '',
      password: '',
      idkategori: u.idkategori || '',
      jenis_kelamin: u.jenis_kelamin || 'L',
      telp: u.telp || '',
      alamat: u.alamat || '',
      status_aktif: u.status_aktif || 'Aktif',
    });
    setShowFormModal(true);
  };

  const handleOpenDetail = async (u: UserItem) => {
    const userId = (u.id || u.iduser_bo || u.iduser || '').toString();
    setSelectedUser(u);
    setDetailTab('info');
    setShowDetailModal(true);
    setLoadingDetail(true);

    try {
      const res = await apiClient.get(`/super-admin/users/${userId}`, {
        params: { role: u.role }
      });
      if (res.data) {
        setSelectedUser(res.data);
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.username.trim()) {
      toast.error('Nama dan username wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.put(`/super-admin/users/${formData.id}`, formData);
        toast.success(`Pengguna ${formData.nama} berhasil diperbarui.`);
      } else {
        await apiClient.post('/super-admin/users', formData);
        toast.success(`Pengguna ${formData.nama} berhasil didaftarkan.`);
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

  const handleOpenReset = (u: UserItem) => {
    setUserToReset(u);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset) return;

    setResetting(true);
    try {
      const userId = (userToReset.id || userToReset.iduser_bo || userToReset.iduser || '').toString();
      const res = await apiClient.post(`/super-admin/users/${userId}/reset-password`, {
        new_password: newPassword.trim() || undefined,
        role: userToReset.role
      });
      toast.success(res.data?.message || `Password untuk ${userToReset.nama} berhasil direset!`);
      setShowResetModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setResetting(false);
    }
  };

  // Helper to accurately determine active status
  const isUserActive = (status: any) => {
    if (status === null || status === undefined) return true;
    const s = String(status).trim().toLowerCase();
    return s === 'y' || s === 'aktif' || s === 'active' || s === '1' || s === 'true';
  };

  const handleToggleStatus = async (u: UserItem) => {
    const userId = (u.id || u.iduser_bo || u.iduser || '').toString();
    const currentActive = isUserActive(u.status_aktif);
    const newStatusAktif = currentActive ? 'N' : 'Y';

    // 1. Optimistic Update: UI badge, toggle, and table update immediately
    setUsers(prev => prev.map(item => {
      const itemId = (item.id || item.iduser_bo || item.iduser || '').toString();
      if (itemId === userId) {
        return {
          ...item,
          status_aktif: newStatusAktif,
          status: newStatusAktif === 'Y' ? 'Aktif' : 'Non Aktif'
        };
      }
      return item;
    }));

    try {
      const res = await apiClient.post(`/super-admin/users/${userId}/toggle-status`, {
        role: u.role
      });
      toast.success(res.data?.message || `Status ${u.nama} berhasil diperbarui.`);
      setUserToToggle(null);

      // 2. Synchronize with API response
      if (res.data?.status_aktif) {
        setUsers(prev => prev.map(item => {
          const itemId = (item.id || item.iduser_bo || item.iduser || '').toString();
          if (itemId === userId) {
            return {
              ...item,
              status_aktif: res.data.status_aktif,
              status: res.data.status || (res.data.status_aktif === 'Y' ? 'Aktif' : 'Non Aktif')
            };
          }
          return item;
        }));
      }
    } catch (err: any) {
      // Revert optimistic state on failure
      setUsers(prev => prev.map(item => {
        const itemId = (item.id || item.iduser_bo || item.iduser || '').toString();
        if (itemId === userId) {
          return {
            ...item,
            status_aktif: currentActive ? 'Y' : 'N',
            status: currentActive ? 'Aktif' : 'Non Aktif'
          };
        }
        return item;
      }));
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengguna.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                2. Kelola Pengguna Platform
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Kontrol hak akses Super Admin, Admin Instansi, serta audit guru dan siswa per sekolah.
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-gray-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Role</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin Instansi</option>
            <option value="guru">Guru</option>
            <option value="siswa">Siswa</option>
          </select>

          <select
            value={instansiFilter}
            onChange={(e) => setInstansiFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer max-w-[200px]"
          >
            <option value="">Semua Instansi</option>
            {instansiList.map((inst) => (
              <option key={inst.idkategori} value={inst.idkategori}>
                {inst.nama_kategori}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="non_aktif">Non Aktif</option>
          </select>

          {(search || roleFilter || instansiFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setRoleFilter(''); setInstansiFilter(''); setStatusFilter(''); resetPage(); }}
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
                <th className="py-3 px-3">Nama & Username</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Instansi</th>
                <th className="py-3 px-3">Email & Kontak</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-500" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-bold text-slate-500">
                    Tidak ditemukan data pengguna yang cocok.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isAktif = isUserActive(u.status_aktif);
                  const roleBadge = 
                    u.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' :
                    u.role === 'admin' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' :
                    u.role === 'guru' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' :
                    'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300';
                  
                  const roleLabel =
                    u.role === 'super_admin' ? 'Super Admin' :
                    u.role === 'admin' ? 'Admin Instansi' :
                    u.role === 'guru' ? 'Guru' : 'Siswa';

                  return (
                    <tr key={u.id || u.iduser_bo || u.iduser} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-white/10 border border-[#161C2D]/20 flex items-center justify-center font-black text-purple-600 dark:text-purple-400 shrink-0">
                            {u.nama ? u.nama.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-[#161C2D] dark:text-white block hover:text-purple-600 transition">
                              {u.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${roleBadge}`}>
                          {roleLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-slate-700 dark:text-gray-300">
                          {u.instansi_name || u.instansi?.nama_kategori || (u.role === 'super_admin' ? 'Pusat (Platform)' : '-')}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 dark:text-gray-400">
                        <div className="space-y-0.5">
                          {u.email && <div className="text-[11px] truncate max-w-[180px]">{u.email}</div>}
                          {u.telp && <div className="text-[10px] text-slate-400">{u.telp}</div>}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          title="Klik untuk ubah status aktif/non-aktif"
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border transition cursor-pointer ${
                            isAktif 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                        >
                          {isAktif ? 'Aktif' : 'Non Aktif'}
                        </button>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Drill-down view for Admin Instansi */}
                          <button
                            onClick={() => handleOpenDetail(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                            title="Detail Pengguna / Anggota Instansi"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                            title="Reset Password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setUserToToggle(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Ubah Status / Hapus"
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

      {/* Form Modal (Add / Edit User) */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-lg w-full shadow-[6px_6px_0px_0px_#171717] space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                {isEditing ? 'Edit Data Pengguna' : 'Daftarkan Pengguna Baru'}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    Role Pengguna <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    disabled={isEditing}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  >
                    <option value="admin">Admin Instansi</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="guru">Guru</option>
                    <option value="siswa">Siswa</option>
                  </select>
                </div>

                {formData.role !== 'super_admin' && (
                  <div>
                    <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                      Instansi Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.idkategori}
                      required={formData.role !== 'super_admin'}
                      onChange={(e) => setFormData({ ...formData, idkategori: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                    >
                      <option value="">Pilih Instansi</option>
                      {instansiList.map((i) => (
                        <option key={i.idkategori} value={i.idkategori}>{i.nama_kategori}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Pengguna"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="username123"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="user@sekolah.sch.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
              </div>

              {!isEditing && (
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Nomor HP</label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.telp}
                    onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={formData.status_aktif}
                    onChange={(e) => setFormData({ ...formData, status_aktif: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non Aktif">Non Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">Alamat</label>
                <textarea
                  rows={2}
                  placeholder="Alamat tempat tinggal"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-purple-500 text-[#161C2D] dark:text-white font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Buat Pengguna')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-sm w-full shadow-[5px_5px_0px_0px_#171717] space-y-4">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 rounded-xl border border-cyan-200 w-fit">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#161C2D] dark:text-white">Reset Password</h4>
              <p className="text-xs text-slate-500 mt-1">
                Atur ulang password untuk akun <strong>{userToReset.nama}</strong> (@{userToReset.username}).
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-gray-300 mb-1">
                  Password Baru (Kosongkan jika default auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="Password baru atau kosongkan"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal with Guru & Siswa View for Admin Instansi */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-3xl p-6 max-w-3xl w-full shadow-[6px_6px_0px_0px_#171717] space-y-5 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-200">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                    Detail Akun {selectedUser.nama}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Role: {selectedUser.role} | Instansi: {selectedUser.instansi_name || selectedUser.instansi?.nama_kategori || 'Pusat'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs for Admin Instansi to view Guru and Siswa */}
            {selectedUser.role === 'admin' && (
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/10 pb-2">
                <button
                  onClick={() => setDetailTab('info')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    detailTab === 'info' 
                      ? 'bg-purple-600 text-white border-2 border-[#161C2D]' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  Profil Admin
                </button>
                <button
                  onClick={() => setDetailTab('guru')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    detailTab === 'guru' 
                      ? 'bg-emerald-600 text-white border-2 border-[#161C2D]' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Daftar Guru Instansi ({selectedUser.instansi?.gurus?.length ?? 0})</span>
                </button>
                <button
                  onClick={() => setDetailTab('siswa')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    detailTab === 'siswa' 
                      ? 'bg-cyan-600 text-white border-2 border-[#161C2D]' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Daftar Siswa Instansi ({selectedUser.instansi?.siswas?.length ?? 0})</span>
                </button>
              </div>
            )}

            {detailTab === 'info' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Nama Lengkap</span>
                  <span className="font-bold text-[#161C2D] dark:text-white text-sm">{selectedUser.nama}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Username & Role</span>
                  <span className="font-bold text-[#161C2D] dark:text-white">
                    @{selectedUser.username} ({selectedUser.role})
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Email & No Telp</span>
                  <span className="font-bold text-[#161C2D] dark:text-white">
                    {selectedUser.email || '-'} / {selectedUser.telp || '-'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Status Akun</span>
                  <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] uppercase ${
                    (selectedUser.status_aktif || 'aktif').toLowerCase() === 'aktif'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedUser.status_aktif || 'Aktif'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 sm:col-span-2 space-y-1">
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Instansi Terkait</span>
                  <span className="font-bold text-[#161C2D] dark:text-white text-sm">
                    {selectedUser.instansi_name || selectedUser.instansi?.nama_kategori || 'Pusat (Super Admin)'}
                  </span>
                </div>
              </div>
            )}

            {/* Embedded Guru List inside Admin Instansi */}
            {detailTab === 'guru' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Daftar guru terdaftar pada instansi <strong>{selectedUser.instansi?.nama_kategori}</strong>:
                </div>
                <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] border-b">
                        <th className="p-2.5">Nama Guru</th>
                        <th className="p-2.5">Username</th>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">No HP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-[#161C2D]/10">
                      {(selectedUser.instansi?.gurus || []).length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">Belum ada guru terdaftar di instansi ini.</td></tr>
                      ) : (
                        selectedUser.instansi?.gurus?.map((g: any) => (
                          <tr key={g.iduser_bo || g.id}>
                            <td className="p-2.5 font-bold">{g.nama}</td>
                            <td className="p-2.5 font-mono text-[10px]">@{g.username}</td>
                            <td className="p-2.5 text-slate-500">{g.email || '-'}</td>
                            <td className="p-2.5 text-slate-500">{g.telp || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Embedded Siswa List inside Admin Instansi */}
            {detailTab === 'siswa' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500">
                  Daftar siswa terdaftar pada instansi <strong>{selectedUser.instansi?.nama_kategori}</strong>:
                </div>
                <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] border-b">
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5">NISN / NIS</th>
                        <th className="p-2.5">Jenis Kelamin</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-[#161C2D]/10">
                      {(selectedUser.instansi?.siswas || []).length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-slate-400">Belum ada siswa terdaftar di instansi ini.</td></tr>
                      ) : (
                        selectedUser.instansi?.siswas?.map((s: any) => (
                          <tr key={s.iduser || s.id}>
                            <td className="p-2.5 font-bold">{s.nama}</td>
                            <td className="p-2.5 font-mono text-[10px]">{s.nisn || s.nis || '-'}</td>
                            <td className="p-2.5">{s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                            <td className="p-2.5 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {s.status_aktif || 'Aktif'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Toggle Status */}
      {userToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-sm w-full shadow-[5px_5px_0px_0px_#171717] space-y-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl border border-amber-200 w-fit">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#161C2D] dark:text-white">Ubah Status Akun?</h4>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin mengubah status operasional akun <strong>{userToToggle.nama}</strong>? Akun non-aktif tidak akan dapat login ke dalam sistem.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToToggle(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleToggleStatus(userToToggle)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
              >
                Ubah Status
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
