import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Building2, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  Edit3, 
  X,
  Layers
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';

export const PlatformSubscriptionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    packages: any[];
    institutions: any[];
    summary: any;
  }>({
    packages: [],
    institutions: [],
    summary: {
      total_institutions: 0,
      active_subscriptions: 0,
      total_licensed_students: 0,
      total_active_students: 0,
      avg_quota_utilization: 0,
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstansi, setSelectedInstansi] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    package_id: 'standard',
    max_students: 500,
    valid_until: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/super-admin/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenEdit = (instansi: any) => {
    setSelectedInstansi(instansi);
    setEditForm({
      package_id: instansi.package_id || 'standard',
      max_students: instansi.max_students || 500,
      valid_until: instansi.valid_until || '',
      status: instansi.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveQuota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstansi) return;

    setSubmitting(true);
    try {
      await apiClient.put(`/super-admin/subscriptions/${selectedInstansi.idkategori}`, editForm);
      setSuccessMsg(`Kuota dan paket ${selectedInstansi.name} berhasil diperbarui.`);
      setIsEditModalOpen(false);
      fetchSubscriptions();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan kuota.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInstitutions = data.institutions.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-2 border-[#161C2D] dark:border-indigo-500/40 text-xs font-black mb-3 shadow-[2px_2px_0px_0px_#171717]">
              <CreditCard className="h-4 w-4" />
              <span>Subscription & Licensing Platform</span>
            </div>
            <h1 className="text-2xl font-black text-[#161C2D] dark:text-white tracking-tight">
              Manajemen Paket & Kuota Instansi
            </h1>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 font-semibold max-w-2xl">
              Kontrol alokasi kapasitas siswa, lisensi paket sekolah mitra, dan pemantauan masa aktif secara tersentralisasi di tingkat platform owner.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-2 border-[#161C2D] dark:border-emerald-500/40 rounded-xl shadow-[2px_2px_0px_0px_#171717]">
              ● Server Multi-Tenant Aktif
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-bold shadow-[3px_3px_0px_0px_#059669] flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1A1E22] p-5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Total Instansi Berlangganan</span>
            <Building2 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-[#161C2D] dark:text-white">{data.summary.total_institutions} Mitra</div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1">100% Status Operasional</div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] p-5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Total Lisensi Siswa</span>
            <Users className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-[#161C2D] dark:text-white">{data.summary.total_licensed_students.toLocaleString()} Kuota</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">Kapasitas Maksimal Platform</div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] p-5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Siswa Aktif Terdaftar</span>
            <Sparkles className="h-5 w-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#161C2D] dark:text-white">{data.summary.total_active_students.toLocaleString()} Siswa</div>
          <div className="text-[11px] text-indigo-600 font-bold mt-1">Terisi di database</div>
        </div>

        <div className="bg-white dark:bg-[#1A1E22] p-5 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-gray-400">Utilisasi Kuota Global</span>
            <Layers className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-[#161C2D] dark:text-white">{data.summary.avg_quota_utilization}%</div>
          <div className="text-[11px] text-slate-500 font-semibold mt-1">Rata-rata Penggunaan</div>
        </div>
      </div>

      {/* Tier Packages Showcase */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-[#161C2D] dark:text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          <span>Tier Paket Berlangganan Platform</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.packages.map((pkg) => (
            <div 
              key={pkg.id}
              className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-5 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {pkg.badge}
                  </span>
                  <span className="text-xs font-bold text-slate-500">12 Bulan</span>
                </div>
                <h3 className="text-base font-black text-[#161C2D] dark:text-white">{pkg.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    Rp {(pkg.price_annual / 1000000).toLocaleString()} Juta
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold"> / tahun</span>
                </div>

                <div className="space-y-1.5 text-xs border-t border-slate-200 dark:border-white/10 pt-3">
                  <div className="flex justify-between font-bold text-[#161C2D] dark:text-gray-200">
                    <span>Maks Siswa:</span>
                    <span className="text-indigo-600">{pkg.max_students.toLocaleString()} Akun</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#161C2D] dark:text-gray-200">
                    <span>Ujian Konkuren:</span>
                    <span>{pkg.max_concurrent_exams} Sesi</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#161C2D] dark:text-gray-200">
                    <span>Cloud Storage:</span>
                    <span>{(pkg.storage_mb / 1024).toFixed(0)} GB</span>
                  </div>
                </div>

                <div className="mt-4 space-y-1">
                  {pkg.features.map((f: string, fIdx: number) => (
                    <div key={fIdx} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-gray-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instansi Subscription List */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-xl p-5 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-black text-[#161C2D] dark:text-white">Daftar Penggunaan Kuota Mitra Instansi</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">Kelola batas kuota siswa dan masa aktif instansi sekolah.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari instansi..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-semibold focus:border-[#38B1ED] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[11px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Nama Instansi</th>
                <th className="py-3 px-3">Paket Tier</th>
                <th className="py-3 px-3">Penggunaan Kuota Siswa</th>
                <th className="py-3 px-3 text-center">Guru</th>
                <th className="py-3 px-3 text-center">Kelas</th>
                <th className="py-3 px-3">Masa Aktif</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y border-[#161C2D]/10 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 font-bold">
                    Memuat data langganan instansi...
                  </td>
                </tr>
              ) : filteredInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500 font-bold">
                    Tidak ditemukan data instansi.
                  </td>
                </tr>
              ) : (
                filteredInstitutions.map((i) => (
                  <tr key={i.idkategori} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-3 font-bold text-[#161C2D] dark:text-white">
                      {i.name}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">ID: {i.idkategori}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {i.package_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 min-w-[180px]">
                      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                        <span>{i.active_students} / {i.max_students}</span>
                        <span className={i.usage_percent > 85 ? 'text-rose-600' : 'text-slate-500'}>
                          {i.usage_percent}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-white/5">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            i.usage_percent > 85 ? 'bg-rose-500' : (i.usage_percent > 60 ? 'bg-amber-500' : 'bg-indigo-600')
                          }`}
                          style={{ width: `${Math.min(100, i.usage_percent)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold">{i.active_teachers}</td>
                    <td className="py-3.5 px-3 text-center font-bold">{i.classes_count}</td>
                    <td className="py-3.5 px-3 text-slate-600 dark:text-gray-300 font-medium">
                      <div className="flex items-center gap-1.5 font-bold">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{i.valid_until}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">({i.days_remaining} hari lagi)</span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        Aktif
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => handleOpenEdit(i)}
                        className="px-2.5 py-1.5 bg-white dark:bg-[#262A2E] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-2 border-[#161C2D] dark:border-[#32363A] rounded-lg font-bold text-xs shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-1 mx-auto"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Kelola Kuota</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quota Modal */}
      {isEditModalOpen && selectedInstansi && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl w-full max-w-lg shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] overflow-hidden">
            <div className="p-5 border-b-2 border-[#161C2D] dark:border-[#32363A] flex items-center justify-between bg-slate-50 dark:bg-[#0B1014]/40">
              <div>
                <h3 className="font-black text-base text-[#161C2D] dark:text-white">Ubah Kuota & Lisensi Instansi</h3>
                <p className="text-xs text-slate-500 font-semibold">{selectedInstansi.name}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg border-2 border-transparent hover:border-[#161C2D] hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuota} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Paket Berlangganan
                </label>
                <select
                  value={editForm.package_id}
                  onChange={(e) => {
                    const pkg = e.target.value;
                    const defaultMax = pkg === 'enterprise' ? 5000 : (pkg === 'pro' ? 1500 : (pkg === 'standard' ? 500 : 200));
                    setEditForm({ ...editForm, package_id: pkg, max_students: defaultMax });
                  }}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                >
                  <option value="starter">Paket Starter (Maks 200 Siswa)</option>
                  <option value="standard">Paket Standard (Maks 500 Siswa)</option>
                  <option value="pro">Paket Pro / Unggulan (Maks 1.500 Siswa)</option>
                  <option value="enterprise">Paket Enterprise (Maks 5.000 Siswa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Batas Kuota Siswa (Kapasitas Akun)
                </label>
                <input
                  type="number"
                  value={editForm.max_students}
                  onChange={(e) => setEditForm({ ...editForm, max_students: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  min={10}
                  max={50000}
                  required
                />
                <span className="text-[10px] text-slate-400">Siswa saat ini: {selectedInstansi.active_students} siswa</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Masa Berlaku Lisensi Sampai
                </label>
                <input
                  type="date"
                  value={editForm.valid_until}
                  onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-gray-300 mb-1.5">
                  Status Langganan
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#0B1014] border-2 border-[#C3CCD8] dark:border-[#32363A] rounded-lg text-xs font-bold"
                >
                  <option value="active">Aktif (Dapat Ujian & Login)</option>
                  <option value="suspended">Ditangguhkan / Suspend</option>
                  <option value="expired">Masa Berlaku Habis (Expired)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border-2 border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] dark:shadow-[2px_2px_0px_0px_#000000] text-xs font-bold hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kuota & Lisensi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
