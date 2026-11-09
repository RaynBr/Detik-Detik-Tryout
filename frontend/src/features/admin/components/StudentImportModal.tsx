import React, { useState } from 'react';
import { apiClient } from '../../../shared/api/client';
import { useToast } from '../../../shared/context/ToastContext';
import {
  X,
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Check
} from 'lucide-react';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialClassId?: number;
  initialAcademicYearId?: number;
}

interface PreviewRow {
  row_number: number;
  name: string;
  status: 'VALID' | 'INVALID';
  message: string;
  data: any;
}

interface PreviewData {
  total_data: number;
  valid_count: number;
  invalid_count: number;
  rows: PreviewRow[];
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialClassId,
  initialAcademicYearId
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Class and Academic Year Selection (Requirement 18)
  const [selectedClassId, setSelectedClassId] = useState<number | ''>(initialClassId || '');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<number | ''>(initialAcademicYearId || '');
  const [academicOptions, setAcademicOptions] = useState<{
    academic_years: Array<{ id: number; name: string }>;
    classes: Array<{ id: number; nama_kelas?: string; name?: string; academic_year_id?: number }>;
  }>({ academic_years: [], classes: [] });

  // Preview & Import state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [importSummary, setImportSummary] = useState<{ total: number; saved: number; failed: number; failedRows: any[] } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialClassId) setSelectedClassId(initialClassId);
      if (initialAcademicYearId) setSelectedAcademicYearId(initialAcademicYearId);

      // Fetch academic years & classes
      apiClient.get('/admin/classes-options')
        .then((res) => {
          setAcademicOptions(prev => ({
            ...prev,
            academic_years: res.data?.academic_years || []
          }));
        })
        .catch(console.error);

      apiClient.get('/admin/classes?per_page=200')
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setAcademicOptions(prev => ({
            ...prev,
            classes: list
          }));
        })
        .catch(console.error);
    }
  }, [isOpen, initialClassId, initialAcademicYearId]);

  if (!isOpen) return null;

  const resetAll = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setError(null);
    setProgress({ current: 0, total: 0 });
    setImportSummary(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await apiClient.get('/admin/students/template', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_siswa.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template impor siswa (.csv / Excel) berhasil diunduh!');
    } catch (err) {
      toast.error('Gagal mengunduh template siswa.');
      console.error(err);
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Step 1 -> Step 2: Validate & Generate Preview
  const handleValidatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning('Silakan pilih berkas Excel atau CSV terlebih dahulu.');
      return;
    }

    setLoadingPreview(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('preview', 'true');
    if (selectedClassId) formData.append('idkelas', selectedClassId.toString());
    if (selectedAcademicYearId) formData.append('id_tahun_ajaran', selectedAcademicYearId.toString());

    try {
      const res = await apiClient.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(res.data);
      setStep('preview');
      toast.info(`Validasi selesai: ${res.data.valid_count} Valid, ${res.data.invalid_count} Invalid`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memvalidasi berkas siswa.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Step 2 -> Step 3: Run Progressive Batch Import
  const handleProceedImport = async () => {
    if (!previewData) return;
    const validRows = previewData.rows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) {
      toast.error('Tidak ada data yang berstatus VALID untuk diimpor.');
      return;
    }

    setStep('importing');
    const totalToImport = validRows.length;
    setProgress({ current: 0, total: totalToImport });

    const CHUNK_SIZE = 50;
    let totalSaved = 0;
    const additionalFailed: any[] = [];

    // Also collect initial invalid rows for the Error.xlsx download
    const initialInvalidRows = previewData.rows
      .filter((r) => r.status === 'INVALID')
      .map((r) => ({
        row_number: r.row_number,
        name: r.name,
        status: 'INVALID',
        message: r.message,
      }));

    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE);
      try {
        const res = await apiClient.post('/admin/students/import', { 
          rows: chunk,
          idkelas: selectedClassId || undefined,
          id_tahun_ajaran: selectedAcademicYearId || undefined
        });
        totalSaved += res.data?.saved_count ?? chunk.length;
        if (Array.isArray(res.data?.failed_rows)) {
          additionalFailed.push(...res.data.failed_rows);
        }
      } catch (err: any) {
        chunk.forEach((c) => {
          additionalFailed.push({
            row_number: c.row_number,
            name: c.name,
            status: 'GAGAL_SIMPAN',
            message: err.response?.data?.message || 'Gagal menyimpan baris ke database',
          });
        });
      }

      const currentProgress = Math.min(i + chunk.length, totalToImport);
      setProgress({ current: currentProgress, total: totalToImport });
    }

    const allFailed = [...initialInvalidRows, ...additionalFailed];
    setImportSummary({
      total: previewData.total_data,
      saved: totalSaved,
      failed: allFailed.length,
      failedRows: allFailed,
    });

    setStep('completed');
    toast.success(`Proses impor selesai! ${totalSaved} berhasil diimpor.`);
    onSuccess();
  };

  // Download Error.xlsx / CSV
  const handleDownloadErrorFile = () => {
    if (!importSummary || importSummary.failedRows.length === 0) {
      toast.info('Tidak ada baris yang gagal diimpor.');
      return;
    }

    const headers = ['Baris', 'Nama Siswa', 'Status', 'Alasan Kegagalan'];
    const rows = importSummary.failedRows.map((r) => [
      r.row_number || '-',
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${r.status || 'INVALID'}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Error_Import_Siswa_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Berkas Error.xlsx berhasil diunduh!');
  };

  // Filter preview rows
  const displayRows = (previewData?.rows || []).filter((r) => {
    if (filterStatus === 'valid' && r.status !== 'VALID') return false;
    if (filterStatus === 'invalid' && r.status !== 'INVALID') return false;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchMsg = r.message.toLowerCase().includes(q);
      return matchName || matchMsg;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-[#070a13]/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[92vh] flex flex-col border border-slate-200/80 dark:border-white/10 animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Impor Data Siswa
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">
              {step === 'upload' && 'Pilih berkas template Excel (.xlsx) atau CSV (.csv)'}
              {step === 'preview' && 'Pratinjau & Validasi Data Siswa Sebelum Disimpan ke Database'}
              {step === 'importing' && 'Sedang Mengunggah & Menyimpan Data Siswa...'}
              {step === 'completed' && 'Ringkasan Hasil Eksekusi Impor Data Siswa'}
            </p>
          </div>
        </div>

        {/* ================= STEP 1: UPLOAD & TEMPLATE ================= */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-gray-300 space-y-2.5">
              <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Struktur Kolom Template Excel (15 Kolom):</span>
                </span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="text-[11px] text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1.5 rounded-xl font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloadingTemplate ? 'Mengunduh...' : 'Download Template'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-gray-400 pt-1">
                <div>1. <strong>Nama</strong>*</div>
                <div>2. <strong>NIS</strong> (unik)</div>
                <div>3. <strong>NISN</strong>* (unik)</div>
                <div>4. <strong>Username</strong> (unik)</div>
                <div>5. <strong>Password</strong></div>
                <div>6. <strong>Jenis Kelamin</strong> (L/P)</div>
                <div>7. <strong>Nomor Absen</strong></div>
                <div>8. <strong>Kelas</strong>* (exact match)</div>
                <div>9. <strong>Jenjang</strong>* (exact match)</div>
                <div>10. <strong>Tempat Lahir</strong></div>
                <div>11. <strong>Tanggal Lahir</strong> (YYYY-MM-DD)</div>
                <div>12. <strong>Agama</strong></div>
                <div>13. <strong>No HP</strong></div>
                <div>14. <strong>Alamat</strong></div>
                <div>15. <strong>Status</strong> (Aktif)</div>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-gray-400 italic pt-1 border-t border-indigo-200/60 dark:border-indigo-500/10">
                Catatan: Nama Kelas dan Jenjang wajib sama persis dengan Master Data. NIS, NISN, dan Username tidak boleh duplikat.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Target Kelas & Tahun Ajaran (Requirement 18) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Target Tahun Ajaran:
                </label>
                <select
                  value={selectedAcademicYearId}
                  onChange={(e) => setSelectedAcademicYearId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Sesuai File / Default --</option>
                  {academicOptions.academic_years.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Target Kelas & Rombel:
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="">-- Sesuai Kolom Kelas pada File --</option>
                  {academicOptions.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.nama_kelas || cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <form id="student-import-form" onSubmit={handleValidatePreview} className="space-y-4">
              <div className={`border-2 border-dashed transition-all rounded-3xl p-8 text-center flex flex-col items-center justify-center cursor-pointer relative ${
                file 
                  ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20' 
                  : 'border-slate-300 dark:border-white/10 hover:border-indigo-500/60 bg-slate-50 dark:bg-white/[0.01]'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={handleFileChange}
                  required
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="h-10 w-10 text-indigo-600 dark:text-indigo-400 mb-2" />
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-sm">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-200">
                      Klik atau seret berkas spreadsheet ke sini
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                      Mendukung format .xlsx (Excel) atau .csv (Maksimal 10 MB)
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 2: PREVIEW TABLE ================= */}
        {step === 'preview' && previewData && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-3.5 my-1">
            {/* KPI Metrics Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center">
                <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 block uppercase">Total Data</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{previewData.total_data}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-center">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">Valid (Siap Simpan)</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{previewData.valid_count}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-center">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block uppercase">Invalid (Ditolak)</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{previewData.invalid_count}</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'all' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Semua ({previewData.total_data})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('valid')}
                  className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'valid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Valid ({previewData.valid_count})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('invalid')}
                  className={`px-3 py-1.5 rounded-lg transition ${filterStatus === 'invalid' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500'}`}
                >
                  Invalid ({previewData.invalid_count})
                </button>
              </div>

              <input
                type="text"
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                placeholder="Cari nama siswa atau pesan error..."
                className="w-full sm:w-64 px-3 py-1.5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-white/10 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-white/[0.03] sticky top-0 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">No</th>
                    <th className="py-2.5 px-4">Nama Siswa</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    <th className="py-2.5 px-4">Pesan / Validasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Tidak ada data yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{r.row_number}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-gray-200">{r.name}</td>
                        <td className="py-2.5 px-3 text-center">
                          {r.status === 'VALID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                              <CheckCircle2 className="h-3 w-3" />
                              VALID
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-extrabold text-[10px]">
                              <XCircle className="h-3 w-3" />
                              INVALID
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 dark:text-gray-400 text-[11px]">
                          {r.status === 'INVALID' ? (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">{r.message}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= STEP 3: IMPORTING PROGRESS ================= */}
        {step === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-950/30 rounded-full animate-bounce">
              <Upload className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Mengimpor Data Siswa...
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                {progress.current} / {progress.total} Data Terunggah
              </p>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full max-w-md bg-slate-100 dark:bg-white/5 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-white/10 p-0.5">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
              />
            </div>

            <p className="text-[11px] font-mono text-slate-400">
              {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}% Selesai
            </p>
          </div>
        )}

        {/* ================= STEP 4: RESULT SUMMARY ================= */}
        {step === 'completed' && importSummary && (
          <div className="flex-1 flex flex-col justify-center py-8 px-4 text-center space-y-5">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full inline-block mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                Eksekusi Impor Selesai
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                Data yang valid telah berhasil disimpan ke rombongan belajar kelas.
              </p>
            </div>

            {/* Summary Stat Box */}
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto w-full">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Total</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">{importSummary.total}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Berhasil</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{importSummary.saved}</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Gagal</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{importSummary.failed}</span>
              </div>
            </div>

            {/* Download Error Button if any failed rows */}
            {importSummary.failed > 0 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleDownloadErrorFile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Error.xlsx ({importSummary.failed} Baris)</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">
                  File ini berisi baris-baris yang gagal diimpor beserta alasan penolakannya.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5 shrink-0">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="student-import-form"
                disabled={loadingPreview || !file}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loadingPreview ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Memvalidasi Data...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Validasi & Pratinjau</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition"
              >
                Batal / Pilih Berkas Lain
              </button>
              <button
                type="button"
                onClick={handleProceedImport}
                disabled={!previewData || previewData.valid_count === 0}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>Lanjutkan Impor ({previewData?.valid_count || 0} Data Valid)</span>
              </button>
            </>
          )}

          {step === 'completed' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
            >
              Selesai
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default StudentImportModal;
