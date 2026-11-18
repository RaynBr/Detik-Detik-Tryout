import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { formatRbacError } from './rbacErrors';
import { ShieldCheck, X, Check, Lock, RefreshCw, AlertTriangle } from 'lucide-react';

export interface RoleOption {
  id: number;
  name: string;
  label: string;
  instansi_id: string | null;
  is_system: boolean;
  is_global: boolean;
}

interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userType: 'bo' | 'admin' | 'guru' | 'siswa' | 'super_admin';
  currentRoles: string[];
  onSaved: () => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  userType,
  currentRoles,
  onSaved,
}) => {
  const { refreshAuth } = useAuth();
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isStudent = userType === 'siswa';

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSelectedRoles(currentRoles.length > 0 ? [...currentRoles] : []);

    if (isStudent) return;

    const loadRoles = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/roles');
        const list: RoleOption[] = res.data?.data || [];

        // Filter out obviously incompatible roles in UI while keeping backend as source of truth
        const filtered = list.filter((r) => {
          if (r.name === 'siswa') return false;
          if (userType === 'guru' && (r.name === 'super_admin' || r.name === 'admin_instansi')) {
            return false;
          }
          return true;
        });

        setAvailableRoles(filtered);
      } catch (err: any) {
        setErrorMsg(formatRbacError(err, 'Gagal memuat daftar role.'));
      } finally {
        setLoading(false);
      }
    };

    loadRoles();
  }, [isOpen, userId, userType, isStudent, currentRoles]);

  if (!isOpen) return null;

  const toggleRole = (roleName: string) => {
    setErrorMsg(null);
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStudent) {
      onClose();
      return;
    }

    if (selectedRoles.length === 0) {
      setErrorMsg('Pengguna wajib memiliki minimal satu role.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await apiClient.put(`/users/${userId}/roles`, {
        roles: selectedRoles,
        user_type: 'bo',
      });
      toast.success(`Role untuk ${userName} berhasil diperbarui.`);
      await refreshAuth();
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = formatRbacError(err, 'Gagal menyimpan perubahan role pengguna.');
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                Atur Role & Hak Akses
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Pengguna: <strong className="text-[#161C2D] dark:text-white">{userName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isStudent ? (
          <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-3">
            <Lock className="h-5 w-5 shrink-0 mt-0.5 text-cyan-600" />
            <div className="space-y-1">
              <p className="font-bold">Role Akun Siswa Terkunci</p>
              <p className="leading-relaxed">
                Sesuai kebijakan keamanan sistem, akun siswa hanya menggunakan role bawaan <strong>siswa</strong> dan tidak diberikan role instansi kustom.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Pilih satu atau lebih role untuk pengguna ini. Hak akses akhir merupakan gabungan (union) dari semua role yang dipilih.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                Memuat daftar role tersedia...
              </div>
            ) : availableRoles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Belum ada role yang tersedia untuk tipe akun ini.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {availableRoles.map((role) => {
                  const checked = selectedRoles.includes(role.name);
                  return (
                    <label
                      key={role.id}
                      onClick={() => toggleRole(role.name)}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                        checked
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500'
                          : 'bg-slate-50/60 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
                            checked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'bg-white dark:bg-transparent border-slate-300 dark:border-gray-600'
                          }`}
                        >
                          {checked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#161C2D] dark:text-white truncate">
                            {role.label}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500 dark:text-gray-400 truncate">
                            {role.name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                          role.is_system
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}
                      >
                        {role.is_system ? 'Sistem' : 'Kustom'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || loading || selectedRoles.length === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Role'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

