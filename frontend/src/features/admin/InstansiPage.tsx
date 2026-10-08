import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { toast } from '../../shared/context/ToastContext';
import { 
  Building2, Plus, Users, School, 
  Trash2, Edit, ChevronRight, Search, X
} from 'lucide-react';

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
  const [instansiList, setInstansiList] = useState<InstansiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Selected Instansi Modal for Member Management
  const [selectedInstansi, setSelectedInstansi] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'admin' | 'guru' | 'siswa'>('admin');
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add/Edit Instansi Modal
  const [showInstansiModal, setShowInstansiModal] = useState(false);
  const [instansiFormName, setInstansiFormName] = useState('');
  const [editingInstansiId, setEditingInstansiId] = useState<string | null>(null);

  // Add Member Modal (Admin, Guru, Siswa)
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

  const fetchInstansi = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/instansi', { params: { search } });
      setInstansiList(res.data || []);
    } catch (err) {
      toast.error('Gagal memuat daftar instansi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstansi();
  }, [search]);

  const openInstansiDetail = async (instansi: InstansiItem) => {
    setLoadingDetail(true);
    setSelectedInstansi(null);
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
      // Reload detail
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

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            Manajemen Instansi & Sekolah
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Kelola instansi mitra, admin sekolah, guru pengajar, dan siswa per instansi.
          </p>
        </div>

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
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari nama instansi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </div>

      {/* Grid List of Instansi */}
      {loading ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">
          Memuat daftar instansi...
        </div>
      ) : instansiList.length === 0 ? (
        <div className="py-16 text-center text-xs font-semibold text-slate-400">
          Belum ada instansi yang terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instansiList.map((inst) => (
            <div
              key={inst.idkategori}
              className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-indigo-500/30 transition shadow-sm hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <School className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingInstansiId(inst.idkategori);
                        setInstansiFormName(inst.nama_kategori);
                        setShowInstansiModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition"
                      title="Edit Nama"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteInstansi(inst.idkategori, inst.nama_kategori)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="Hapus / Nonaktifkan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-3 line-clamp-1">
                  {inst.nama_kategori}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {inst.idkategori}</p>

                {/* Badges Count */}
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
                Kelola Pengguna & Anggota
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </button>
            </div>
          ))}
        </div>
      )}

      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="px-5 py-3 bg-white dark:bg-slate-900 rounded-2xl shadow-xl text-xs font-bold text-slate-800 dark:text-white">
            Memuat detail anggota instansi...
          </div>
        </div>
      )}

      {/* Modal Detail Instansi & CRUD Pengguna */}
      {selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0c101d] rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-white/10 max-h-[90vh] flex flex-col">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Detail Instansi
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedInstansi.instansi.nama_kategori}
                </h2>
              </div>
              <button
                onClick={() => setSelectedInstansi(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-tabs & Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-white/[0.03] rounded-2xl">
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'admin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                  }`}
                >
                  Admin Sekolah ({selectedInstansi.admins?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('guru')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'guru'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                  }`}
                >
                  Guru Pengajar ({selectedInstansi.gurus?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('siswa')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'siswa'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
                  }`}
                >
                  Siswa ({selectedInstansi.siswas?.length || 0})
                </button>
              </div>

              <button
                onClick={handleOpenAddMember}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah {activeTab === 'admin' ? 'Admin' : activeTab === 'guru' ? 'Guru' : 'Siswa'}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4">
              {activeTab === 'admin' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-bold">
                        <th className="py-2.5">Nama</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Telepon</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {selectedInstansi.admins.map((u: any) => (
                        <tr key={u.iduser_bo} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-white">{u.nama}</td>
                          <td className="font-mono text-slate-500">{u.login_username}</td>
                          <td className="text-slate-600 dark:text-gray-400">{u.login_email}</td>
                          <td className="text-slate-500">{u.telp || '-'}</td>
                          <td className="text-right">
                            <button
                              onClick={() => handleDeleteMember(u.iduser_bo, 'admin')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'guru' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-bold">
                        <th className="py-2.5">Nama Guru</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Telepon</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {selectedInstansi.gurus.map((g: any) => (
                        <tr key={g.iduser_bo} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-white">{g.nama}</td>
                          <td className="font-mono text-slate-500">{g.login_username}</td>
                          <td className="text-slate-600 dark:text-gray-400">{g.login_email}</td>
                          <td className="text-slate-500">{g.telp || '-'}</td>
                          <td className="text-right">
                            <button
                              onClick={() => handleDeleteMember(g.iduser_bo, 'guru')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'siswa' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/5 text-slate-400 font-bold">
                        <th className="py-2.5">Nama Siswa</th>
                        <th>NISN</th>
                        <th>Email</th>
                        <th>Kelas</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {selectedInstansi.siswas.map((s: any) => (
                        <tr key={s.iduser} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="py-2.5 font-bold text-slate-800 dark:text-white">{s.nama}</td>
                          <td className="font-mono text-slate-500">{s.nisn}</td>
                          <td className="text-slate-600 dark:text-gray-400">{s.login_email}</td>
                          <td className="text-slate-600 dark:text-gray-300 font-medium">{s.kelas?.nama_kelas || '-'}</td>
                          <td className="text-right">
                            <button
                              onClick={() => handleDeleteMember(s.iduser, 'siswa')}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Modal Add / Edit Instansi */}
      {showInstansiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0c101d] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-up">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              {editingInstansiId ? 'Edit Nama Instansi' : 'Tambah Instansi Baru'}
            </h2>
            <form onSubmit={handleSaveInstansi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Nama Instansi / Sekolah</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: SMA Negeri 1 Yogyakarta"
                  value={instansiFormName}
                  onChange={(e) => setInstansiFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInstansiModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Member (Admin, Guru, Siswa) */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#0c101d] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-scale-up">
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">
              Tambah {activeTab === 'admin' ? 'Admin Sekolah' : activeTab === 'guru' ? 'Guru' : 'Siswa'} Baru
            </h2>
            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={memberForm.nama}
                  onChange={(e) => setMemberForm({ ...memberForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                />
              </div>

              {activeTab !== 'siswa' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    value={memberForm.username}
                    onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">NISN</label>
                  <input
                    type="text"
                    required
                    value={memberForm.nisn}
                    onChange={(e) => setMemberForm({ ...memberForm, nisn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                />
              </div>

              {activeTab === 'siswa' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Pilih Kelas</label>
                  <select
                    value={memberForm.idkelas}
                    onChange={(e) => setMemberForm({ ...memberForm, idkelas: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- Tanpa Kelas --</option>
                    {availableClasses.map((c) => (
                      <option key={c.id} value={c.id}>{c.nama_kelas}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Default: 12345"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow"
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

export default InstansiPage;
