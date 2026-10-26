import React, { useState } from 'react';
import { apiClient } from '../../../shared/api/client';
import { useToast } from '../../../shared/context/ToastContext';
import { X, Upload, Download, AlertCircle, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface StudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentImportModal: React.FC<StudentImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setRowErrors([]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.warning('Silakan pilih berkas Excel atau CSV terlebih dahulu.');
      return;
    }

    setLoading(true);
    setError(null);
    setRowErrors([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/admin/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data?.message || 'Data siswa berhasil diimpor ke sistem!');
      onSuccess();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.message || 'Gagal mengimpor berkas data siswa.');
      if (Array.isArray(data?.errors)) {
        setRowErrors(data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-[#070a13]/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col border border-slate-200/80 dark:border-white/10 animate-scale-up">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200 dark:border-indigo-500/20">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Impor Data Siswa
            </h2>
            <p className="text-slate-500 dark:text-gray-400 text-xs font-medium">
              Mendukung file Spreadsheet Excel (.xlsx) dan CSV (.csv)
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-2">
          
          {/* Instructions Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 text-xs text-slate-700 dark:text-gray-300 space-y-2">
            <div className="flex items-center justify-between font-bold text-indigo-800 dark:text-indigo-300">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Format Kolom Excel / CSV:</span>
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="text-[11px] text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 rounded-lg font-bold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{downloadingTemplate ? 'Mengunduh...' : 'Unduh Template'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-gray-400 pt-1">
              <div>• <strong>nama</strong>: Nama Lengkap Siswa</div>
              <div>• <strong>email</strong>: Email Siswa (opsional)</div>
              <div>• <strong>nisn</strong>: NISN Siswa (unik)</div>
              <div>• <strong>nis</strong>: NIS Siswa (opsional)</div>
              <div>• <strong>nama_kelas</strong>: Contoh: "X IPA 1"</div>
              <div>• <strong>password</strong>: Kata Sandi awal</div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-gray-400 italic pt-1 border-t border-indigo-200/60 dark:border-indigo-500/10">
              🛡️ Sistem otomatis mengecek duplikasi NISN, menghubungkan ke rombel kelas yang sesuai di instansi Anda, dan membatalkan (rollback) seluruh transaksi jika terjadi kegagalan baris.
            </p>
          </div>

          {/* Error Alert with Row Details */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-2xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="font-bold">{error}</span>
              </div>
              {rowErrors.length > 0 && (
                <div className="pl-6 pt-1 max-h-32 overflow-y-auto space-y-1 font-medium">
                  {rowErrors.map((err, idx) => (
                    <div key={idx} className="text-[11px] text-rose-600 dark:text-rose-400">
                      • {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form & File Drag/Drop */}
          <form id="student-import-form" onSubmit={handleSubmit} className="space-y-4">
            <div className={`border-2 border-dashed transition-all rounded-3xl p-6 text-center flex flex-col items-center justify-center cursor-pointer relative ${
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
              <Upload className="h-9 w-9 text-indigo-600 dark:text-indigo-400 mb-2 animate-pulse-subtle" />
              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 font-mono mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-200">
                    Klik atau seret file spreadsheet ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
                    Format file: .xlsx (Excel) atau .csv (Maksimal 5 MB)
                  </p>
                </div>
              )}
            </div>
          </form>

        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-200/80 dark:border-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 rounded-xl text-xs font-bold transition"
          >
            Batal
          </button>
          <button
            type="submit"
            form="student-import-form"
            disabled={loading || !file}
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Mengimpor Siswa...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Mulai Impor</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentImportModal;
