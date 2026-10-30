import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { useAuth } from '../../shared/context/AuthContext';
import { 
  Building2, Plus, Users, School, 
  Trash2, Edit, ChevronRight, Search, X,
  GraduationCap, ShieldCheck, KeyRound
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface InstansiItem {
  idkategori: string;
  nama_kategori: string;
  tgl_input: string;
  admin_count: number;
  guru_count: number;
  siswa_count: number;
  kelas_count: number;
}

export const InstansiPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isSchoolAdmin = user?.role === 'admin';

  const [instansiList, setInstansiList] = useState<InstansiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected Instansi for Member Management
  const [selectedInstansi, setSelectedInstansi] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'guru' | 'siswa' | 'admin'>('guru');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Add/Edit Instansi Modal (Super Admin only)
  const [showInstansiModal, setShowInstansiModal] = useState(false);
  const [instansiFormName, setInstansiFormName] = useState('');
  const [editingInstansiId, setEditingInstansiId] = useState<string | null>(null);

  // Add/Edit Member Modal (Admin, Guru, Siswa)
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberForm, setMemberForm] = useState({
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
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchInstansi = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/instansi', { params: { search, page } });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setInstansiList(list);

      // If School Admin, automatically load their single instansi directly
      if (isSchoolAdmin && list.length > 0 && !selectedInstansi) {
        openInstansiDetail(list[0]);
      }
    } catch (err) {
      toast.error('Gagal memuat daftar instansi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstansi(currentPage);
  }, [search, currentPage]);

  const openInstansiDetail = async (instansi: InstansiItem) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/admin/instansi/${instansi.idkategori}`);
      setSelectedInstansi(res.data);
      setAvailableClasses(res.data.kelas || []);
    } catch (err) {
      toast.error('Gagal memuat data detail instansi.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveInstansi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instansiFormName.trim()) return;

    try {
      if (editingInstansiId) {
        await apiClient.put(`/admin/instansi/${editingInstansiId}`, { nama_kategori: instansiFormName });
        toast.success('Nama instansi berhasil diperbarui.');
      } else {
        await apiClient.post('/admin/instansi', { nama_kategori: instansiFormName });
        toast.success('Instansi baru berhasil ditambahkan.');
      }
      setShowInstansiModal(false);
      setInstansiFormName('');
      setEditingInstansiId(null);
      fetchInstansi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan instansi.');
    }
  };

  const handleDeleteInstansi = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menonaktifkan instansi "${name}"?`)) return;

    try {
      await apiClient.delete(`/admin/instansi/${id}`);
      toast.success('Instansi berhasil dinonaktifkan.');
      fetchInstansi();
    } catch (err) {
      toast.error('Gagal menghapus instansi.');
    }
  };

  const handleOpenAddMember = () => {
    setMemberForm({
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
    setShowMemberModal(true);
  };

  const handleEditMember = (item: any, type: 'admin' | 'guru' | 'siswa') => {
    setMemberForm({
      id: type === 'siswa' ? item.iduser : item.iduser_bo,
      nama: item.nama || '',
      username: item.login_username || item.username || '',
      email: item.login_email || item.email || '',
      nisn: item.nisn || '',
      telp: item.telp || '',
      alamat: item.alamat || '',
      password: '',
      idkelas: item.idkelas || availableClasses[0]?.id || '',
    });
    setShowMemberModal(true);
  };

  const handleResetPassword = async (item: any, type: 'admin' | 'guru' | 'siswa') => {
    const name = item.nama || 'pengguna';
    if (!window.confirm(`Reset password akun "${name}" menjadi default (123456)?`)) return;

    try {
      if (type === 'guru') {
        await apiClient.post(`/admin/teachers/${item.iduser_bo}/reset-password`);
      } else if (type === 'siswa') {
        await apiClient.post(`/admin/students/${item.iduser}/reset-password`);
      }
      toast.success(`Password akun ${name} berhasil direset ke "123456".`);
    } catch (err) {
      toast.error('Gagal mereset password.');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;

    const idkategori = selectedInstansi.instansi.idkategori;
    try {
      if (activeTab === 'admin') {
        if (memberForm.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/admins/${memberForm.id}`, {
            nama: memberForm.nama,
            login_username: memberForm.username,
            login_email: memberForm.email,
            telp: memberForm.telp,
            password: memberForm.password || undefined,
          });
          toast.success('Admin instansi berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/admins`, {
            nama: memberForm.nama,
            login_username: memberForm.username,
            login_email: memberForm.email,
            telp: memberForm.telp,
            password: memberForm.password || '12345',
          });
          toast.success('Admin instansi baru berhasil dibuat.');
        }
      } else if (activeTab === 'guru') {
        if (memberForm.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/gurus/${memberForm.id}`, {
            nama: memberForm.nama,
            login_username: memberForm.username,
            login_email: memberForm.email,
            telp: memberForm.telp,
            password: memberForm.password || undefined,
          });
          toast.success('Data guru berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/gurus`, {
            nama: memberForm.nama,
            login_username: memberForm.username,
            login_email: memberForm.email,
            telp: memberForm.telp,
            password: memberForm.password || '12345',
          });
          toast.success('Guru baru berhasil ditambahkan.');
        }
      } else if (activeTab === 'siswa') {
        if (memberForm.id) {
          await apiClient.put(`/admin/instansi/${idkategori}/siswas/${memberForm.id}`, {
            nama: memberForm.nama,
            nisn: memberForm.nisn,
            login_email: memberForm.email,
            idkelas: memberForm.idkelas,
            password: memberForm.password || undefined,
          });
          toast.success('Data siswa berhasil diperbarui.');
        } else {
          await apiClient.post(`/admin/instansi/${idkategori}/siswas`, {
            nama: memberForm.nama,
            nisn: memberForm.nisn || `NISN${Date.now()}`,
            login_email: memberForm.email,
            idkelas: memberForm.idkelas,
            password: memberForm.password || '123456',
          });
          toast.success('Siswa baru berhasil ditambahkan.');
        }
      }

      setShowMemberModal(false);
      openInstansiDetail({ idkategori } as any);
      fetchInstansi();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const handleDeleteMember = async (id: string, type: 'admin' | 'guru' | 'siswa') => {
    if (!selectedInstansi || !window.confirm('Yakin ingin menghapus data pengguna ini?')) return;
    const idkategori = selectedInstansi.instansi.idkategori;

    try {
      if (type === 'admin') {
        await apiClient.delete(`/admin/instansi/${idkategori}/admins/${id}`);
      } else if (type === 'guru') {
        await apiClient.delete(`/admin/instansi/${idkategori}/gurus/${id}`);
      } else if (type === 'siswa') {
        await apiClient.delete(`/admin/instansi/${idkategori}/siswas/${id}`);
      }
      toast.success('Pengguna berhasil dihapus.');
      openInstansiDetail({ idkategori } as any);
      fetchInstansi();
    } catch (err) {
      toast.error('Gagal menghapus pengguna.');
    }
  };

  // Filter members based on search
  const filterList = (items: any[] = []) => {
    if (!memberSearch.trim()) return items;
    const q = memberSearch.toLowerCase();
    return items.filter(u => 
      (u.nama && u.nama.toLowerCase().includes(q)) ||
      (u.login_email && u.login_email.toLowerCase().includes(q)) ||
      (u.nisn && u.nisn.toLowerCase().includes(q)) ||
      (u.login_username && u.login_username.toLowerCase().includes(q))
    );
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            {isSchoolAdmin 
              ? (selectedInstansi?.instansi?.nama_kategori ? `Pengguna Instansi: ${selectedInstansi.instansi.nama_kategori}` : 'Pengguna Instansi Sekolah')
              : 'Manajemen Instansi & Sekolah'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            {isSchoolAdmin 
              ? 'Kelola data guru pengajar, data siswa terdaftar, dan reset password akun di sekolah Anda.' 
              : 'Kelola instansi mitra, admin sekolah, guru pengajar, dan siswa per instansi.'}
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingInstansiId(null);
              setInstansiFormName('');
              setShowInstansiModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 transition active:scale-95 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Tambah Instansi Baru
          </button>
        )}
      </div>

      {/* ADMIN INSTANSI LOADING STATE */}
      {isSchoolAdmin && !selectedInstansi && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-slate-200/80 dark:border-white/5">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3"></div>
          <p className="text-sm font-medium text-slate-500">
            {loadingDetail ? 'Memuat data pengguna instansi sekolah...' : 'Menyiapkan data instansi...'}
          </p>
        </div>
      )}

      {/* ADMIN INSTANSI DIRECT EMBEDDED VIEW (No Confusing Modal) */}
      {isSchoolAdmin && selectedInstansi && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-white/5 space-y-6">
          
          {/* Quick Instansi Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-500/20">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                <Users className="h-4 w-4" />
                <span>Guru Pengajar</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedInstansi.gurus?.length || 0}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-500/20">
              <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="h-4 w-4" />
                <span>Siswa Terdaftar</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedInstansi.siswas?.length || 0}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                <School className="h-4 w-4" />
                <span>Rombel Kelas</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedInstansi.kelas?.length || 0}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-500/20">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Sekolah</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {selectedInstansi.admins?.length || 0}
              </p>
            </div>
          </div>

          {/* Tab Navigation & Search & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-white/[0.03] rounded-2xl">
              <button
                onClick={() => setActiveTab('guru')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'guru'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Guru Sekolah ({selectedInstansi.gurus?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('siswa')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'siswa'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>Siswa Sekolah ({selectedInstansi.siswas?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Admin Sekolah ({selectedInstansi.admins?.length || 0})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari nama / email ${activeTab}...`}
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 w-48 sm:w-60"
                />
              </div>

              <button
                onClick={handleOpenAddMember}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah {activeTab === 'guru' ? 'Guru' : activeTab === 'siswa' ? 'Siswa' : 'Admin'}</span>
              </button>
            </div>
          </div>

          {/* Direct Embedded Table Content */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5">
            {activeTab === 'guru' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Nama Guru</th>
                    <th className="py-3 px-4">NUPTK / Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">No. Telepon</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-gray-300">
                  {filterList(selectedInstansi.gurus).length > 0 ? (
                    filterList(selectedInstansi.gurus).map((g: any) => (
                      <tr key={g.iduser_bo} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 font-black text-xs flex items-center justify-center shrink-0">
                            {g.nama?.charAt(0) || 'G'}
                          </div>
                          <span>{g.nama}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-gray-400">{g.nuptk || g.login_username || '-'}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{g.login_email}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{g.telp || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetPassword(g, 'guru')}
                              title="Reset Password Guru (ke 123456)"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>Reset Password</span>
                            </button>
                            <button
                              onClick={() => handleEditMember(g, 'guru')}
                              title="Edit Data Guru"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(g.iduser_bo, 'guru')}
                              title="Hapus Akun Guru"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada data guru yang cocok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'siswa' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">NISN / NIS</th>
                    <th className="py-3 px-4">Kelas Rombel</th>
                    <th className="py-3 px-4">Email Login</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-gray-300">
                  {filterList(selectedInstansi.siswas).length > 0 ? (
                    filterList(selectedInstansi.siswas).map((s: any) => (
                      <tr key={s.iduser} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                            {s.nama?.charAt(0) || 'S'}
                          </div>
                          <span>{s.nama}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800 dark:text-gray-200">{s.nisn || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300">
                            {s.kelas?.nama_kelas || 'Belum Terbagi'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{s.login_email}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetPassword(s, 'siswa')}
                              title="Reset Password Siswa (ke 123456)"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>Reset Password</span>
                            </button>
                            <button
                              onClick={() => handleEditMember(s, 'siswa')}
                              title="Edit Data Siswa"
                              className="p-1.5 text-slate-600 hover:text-indigo-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(s.iduser, 'siswa')}
                              title="Hapus Akun Siswa"
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada data siswa yang cocok.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'admin' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02] text-slate-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Nama Admin</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">No. Telepon</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-gray-300">
                  {filterList(selectedInstansi.admins).length > 0 ? (
                    filterList(selectedInstansi.admins).map((u: any) => (
                      <tr key={u.iduser_bo} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-black text-xs flex items-center justify-center shrink-0">
                            {u.nama?.charAt(0) || 'A'}
                          </div>
                          <span>{u.nama}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-gray-400">{u.login_username}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-gray-400">{u.login_email}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{u.telp || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteMember(u.iduser_bo, 'admin')}
                            title="Hapus Akun Admin"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada data admin sekolah lain.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUPER ADMIN VIEW: Multi-institution Grid List */}
      {isSuperAdmin && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama instansi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              Memuat daftar instansi...
            </div>
          ) : instansiList.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold text-slate-400">
              Belum ada instansi yang terdaftar.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instansiList.map((inst) => (
                  <div
                    key={inst.idkategori}
                    className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30 transition shadow-sm hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <School className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">{inst.nama_kategori}</h3>
                            <p className="text-[11px] font-mono text-slate-400">ID: {inst.idkategori}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingInstansiId(inst.idkategori);
                              setInstansiFormName(inst.nama_kategori);
                              setShowInstansiModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInstansi(inst.idkategori, inst.nama_kategori)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-center">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                          <span className="block text-xs font-bold text-slate-800 dark:text-gray-200">{inst.admin_count}</span>
                          <span className="text-[10px] text-slate-400">Admin</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                          <span className="block text-xs font-bold text-slate-800 dark:text-gray-200">{inst.guru_count}</span>
                          <span className="text-[10px] text-slate-400">Guru</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                          <span className="block text-xs font-bold text-slate-800 dark:text-gray-200">{inst.siswa_count}</span>
                          <span className="text-[10px] text-slate-400">Siswa</span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
                          <span className="block text-xs font-bold text-slate-800 dark:text-gray-200">{inst.kelas_count}</span>
                          <span className="text-[10px] text-slate-400">Kelas</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => openInstansiDetail(inst)}
                      className="mt-4 w-full py-2.5 px-3 bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Kelola Anggota Instansi
                      <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
                <Pagination
                  currentPage={paginationMeta.currentPage}
                  lastPage={paginationMeta.lastPage}
                  total={paginationMeta.total}
                  perPage={paginationMeta.perPage}
                  from={paginationMeta.from}
                  to={paginationMeta.to}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* MODAL MEMBER ADD / EDIT */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {memberForm.id ? 'Edit Data' : 'Tambah'} {activeTab === 'admin' ? 'Admin Sekolah' : activeTab === 'guru' ? 'Guru Pengajar' : 'Siswa'}
              </h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap"
                  value={memberForm.nama}
                  onChange={(e) => setMemberForm({ ...memberForm, nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                />
              </div>

              {activeTab === 'siswa' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">NISN</label>
                    <input
                      type="text"
                      placeholder="Nomor Induk Siswa Nasional"
                      value={memberForm.nisn}
                      onChange={(e) => setMemberForm({ ...memberForm, nisn: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Kelas Rombel</label>
                    <select
                      value={memberForm.idkelas}
                      onChange={(e) => setMemberForm({ ...memberForm, idkelas: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="">Pilih Kelas</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama_kelas}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {activeTab !== 'siswa' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">NUPTK / Username</label>
                  <input
                    type="text"
                    required
                    placeholder="Username atau NUPTK"
                    value={memberForm.username}
                    onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Email Login</label>
                <input
                  type="email"
                  required
                  placeholder="email@sekolah.sch.id"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">No. Telepon</label>
                <input
                  type="text"
                  placeholder="0812xxxxxxxx"
                  value={memberForm.telp}
                  onChange={(e) => setMemberForm({ ...memberForm, telp: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  {memberForm.id ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Awal'}
                </label>
                <input
                  type="password"
                  placeholder={memberForm.id ? '••••••••' : 'Min. 5 karakter'}
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-gray-400 font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-600/30"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER ADMIN MODAL DETAIL INSTANSI */}
      {isSuperAdmin && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0c101d] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Detail Anggota Instansi
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedInstansi.instansi.nama_kategori}
                </h2>
              </div>
              <button
                onClick={() => setSelectedInstansi(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-2xl">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin ({selectedInstansi.admins?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('guru')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'guru' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Guru ({selectedInstansi.gurus?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('siswa')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'siswa' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Siswa ({selectedInstansi.siswas?.length || 0})
                </button>
              </div>

              <button
                onClick={handleOpenAddMember}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah {activeTab === 'admin' ? 'Admin' : activeTab === 'guru' ? 'Guru' : 'Siswa'}
              </button>
            </div>

            {/* Content for super admin modal */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === 'guru' && (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 font-bold">
                      <th className="py-2.5">Nama Guru</th>
                      <th>Email</th>
                      <th className="text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInstansi.gurus?.map((g: any) => (
                      <tr key={g.iduser_bo} className="border-b border-slate-100 dark:border-white/5 py-2">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{g.nama}</td>
                        <td className="text-slate-500">{g.login_email}</td>
                        <td className="text-right">
                          <button onClick={() => handleDeleteMember(g.iduser_bo, 'guru')} className="text-rose-500 p-1">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUPER ADMIN MODAL ADD / EDIT INSTANSI */}
      {showInstansiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {editingInstansiId ? 'Edit Nama Instansi' : 'Tambah Instansi Baru'}
              </h3>
              <button onClick={() => setShowInstansiModal(false)} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveInstansi} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">Nama Instansi / Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Yogyakarta"
                  value={instansiFormName}
                  onChange={(e) => setInstansiFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInstansiModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InstansiPage;
