import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { useAuth } from '../../shared/context/AuthContext';
import { 
  Building2, Plus, Users, GraduationCap, ShieldCheck, 
  Trash2, Edit, Search, X, KeyRound, 
  UserCheck, ArrowUpDown
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface SchoolUserItem {
  id: string;
  user_type: 'guru' | 'siswa' | 'admin';
  nama: string;
  identifier: string;
  username: string;
  email: string;
  telp?: string;
  alamat?: string;
  status_aktif: string;
  role: string;
  class_name?: string;
  mapel?: string[];
}

export const SchoolUsersPage: React.FC = () => {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState<SchoolUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guru' | 'siswa' | 'admin'>('all');
  const [sortBy, setSortBy] = useState<'nama' | 'id'>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'nama' | 'id') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    resetPage();
  };

  // Modal states for Add/Edit Member
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'guru' | 'siswa' | 'admin'>('guru');
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [form, setForm] = useState({
    id: '',
    nama: '',
    username: '',
    email: '',
    nisn: '',
    telp: '',
    alamat: '',
    password: '',
    idkelas: '',
  });

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  // Load available classes for student assignment
  useEffect(() => {
    apiClient.get('/admin/classes', { params: { per_page: 100 } })
      .then(res => {
        const cls = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAvailableClasses(cls);
      })
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/school-users', {
        params: {
          page,
          per_page: 15,
          search: search.trim() || undefined,
          role: roleFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
        }
      });
      setPaginationFromResponse(res.data);
      setUsersList(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data pengguna instansi.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, sortBy, sortOrder, setPaginationFromResponse]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    resetPage();
  };

  const handleRoleFilterChange = (newRole: 'all' | 'guru' | 'siswa' | 'admin') => {
    setRoleFilter(newRole);
    resetPage();
  };

  const handleOpenAdd = (type: 'guru' | 'siswa' | 'admin') => {
    setModalType(type);
    setForm({
      id: '',
      nama: '',
      username: '',
      email: '',
      nisn: '',
      telp: '',
      alamat: '',
      password: '',
      idkelas: availableClasses[0]?.id || '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item: SchoolUserItem) => {
    setModalType(item.user_type);
    setForm({
      id: item.id,
      nama: item.nama || '',
      username: item.username || '',
      email: item.email || '',
      nisn: item.identifier || '',
      telp: item.telp || '',
      alamat: item.alamat || '',
      password: '',
      idkelas: availableClasses[0]?.id || '',
    });
    setShowModal(true);
  };

  const handleResetPassword = async (item: SchoolUserItem) => {
    const name = item.nama || item.username;
    if (!window.confirm(`Reset password akun "${name}" menjadi password default (123456)?`)) return;

    try {
      if (item.user_type === 'guru' || item.user_type === 'admin') {
        await apiClient.post(`/admin/teachers/${item.id}/reset-password`);
      } else if (item.user_type === 'siswa') {
        await apiClient.post(`/admin/students/${item.id}/reset-password`);
      }
      toast.success(`Password akun ${name} berhasil direset ke "123456".`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password.');
    }
  };

  const handleDeleteUser = async (item: SchoolUserItem) => {
    const name = item.nama || item.username;
    if (!window.confirm(`Yakin ingin menonaktifkan akun "${name}"?`)) return;

    const idkategori = user?.idkategori || user?.profile?.idkategori;
    if (!idkategori) {
      toast.error('ID Instansi tidak valid.');
      return;
    }

    try {
      if (item.user_type === 'admin') {
        await apiClient.delete(`/admin/instansi/${idkategori}/admins/${item.id}`);
      } else if (item.user_type === 'guru') {
        await apiClient.delete(`/admin/instansi/${idkategori}/gurus/${item.id}`);
      } else if (item.user_type === 'siswa') {
        await apiClient.delete(`/admin/instansi/${idkategori}/siswas/${item.id}`);
      }
      toast.success(`Akun ${name} berhasil dinonaktifkan.`);
      fetchUsers(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengguna.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const idkategori = user?.idkategori || user?.profile?.idkategori;
    if (!idkategori) {
      toast.error('ID Instansi tidak valid.');
      return;
    }

    if (!form.nama.trim()) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }

    try {
      if (modalType === 'admin') {
        if (form.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/admins/${form.id}`, {
            nama: form.nama,
            login_username: form.username,
            login_email: form.email,
            telp: form.telp,
            password: form.password || undefined,
          });
          toast.success('Data Admin Sekolah berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/admins`, {
            nama: form.nama,
            login_username: form.username,
            login_email: form.email,
            telp: form.telp,
            password: form.password || '12345',
          });
          toast.success('Admin Sekolah baru berhasil ditambahkan.');
        }
      } else if (modalType === 'guru') {
        if (form.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/gurus/${form.id}`, {
            nama: form.nama,
            login_username: form.username,
            login_email: form.email,
            telp: form.telp,
            password: form.password || undefined,
          });
          toast.success('Data Guru berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/gurus`, {
            nama: form.nama,
            login_username: form.username,
            login_email: form.email,
            telp: form.telp,
            password: form.password || '12345',
          });
          toast.success('Guru baru berhasil ditambahkan.');
        }
      } else if (modalType === 'siswa') {
        if (form.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/siswas/${form.id}`, {
            nama: form.nama,
            nisn: form.nisn,
            login_email: form.email,
            idkelas: form.idkelas,
            password: form.password || undefined,
          });
          toast.success('Data Siswa berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/siswas`, {
            nama: form.nama,
            nisn: form.nisn || `NISN${Date.now()}`,
            login_email: form.email,
            idkelas: form.idkelas,
            password: form.password || '123456',
          });
          toast.success('Siswa baru berhasil ditambahkan.');
        }
      }

      setShowModal(false);
      fetchUsers(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pengguna.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Pengguna Instansi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Kelola data Admin Sekolah, Guru Pengajar, dan Siswa Terdaftar dengan server-side pagination standar (15 data/halaman).
          </p>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleOpenAdd(roleFilter === 'all' ? 'guru' : roleFilter)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah {roleFilter === 'siswa' ? 'Siswa' : roleFilter === 'admin' ? 'Admin' : 'Guru'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Role Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-x-auto">
            <button
              onClick={() => handleRoleFilterChange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                roleFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Semua Pengguna</span>
            </button>
            <button
              onClick={() => handleRoleFilterChange('guru')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                roleFilter === 'guru'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Guru Pengajar</span>
            </button>
            <button
              onClick={() => handleRoleFilterChange('siswa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                roleFilter === 'siswa'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Siswa Terdaftar</span>
            </button>
            <button
              onClick={() => handleRoleFilterChange('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                roleFilter === 'admin'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Sekolah</span>
            </button>
          </div>

          {/* Search Input & Sort */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, NISN, NUPTK, email..."
                value={search}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); resetPage(); }}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={`Urutkan Nama: ${sortOrder === 'asc' ? 'A ke Z' : 'Z ke A'}`}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition flex items-center gap-1 text-xs"
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline font-mono">{sortOrder.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-white/[0.01]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition select-none"
                  onClick={() => handleSort('nama')}
                  title="Klik untuk mengubah urutan nama"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Lengkap</span>
                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4">Identifier / Username</th>
                <th className="py-3 px-4">Email / Telepon</th>
                <th className="py-3 px-4">Kelas / Mapel</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent mb-2"></div>
                    <p>Memuat daftar pengguna...</p>
                  </td>
                </tr>
              ) : usersList.length > 0 ? (
                usersList.map((item) => (
                  <tr key={`${item.user_type}-${item.id}`} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                        item.user_type === 'guru' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : item.user_type === 'siswa'
                          ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}>
                        {item.nama?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="truncate max-w-[180px] sm:max-w-[240px]">{item.nama}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item.user_type === 'guru'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : item.user_type === 'siswa'
                          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'
                      }`}>
                        {item.user_type === 'guru' ? 'Guru' : item.user_type === 'siswa' ? 'Siswa' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-gray-400">
                      {item.identifier || item.username || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-gray-400">
                      <div className="truncate max-w-[160px]">{item.email || '-'}</div>
                      {item.telp && <div className="text-[11px] text-slate-400">{item.telp}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-gray-400">
                      {item.user_type === 'siswa' ? (
                        item.class_name && item.class_name !== '-' ? (
                          <span className="font-semibold text-slate-800 dark:text-gray-200">{item.class_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada kelas</span>
                        )
                      ) : item.user_type === 'guru' && item.mapel && item.mapel.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {item.mapel.slice(0, 2).map((m, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[10px] text-slate-700 dark:text-gray-300 truncate">
                              {m}
                            </span>
                          ))}
                          {item.mapel.length > 2 && (
                            <span className="text-[10px] text-slate-400 font-bold">+{item.mapel.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status_aktif === 'Y'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {item.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetPassword(item)}
                          title="Reset Password ke default 123456"
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="h-3 w-3" />
                          <span className="hidden sm:inline">Reset</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Pengguna"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(item)}
                          title="Nonaktifkan Pengguna"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-gray-600 mb-2" />
                    <p className="font-medium">Tidak ada data pengguna yang sesuai.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Standard 15 Data Pagination Component */}
          <Pagination
            currentPage={paginationMeta.currentPage}
            lastPage={paginationMeta.lastPage}
            total={paginationMeta.total}
            perPage={15}
            from={paginationMeta.from}
            to={paginationMeta.to}
            onPageChange={setPage}
            loading={loading}
          />
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                {form.id ? 'Edit Data Pengguna' : `Tambah ${modalType === 'guru' ? 'Guru' : modalType === 'siswa' ? 'Siswa' : 'Admin Sekolah'}`}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {modalType === 'siswa' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        NISN *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 0002026001"
                        value={form.nisn}
                        onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                        Pilih Kelas Rombel *
                      </label>
                      <select
                        value={form.idkelas}
                        onChange={(e) => setForm({ ...form, idkelas: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12161A] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      >
                        <option value="">Pilih Kelas...</option>
                        {availableClasses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama_kelas} {c.jenjang?.nama_jenjang ? `(${c.jenjang.nama_jenjang})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: gurubaru"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="email@sekolah.id"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    No. Telepon / WA
                  </label>
                  <input
                    type="text"
                    placeholder="0812345678"
                    value={form.telp}
                    onChange={(e) => setForm({ ...form, telp: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  {form.id ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Awal'}
                </label>
                <input
                  type="password"
                  placeholder={form.id ? 'Biarkan kosong jika tidak diubah' : 'Default: 123456'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
