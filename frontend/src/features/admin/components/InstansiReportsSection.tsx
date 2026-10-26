import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/client';
import { 
  GraduationCap, Award, Search, 
  CheckCircle2, TrendingUp, TrendingDown,
  FileSpreadsheet, UserCheck, RefreshCw
} from 'lucide-react';

interface GuruMengajarItem {
  id: number;
  nama_kelas: string;
  jenjang: string;
  wali_kelas: {
    id: number;
    nama: string;
    nip: string;
  } | null;
  guru_pengampu: Array<{
    idmapel: number;
    nama_mapel: string;
    idguru: number;
    nama_guru: string;
    nip: string;
  }>;
}

interface SiswaPerKelasItem {
  id: number;
  nama_kelas: string;
  jenjang: string;
  total_siswa: number;
  siswa: Array<{
    id: number;
    nisn: string | null;
    nis: string | null;
    nama: string;
    email: string | null;
    username: string;
  }>;
}

interface RekapNilaiItem {
  id: number;
  judul_ujian: string;
  mapel: string;
  total_soal: number;
  total_peserta: number;
  nilai_rata_rata: number;
  nilai_tertinggi: number;
  nilai_terendah: number;
  peserta: Array<{
    attempt_id: number;
    student_id: number;
    nama_siswa: string;
    nisn: string | null;
    kelas: string;
    nilai: number;
    total_soal: number;
    jawaban_benar: number;
    jawaban_salah: number;
    status: string;
  }>;
}

export const InstansiReportsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guru_kelas' | 'siswa_kelas' | 'rekap_nilai'>('guru_kelas');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{
    guru_mengajar: GuruMengajarItem[];
    siswa_per_kelas: SiswaPerKelasItem[];
    rekap_nilai_ujian: RekapNilaiItem[];
  }>({
    guru_mengajar: [],
    siswa_per_kelas: [],
    rekap_nilai_ujian: []
  });

  // Tab 1 filters
  const [guruSearch, setGuruSearch] = useState('');

  // Tab 2 filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [studentSearch, setStudentSearch] = useState('');

  // Tab 3 filters
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/dashboard/reports');
      const data = res.data?.reports || res.data || {};
      const rekapList: RekapNilaiItem[] = data.rekap_nilai_ujian || [];
      
      setReports({
        guru_mengajar: data.guru_mengajar || [],
        siswa_per_kelas: data.siswa_per_kelas || [],
        rekap_nilai_ujian: rekapList
      });

      if (rekapList.length > 0 && !selectedExamId) {
        setSelectedExamId(rekapList[0].id);
      }
    } catch (err) {
      console.error('Failed to load instansi reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered Guru Mengajar
  const filteredGuruMengajar = reports.guru_mengajar.filter((item) => {
    const q = guruSearch.toLowerCase();
    const matchClass = item.nama_kelas.toLowerCase().includes(q);
    const matchWali = item.wali_kelas?.nama?.toLowerCase().includes(q) || false;
    const matchGuru = item.guru_pengampu.some(g => 
      g.nama_guru.toLowerCase().includes(q) || g.nama_mapel.toLowerCase().includes(q)
    );
    return matchClass || matchWali || matchGuru;
  });

  // Filtered Siswa per Kelas
  const activeSiswaClasses = selectedClassId === 'all'
    ? reports.siswa_per_kelas
    : reports.siswa_per_kelas.filter(c => c.id.toString() === selectedClassId);

  const allFilteredStudents = activeSiswaClasses.flatMap(c => 
    c.siswa.map(s => ({ ...s, kelas: c.nama_kelas }))
  ).filter(s => {
    const q = studentSearch.toLowerCase();
    return s.nama.toLowerCase().includes(q) || 
      (s.nisn && s.nisn.includes(q)) || 
      (s.username && s.username.toLowerCase().includes(q));
  });

  // Selected Exam for Rekap Nilai
  const currentExam = reports.rekap_nilai_ujian.find(e => e.id === selectedExamId) || reports.rekap_nilai_ujian[0];

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 space-y-6 border border-slate-200/80 dark:border-white/5 animate-fade-in shadow-xl">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/30">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Laporan Instansi & Hasil Akademik</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Terintegrasi
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Transparansi sebaran guru mengajar, daftar siswa per rombel, dan rekapitulasi nilai paket ujian instansi.
            </p>
          </div>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300 transition shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('guru_kelas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'guru_kelas'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>1. Guru Mengajar Kelas Apa ({reports.guru_mengajar.length} Rombel)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('siswa_kelas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'siswa_kelas'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>2. Daftar Siswa per Kelas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rekap_nilai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rekap_nilai'
              ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>3. Nilai Siswa & Rekap Ujian ({reports.rekap_nilai_ujian.length} Paket)</span>
        </button>
      </div>

      {/* TAB 1: GURU MENGAJAR KELAS APA */}
      {activeTab === 'guru_kelas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={guruSearch}
                onChange={(e) => setGuruSearch(e.target.value)}
                placeholder="Cari nama kelas, wali kelas, atau guru pengampu..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Menampilkan {filteredGuruMengajar.length} dari {reports.guru_mengajar.length} rombongan belajar
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Memuat data guru mengajar...</div>
          ) : filteredGuruMengajar.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredGuruMengajar.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-4 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition shadow-xs"
                >
                  {/* Class Header & Wali Kelas */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          {item.nama_kelas}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                          {item.jenjang || 'Reguler'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 font-medium mt-0.5">
                        {item.guru_pengampu.length} Mata Pelajaran Terjadwal
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Wali Kelas
                      </span>
                      {item.wali_kelas ? (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{item.wali_kelas.nama}</span>
                        </span>
                      ) : (
                        <span className="text-xs italic text-slate-400">Belum Ditugaskan</span>
                      )}
                    </div>
                  </div>

                  {/* Guru Pengampu per Mapel */}
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Guru Pengampu Mata Pelajaran:
                    </h4>

                    {item.guru_pengampu.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {item.guru_pengampu.map((gp, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-xs"
                          >
                            <span className="font-bold text-slate-900 dark:text-white">
                              {gp.nama_mapel}
                            </span>
                            <div className="text-right">
                              <span className="text-indigo-700 dark:text-indigo-300 font-semibold block">
                                {gp.nama_guru}
                              </span>
                              {gp.nip && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  NIP: {gp.nip}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-slate-400 py-2">
                        Belum ada guru pengampu yang terdaftar di kelas ini.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Tidak ada data rombel kelas atau guru yang sesuai filter.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAFTAR SISWA PER KELAS */}
      {activeTab === 'siswa_kelas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Semua Rombel Kelas</option>
                {reports.siswa_per_kelas.map(c => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.nama_kelas} ({c.total_siswa} Siswa)
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Cari nama atau NISN..."
                  className="pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
              Total {allFilteredStudents.length} Siswa Terdaftar
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5 text-center w-12">No</th>
                  <th className="py-3 px-3.5">Nama Lengkap</th>
                  <th className="py-3 px-3.5">NISN / NIS</th>
                  <th className="py-3 px-3.5">Kelas / Rombel</th>
                  <th className="py-3 px-3.5">Akun Login</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                {allFilteredStudents.length > 0 ? (
                  allFilteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-3.5 text-center font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                            {s.nama.charAt(0).toUpperCase()}
                          </div>
                          <span>{s.nama}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px]">
                        {s.nisn ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{s.nisn}</span>
                        ) : (
                          <span className="text-slate-400 italic">Tanpa NISN</span>
                        )}
                        {s.nis && <span className="block text-[10px] text-slate-400">NIS: {s.nis}</span>}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300 border border-slate-200 dark:border-white/5">
                          {s.kelas}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-[11px] text-slate-500 dark:text-gray-400">
                        {s.email || s.username}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                          Aktif Siap Ujian
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada data siswa ditemukan pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: NILAI SISWA PER PAKET UJIAN & REKAP */}
      {activeTab === 'rekap_nilai' && (
        <div className="space-y-5">
          
          {/* Exam Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider shrink-0">
                Pilih Paket Ujian:
              </label>
              <select
                value={selectedExamId || ''}
                onChange={(e) => setSelectedExamId(parseInt(e.target.value))}
                className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-md"
              >
                {reports.rekap_nilai_ujian.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.mapel}] {e.judul_ujian} ({e.total_peserta} Siswa)
                  </option>
                ))}
              </select>
            </div>

            {currentExam && (
              <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">
                {currentExam.total_soal} Butir Soal Terpasang
              </span>
            )}
          </div>

          {currentExam ? (
            <div className="space-y-5">
              {/* Statistical Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                    Peserta Ujian
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {currentExam.total_peserta} Siswa
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 block">
                    Nilai Rata-Rata
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                    {currentExam.nilai_rata_rata}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>Nilai Tertinggi</span>
                  </span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                    {currentExam.nilai_tertinggi}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    <span>Nilai Terendah</span>
                  </span>
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
                    {currentExam.nilai_terendah}
                  </span>
                </div>
              </div>

              {/* Students Score Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/5">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5 text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-3.5 text-center w-12">Rank</th>
                      <th className="py-3 px-3.5">Nama Siswa</th>
                      <th className="py-3 px-3.5">NISN</th>
                      <th className="py-3 px-3.5">Kelas</th>
                      <th className="py-3 px-3.5 text-center">Benar / Salah</th>
                      <th className="py-3 px-3.5 text-center">Nilai Akhir</th>
                      <th className="py-3 px-3.5 text-center">Hasil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 text-slate-700 dark:text-gray-300 font-medium">
                    {currentExam.peserta && currentExam.peserta.length > 0 ? (
                      currentExam.peserta.map((p, idx) => {
                        const passed = p.nilai >= 75;
                        return (
                          <tr key={p.attempt_id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition">
                            <td className="py-2.5 px-3.5 text-center font-black">
                              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] ${
                                idx === 0 
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-black' 
                                  : idx === 1 
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' 
                                  : idx === 2 
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                                  : 'text-slate-400'
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white">
                              {p.nama_siswa}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-[11px]">
                              {p.nisn || '-'}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-gray-300">
                                {p.kelas}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-mono text-[11px]">
                              <span className="text-emerald-600 font-bold">{p.jawaban_benar}</span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className="text-rose-600 font-bold">{p.jawaban_salah}</span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center font-black text-sm text-slate-900 dark:text-white">
                              {p.nilai}
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                passed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                              }`}>
                                {passed ? 'Tuntas' : 'Remedial'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                          Belum ada data nilai terkumpul untuk paket ujian ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs">
              Belum ada paket ujian yang aktif di instansi ini.
            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default InstansiReportsSection;
