import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { useAuth } from '../../shared/context/AuthContext';
import { 
  Building2, Plus, Users, GraduationCap, ShieldCheck, 
  Trash2, Edit, Search, X, KeyRound, 
  UserCheck, ArrowUpDown, Eye, Power, Download, Clock
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
  is_wali_kelas?: boolean;
  wali_kelas_names?: string;
  academic_year_name?: string;
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

  // Detail Modal states (Requirement 2)
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailUser, setSelectedDetailUser] = useState<SchoolUserItem | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const handleToggleUserStatus = async (item: SchoolUserItem) => {
    try {
      const endpoint = item.user_type === 'guru' 
        ? `/admin/teachers/${item.id}/toggle-status` 
        : item.user_type === 'siswa' 
        ? `/admin/students/${item.id}/toggle-status`
        : null;

      if (!endpoint) {
        toast.info('Status Admin Sekolah dapat dikelola melalui Master Instansi.');
        return;
      }

      const res = await apiClient.patch(endpoint);
      toast.success(res.data?.message || 'Status pengguna berhasil diperbarui.');
      if (selectedDetailUser && selectedDetailUser.id === item.id) {
        setSelectedDetailUser(prev => prev ? { ...prev, status_aktif: res.data.status_aktif } : null);
      }
      fetchUsers(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah status pengguna.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let url = '/admin/teachers/export';
      let filename = 'Data_Guru.csv';
      if (roleFilter === 'siswa') {
        url = '/admin/students/export';
        filename = 'Data_Siswa.csv';
      }

      const res = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Data pengguna berhasil diekspor!');
    } catch (err: any) {
      toast.error('Gagal mengekspor data.');
    } finally {
      setExporting(false);
    }
  };

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
      {/* Header Page (Requirement 4: Kelola Pengguna) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Kelola Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Pusat manajemen pengguna terpadu untuk Admin Instansi, Guru Pengajar, dan Siswa Terdaftar.
          </p>
        </div>

        {/* Quick Action Buttons (Requirement 14, 15, 17) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? 'Mengekspor...' : 'Export Excel / CSV'}</span>
          </button>

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
          
          {/* Unified Filter Role (Requirement 9: Satu Halaman dengan Filter) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400 shrink-0">
              Filter:
            </span>
            <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleRoleFilterChange('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  roleFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange('admin')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  roleFilter === 'admin'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Admin Instansi
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange('guru')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  roleFilter === 'guru'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Guru
              </button>
              <button
                type="button"
                onClick={() => handleRoleFilterChange('siswa')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  roleFilter === 'siswa'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                }`}
              >
                Siswa
              </button>
            </div>
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
                      {item.user_type === 'guru' && item.is_wali_kelas && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-600/30 shrink-0">
                          Wali Kelas {item.wali_kelas_names ? `(${item.wali_kelas_names})` : ''}
                        </span>
                      )}
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
                          onClick={() => {
                            setSelectedDetailUser(item);
                            setDetailModalOpen(true);
                          }}
                          title="Detail Lengkap Pengguna"
                          className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(item)}
                          title={item.status_aktif === 'Y' ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            item.status_aktif === 'Y'
                              ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                              : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
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
                          title="Hapus Pengguna"
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

      {/* ================= DETAIL PENGGUNA MODAL (Requirement 2) ================= */}
      {detailModalOpen && selectedDetailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-white/10 shadow-2xl relative animate-scale-up max-h-[90vh] flex flex-col">
            <button
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className={`p-3 rounded-2xl border text-xl font-black ${
                selectedDetailUser.user_type === 'guru'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/20'
                  : selectedDetailUser.user_type === 'siswa'
                  ? 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-500/20'
                  : 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/20'
              }`}>
                {selectedDetailUser.user_type === 'guru' ? <UserCheck className="h-6 w-6" /> : selectedDetailUser.user_type === 'siswa' ? <GraduationCap className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedDetailUser.nama}
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedDetailUser.status_aktif === 'Y'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {selectedDetailUser.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Peran: <strong className="uppercase">{selectedDetailUser.user_type}</strong> • ID: <span className="font-mono">{selectedDetailUser.id}</span>
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Wali Kelas Badge Alert */}
              {selectedDetailUser.user_type === 'guru' && selectedDetailUser.is_wali_kelas && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-600/30 flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-black text-amber-900 dark:text-amber-200">Terdaftar sebagai Wali Kelas</h5>
                    <p className="text-amber-700 dark:text-amber-300 text-[11px]">
                      Membina rombel: <strong>{selectedDetailUser.wali_kelas_names || 'Aktif'}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Data Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Identifier / NISN / NUPTK</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono block">
                    {selectedDetailUser.identifier || selectedDetailUser.username || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Login</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block truncate">
                    {selectedDetailUser.email || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Nomor Telepon / WA</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {selectedDetailUser.telp || '-'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Kelas / Rombel</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                    {selectedDetailUser.class_name || selectedDetailUser.wali_kelas_names || '-'}
                  </span>
                </div>

                {selectedDetailUser.academic_year_name && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tahun Ajaran</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                      {selectedDetailUser.academic_year_name}
                    </span>
                  </div>
                )}

                {selectedDetailUser.user_type === 'guru' && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mata Pelajaran Diampu</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedDetailUser.mapel && selectedDetailUser.mapel.length > 0 ? (
                        selectedDetailUser.mapel.map((m, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-bold rounded-lg text-xs">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Belum ada mata pelajaran terkait</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Riwayat Perubahan & Audit Info */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  <span>Riwayat & Keamanan Akun</span>
                </h4>
                <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-[11px]">
                  Aktivitas autentikasi, pengaturan hak akses, pergantian password, dan penugasan akademik pengguna ini dicatat secara realtime di modul Aktivitas Guru & Siswa atau Audit Trail sistem.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-slate-400 text-[11px]">Status Akses Login:</span>
                  <span className={`font-bold ${selectedDetailUser.status_aktif === 'Y' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedDetailUser.status_aktif === 'Y' ? 'Diizinkan Masuk' : 'Diblokir / Dinonaktifkan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer (Requirement 2) */}
            <div className="pt-4 mt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleUserStatus(selectedDetailUser)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                  selectedDetailUser.status_aktif === 'Y'
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-500/20'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{selectedDetailUser.status_aktif === 'Y' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleOpenEdit(selectedDetailUser);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
