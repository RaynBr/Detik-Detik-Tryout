import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { useAuth } from '../../shared/context/AuthContext';
import { toast } from '../../shared/context/ToastContext';
import {
  Shield, UserPlus, Users, Eye, Search, X,
  Building2, Phone, Mail, MapPin, ChevronRight
} from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePaginationUrl } from '../../shared/utils/usePaginationUrl';

interface UserItem {
  iduser_bo: string;
  nama: string;
  username: string;
  email: string;
  jenis_kelamin?: 'L' | 'P';
  telp: string;
  alamat: string;
  role: string;
  instansi?: string;
  idkategori?: string;
  status_aktif: string;
  last_login_at: string | null;
}

interface MonitoringItem {
  idkategori: string;
  nama_instansi: string;
  total_admin: number;
  total_guru: number;
  total_siswa: number;
  admins: { id: string; nama: string; username: string }[];
  gurus: { id: string; nama: string; email: string; telp: string }[];
}

type TabType = 'super_admin' | 'admin_instansi' | 'monitoring';

export const UsersManagementPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<TabType>('super_admin');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Super Admin list
  const [superAdmins, setSuperAdmins] = useState<UserItem[]>([]);
  // Admin Instansi list
  const [adminInstansi, setAdminInstansi] = useState<UserItem[]>([]);
  // Monitoring data
  const [monitoringData, setMonitoringData] = useState<MonitoringItem[]>([]);
  // Instansi list for dropdown
  const [instansiList, setInstansiList] = useState<any[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nama: '', username: '', email: '', jenis_kelamin: '', telp: '', alamat: '', password: '', idkategori: ''
  });

  const {
    currentPage,
    setPage,
    resetPage,
    paginationMeta,
    setPaginationFromResponse
  } = usePaginationUrl(15);

  const fetchSuperAdmins = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users/super-admins', { params: { search, page } });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setSuperAdmins(list);
    } catch { toast.error('Gagal memuat data Super Admin.'); }
    finally { setLoading(false); }
  };

  const fetchAdminInstansi = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users/admin-instansi', { params: { search, page } });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAdminInstansi(list);
    } catch { toast.error('Gagal memuat data Admin Instansi.'); }
    finally { setLoading(false); }
  };

  const fetchMonitoring = async (page = currentPage) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/users/monitoring-guru-siswa', { params: { page } });
      setPaginationFromResponse(res.data);
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setMonitoringData(list);
    } catch { toast.error('Gagal memuat data monitoring.'); }
    finally { setLoading(false); }
  };

  const fetchInstansiList = async () => {
    try {
      const res = await apiClient.get('/admin/instansi', { params: { all: true } });
      setInstansiList(res.data?.data || (Array.isArray(res.data) ? res.data : []));
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'super_admin') fetchSuperAdmins(currentPage);
    else if (activeTab === 'admin_instansi') fetchAdminInstansi(currentPage);
    else fetchMonitoring(currentPage);
  }, [activeTab, search, currentPage]);

  const openCreateModal = () => {
    setForm({ nama: '', username: '', email: '', jenis_kelamin: '', telp: '', alamat: '', password: '', idkategori: '' });
    if (activeTab === 'admin_instansi') fetchInstansiList();
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      if (activeTab === 'super_admin') {
        await apiClient.post('/admin/users/super-admins', form);
        toast.success('Super Admin berhasil dibuat!');
        fetchSuperAdmins();
      } else {
        await apiClient.post('/admin/users/admin-instansi', form);
        toast.success('Admin Instansi berhasil dibuat!');
        fetchAdminInstansi();
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan data.');
    }
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'super_admin', label: 'Super Admin', icon: Shield },
    { key: 'admin_instansi', label: 'Admin Instansi', icon: Building2 },
    { key: 'monitoring', label: 'Monitoring Guru & Siswa', icon: Eye },
  ];

  const renderUserCard = (u: UserItem) => (
    <div key={u.iduser_bo} className="glass-panel rounded-2xl p-5 space-y-3 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/20">
            {u.nama?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{u.nama}</h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-mono">@{u.username}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
            u.role === 'super_admin'
              ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20'
              : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
          }`}>
            {u.role === 'super_admin' ? 'Super Admin' : 'Admin Sekolah'}
          </span>
          {u.jenis_kelamin && (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-gray-400">
              {u.jenis_kelamin === 'L' ? '♂ Laki-laki' : '♀ Perempuan'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {u.email && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{u.email}</span>
          </div>
        )}
        {u.telp && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>{u.telp}</span>
          </div>
        )}
        {u.instansi && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{u.instansi}</span>
          </div>
        )}
        {u.alamat && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            <span className="truncate">{u.alamat}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          u.status_aktif === 'Y'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
        }`}>
          {u.status_aktif === 'Y' ? 'Aktif' : 'Nonaktif'}
        </span>
        {u.last_login_at && (
          <span className="text-[10px] text-slate-400 dark:text-gray-500">
            Login terakhir: {new Date(u.last_login_at).toLocaleDateString('id-ID')}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Kelola Pengguna</h1>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Manajemen Super Admin, Admin Instansi, dan monitoring Guru/Siswa nasional</p>
        </div>
        {isSuperAdmin && activeTab !== 'monitoring' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <UserPlus className="h-4 w-4" />
            <span>{activeTab === 'super_admin' ? 'Tambah Super Admin' : 'Tambah Admin Instansi'}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); resetPage(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-white/10 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search (for Super Admin & Admin Instansi tabs) */}
      {activeTab !== 'monitoring' && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Cari berdasarkan nama, username, atau email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
            {search && (
              <button onClick={() => { setSearch(''); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500 font-semibold px-2 shrink-0">
            Total: {paginationMeta.total}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-panel rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-slate-200 dark:bg-white/10 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded w-1/3" />
                </div>
              </div>
              <div className="h-8 bg-slate-100 dark:bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : activeTab === 'monitoring' ? (
        /* Monitoring Guru & Siswa */
        <div className="space-y-4">
          {monitoringData.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center">
              <Eye className="h-12 w-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-gray-400">Belum ada data instansi untuk dipantau</p>
            </div>
          ) : (
            monitoringData.map(inst => (
              <div key={inst.idkategori} className="glass-panel rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{inst.nama_instansi}</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {inst.total_admin} Admin · {inst.total_guru} Guru · {inst.total_siswa} Siswa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                      {inst.total_guru + inst.total_siswa} Total Pengguna
                    </span>
                  </div>
                </div>

                {/* Admin list */}
                {inst.admins.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Admin Instansi</p>
                    <div className="flex flex-wrap gap-2">
                      {inst.admins.map(a => (
                        <span key={a.id} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/5 text-blue-700 dark:text-blue-400 text-[11px] font-semibold rounded-lg border border-blue-100 dark:border-blue-500/10">
                          {a.nama} (@{a.username})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Guru summary */}
                {inst.gurus.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Daftar Guru ({inst.total_guru})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {inst.gurus.slice(0, 6).map(g => (
                        <div key={g.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/[0.02] rounded-lg text-xs">
                          <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                            {g.nama?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800 dark:text-white truncate">{g.nama}</p>
                            {g.email && <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">{g.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {inst.gurus.length > 6 && (
                      <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" /> dan {inst.gurus.length - 6} guru lainnya...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Super Admin / Admin Instansi Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(activeTab === 'super_admin' ? superAdmins : adminInstansi).length === 0 ? (
            <div className="col-span-full glass-panel rounded-2xl p-12 text-center">
              <Users className="h-12 w-12 text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-gray-400">
                {search ? 'Tidak ada hasil pencarian' : 'Belum ada data pengguna'}
              </p>
            </div>
          ) : (
            (activeTab === 'super_admin' ? superAdmins : adminInstansi).map(renderUserCard)
          )}
        </div>
      )}

      <Pagination
        currentPage={paginationMeta.currentPage}
        lastPage={paginationMeta.lastPage}
        total={paginationMeta.total}
        perPage={paginationMeta.perPage}
        from={paginationMeta.from}
        to={paginationMeta.to}
        onPageChange={setPage}
      />

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel rounded-3xl p-6 w-full max-w-lg space-y-5 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {activeTab === 'super_admin' ? 'Buat Super Admin Baru' : 'Buat Admin Instansi Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Nama Lengkap *</label>
                <input type="text" value={form.nama} onChange={e => setForm({...form, nama: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Username *</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Jenis Kelamin</label>
                  <select value={form.jenis_kelamin} onChange={e => setForm({...form, jenis_kelamin: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    <option value="">-- Pilih Jenis Kelamin --</option>
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">No. Telepon</label>
                <input type="text" value={form.telp} onChange={e => setForm({...form, telp: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Alamat</label>
                <input type="text" value={form.alamat} onChange={e => setForm({...form, alamat: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
              </div>
              {activeTab === 'admin_instansi' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-gray-300">Pilih Instansi *</label>
                  <select value={form.idkategori} onChange={e => setForm({...form, idkategori: e.target.value})} className="mt-1 w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white">
                    <option value="">-- Pilih Instansi --</option>
                    {instansiList.map((inst: any) => (
                      <option key={inst.idkategori} value={inst.idkategori}>{inst.nama_kategori}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition">Batal</button>
              <button onClick={handleSubmit} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default UsersManagementPage;
