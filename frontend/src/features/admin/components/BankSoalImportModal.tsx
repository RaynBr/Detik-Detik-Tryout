import React, { useState } from 'react';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import {
  X,
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';

interface BankSoalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewRowData {
  row: number;
  is_valid: boolean;
  errors: string[];
  data: {
    idjenjang: number;
    jenjang_name: string;
    tingkat?: number;
    idtingkat?: number | null;
    tingkat_label?: string;
    idkelas?: number | null;
    kelas_name?: string;
    idmapel: number;
    mapel_name: string;
    id_tahun_ajaran: number;
    tahun_ajaran_name: string;
    tahun_soal_id: number;
    tahun_soal_name: string;
    judul_paket: string;
    kode_paket?: string;
    nomor_soal: string;
    pertanyaan: string;
    pilihan_a: string;
    pilihan_b: string;
    pilihan_c?: string;
    pilihan_d?: string;
    pilihan_e?: string;
    jawaban: string;
    pembahasan?: string;
    tingkat_kesulitan?: string;
    status: string;
    status_aktif: string;
  };
}

interface FailedRowItem {
  row: number;
  judul_paket: string;
  nomor_soal: string;
  pertanyaan: string;
  error: string;
}

interface ImportSummary {
  total: number;
  success: number;
  failed: number;
  failedRows: FailedRowItem[];
}

export const BankSoalImportModal: React.FC<BankSoalImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview state
  const [previewRows, setPreviewRows] = useState<PreviewRowData[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [previewSearch, setPreviewSearch] = useState('');

  // Import Progress & Summary
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setPreviewRows([]);
    setValidCount(0);
    setInvalidCount(0);
    setErrorMsg(null);
    setImportProgress(0);
    setImportSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'csv', 'txt'].includes(ext || '')) {
        setErrorMsg('Format file tidak didukung. Harap unggah berkas berekstensi .xlsx atau .csv.');
        return;
      }
      setFile(selected);
      setErrorMsg(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const res = await apiClient.get('/super-admin/question-bank/template', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_upload_bank_soal.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Template Excel Bank Soal berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh template.');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  // Preview handler
  const handleValidatePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Pilih berkas Excel (.xlsx) atau CSV (.csv) terlebih dahulu.');
      return;
    }

    setLoadingPreview(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/super-admin/question-bank/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setPreviewRows(data.preview || []);
      setValidCount(data.valid_count || 0);
      setInvalidCount(data.invalid_count || 0);
      setStep('preview');
      toast.info(`Pratinjau siap: ${data.valid_count} Valid, ${data.invalid_count} Perlu Koreksi.`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Gagal memvalidasi berkas.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Run Batch Import
  const handleProceedImport = async () => {
    if (!file) return;

    setStep('importing');
    setImportProgress(20);

    const formData = new FormData();
    formData.append('file', file);

    const progressTimer = setInterval(() => {
      setImportProgress((prev) => (prev < 90 ? prev + 15 : prev));
    }, 300);

    try {
      const res = await apiClient.post('/super-admin/question-bank/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(progressTimer);
      setImportProgress(100);

      const d = res.data;
      setImportSummary({
        total: d.total_rows || (d.success_count + d.failed_count),
        success: d.success_count || 0,
        failed: d.failed_count || 0,
        failedRows: d.failed_rows || [],
      });

      setStep('completed');
      toast.success(`Import selesai: ${d.success_count} butir soal berhasil diimpor!`);
      onSuccess();
    } catch (err: any) {
      clearInterval(progressTimer);
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat mengimpor soal.');
      setStep('preview');
    }
  };

  // Filter preview rows
  const filteredPreview = previewRows.filter((r) => {
    if (previewFilter === 'valid' && !r.is_valid) return false;
    if (previewFilter === 'invalid' && r.is_valid) return false;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const matchText = (r.data.judul_paket || '').toLowerCase().includes(q) ||
                        (r.data.pertanyaan || '').toLowerCase().includes(q) ||
                        (r.data.mapel_name || '').toLowerCase().includes(q) ||
                        (r.data.jenjang_name || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 px-6 border-b-2 border-[#161C2D] dark:border-[#32363A] flex items-center justify-between bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl border border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#161C2D] dark:text-white">
                Upload & Import Bank Soal Massal
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Impor paket soal & butir pertanyaan terintegrasi dengan referensi Master Akademik.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator Header */}
        <div className="grid grid-cols-3 border-b border-[#161C2D]/10 dark:border-white/10 text-xs font-bold text-center bg-slate-100/60 dark:bg-white/[0.02]">
          <div className={`py-2.5 px-3 border-r border-[#161C2D]/10 dark:border-white/10 ${step === 'upload' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
            1. Pilih & Validasi Berkas
          </div>
          <div className={`py-2.5 px-3 border-r border-[#161C2D]/10 dark:border-white/10 ${step === 'preview' || step === 'importing' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
            2. Preview & Cek Master
          </div>
          <div className={`py-2.5 px-3 ${step === 'completed' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>
            3. Ringkasan Hasil Import
          </div>
        </div>

        {/* Body Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: UPLOAD ================= */}
          {step === 'upload' && (
            <form onSubmit={handleValidatePreview} className="space-y-6">
              
              {/* Template Download Banner */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-lg">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                      Gunakan Template Resmi Bank Soal (18 Kolom)
                    </h4>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      Format kolom mengikuti Master Jenjang, Kelas, Mapel, Tahun Ajaran, Kunci Jawaban & Pembahasan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={downloadingTemplate}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#1A1E22] hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-600 text-xs font-bold shadow-[2px_2px_0px_0px_#4F46E5] transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{downloadingTemplate ? 'Mengunduh...' : 'Download Template Excel'}</span>
                </button>
              </div>

              {/* Drag & Drop File Picker */}
              <div className="border-2 border-dashed border-[#161C2D]/30 dark:border-white/20 rounded-2xl p-8 text-center bg-slate-50/60 dark:bg-white/[0.02] hover:border-indigo-500 transition">
                <div className="max-w-md mx-auto space-y-3">
                  <div className="h-12 w-12 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#161C2D] dark:text-white block">
                      Pilih berkas Excel (.xlsx) atau CSV (.csv)
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Ukuran maksimal berkas 10MB.
                    </span>
                  </div>

                  <input
                    type="file"
                    id="bankSoalFileInput"
                    accept=".xlsx,.csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <label
                    htmlFor="bankSoalFileInput"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl border border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                  >
                    <span>{file ? 'Ganti Berkas' : 'Telusuri Berkas'}</span>
                  </label>

                  {file && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!file || loadingPreview}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>{loadingPreview ? 'Memvalidasi...' : 'Validasi & Preview Data →'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: PREVIEW ================= */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Total Baris Soal</span>
                  <span className="text-lg font-black text-[#161C2D] dark:text-white">{previewRows.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Siap Diimpor (Valid)</span>
                  <span className="text-lg font-black text-emerald-700">{validCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Dilewati (Error)</span>
                  <span className="text-lg font-black text-rose-700">{invalidCount}</span>
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 text-amber-900 dark:text-amber-200 text-xs">
                  ℹ️ <strong>Catatan:</strong> {invalidCount} baris yang tidak memenuhi format atau referensi Master Akademik akan dilewati secara otomatis tanpa membatalkan import baris yang valid.
                </div>
              )}

              {/* Filter and Search */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari pratinjau soal..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-[#161C2D]/30 dark:border-white/20 bg-white dark:bg-[#1A1E22]"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${previewFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
                  >
                    Semua ({previewRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('valid')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${previewFilter === 'valid' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
                  >
                    Valid ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('invalid')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${previewFilter === 'invalid' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-white/10'}`}
                  >
                    Error ({invalidCount})
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-white/5 font-black text-[10px] uppercase text-slate-600 dark:text-gray-400 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Baris</th>
                      <th className="py-2 px-2.5">Paket Soal</th>
                      <th className="py-2 px-2.5">Jenjang / Tingkat / Mapel</th>
                      <th className="py-2 px-2.5">Pertanyaan</th>
                      <th className="py-2 px-2.5 text-center">Kunci</th>
                      <th className="py-2 px-2.5">Status Validasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-slate-200 dark:divide-white/5">
                    {filteredPreview.map((row) => (
                      <tr key={row.row} className={row.is_valid ? 'hover:bg-slate-50' : 'bg-rose-50/40 hover:bg-rose-50/70'}>
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-500">{row.row}</td>
                        <td className="py-2 px-2.5 font-bold truncate max-w-[140px]">{row.data.judul_paket}</td>
                        <td className="py-2 px-2.5">
                          <span className="font-semibold block">{row.data.jenjang_name} • {row.data.tingkat_label || (row.data.tingkat ? `Tingkat ${row.data.tingkat}` : (row.data.kelas_name || '-'))}</span>
                          <span className="text-[10px] text-slate-400 block">{row.data.mapel_name} ({row.data.tahun_ajaran_name})</span>
                        </td>
                        <td className="py-2 px-2.5 truncate max-w-[200px]" title={row.data.pertanyaan}>
                          {row.data.pertanyaan}
                        </td>
                        <td className="py-2 px-2.5 text-center font-bold font-mono">{row.data.jawaban}</td>
                        <td className="py-2 px-2.5">
                          {row.is_valid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800" title={row.errors.join('; ')}>
                              <XCircle className="h-3 w-3" /> {row.errors[0] || 'Gagal'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 font-bold text-xs text-slate-600 dark:text-gray-300 hover:bg-slate-200 transition cursor-pointer"
                >
                  ← Kembali Pilih Berkas
                </button>

                <button
                  type="button"
                  onClick={handleProceedImport}
                  disabled={validCount === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Import Sekarang ({validCount} Butir Soal)</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: IMPORTING PROGRESS ================= */}
          {step === 'importing' && (
            <div className="py-10 text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>

              <div>
                <h4 className="text-base font-black text-[#161C2D] dark:text-white">
                  Sedang Mengimpor Bank Soal...
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menyimpan paket soal dan butir pertanyaan ke database CBT.
                </p>
              </div>

              <div className="w-full max-w-md mx-auto bg-slate-100 dark:bg-white/10 h-3 rounded-full overflow-hidden border border-[#161C2D]/20">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-400">{importProgress}% Selesai</span>
            </div>
          )}

          {/* ================= STEP 4: COMPLETED SUMMARY ================= */}
          {step === 'completed' && importSummary && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 text-center space-y-2">
                <div className="h-12 w-12 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h4 className="text-base font-black text-emerald-900 dark:text-emerald-200">
                  Import Bank Soal Berhasil Diselesaikan!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  {importSummary.success} butir soal telah berhasil disimpan ke database dan siap diujikan.
                </p>

                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-2">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-emerald-200 font-bold text-xs">
                    <span className="text-slate-400 block text-[10px]">Sukses</span>
                    <span className="text-emerald-600 text-base font-black">{importSummary.success}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#1A1E22] border border-rose-200 font-bold text-xs">
                    <span className="text-slate-400 block text-[10px]">Gagal / Dilewati</span>
                    <span className="text-rose-600 text-base font-black">{importSummary.failed}</span>
                  </div>
                </div>
              </div>

              {/* Table of Failed Rows if any */}
              {importSummary.failedRows.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    <span>Daftar Baris yang Gagal / Dilewati ({importSummary.failedRows.length})</span>
                  </h5>
                  <div className="border border-rose-200 rounded-xl max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-100/60 font-black text-[10px] uppercase text-rose-900 sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">Baris</th>
                          <th className="py-2 px-2.5">Paket Soal</th>
                          <th className="py-2 px-2.5">Pertanyaan</th>
                          <th className="py-2 px-2.5">Alasan Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-rose-50/20">
                        {importSummary.failedRows.map((f, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2.5 font-mono font-bold text-rose-700">{f.row}</td>
                            <td className="py-2 px-2.5 font-bold truncate max-w-[150px]">{f.judul_paket}</td>
                            <td className="py-2 px-2.5 truncate max-w-[200px]">{f.pertanyaan}</td>
                            <td className="py-2 px-2.5 text-rose-600 font-medium">{f.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 4 Actions */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
