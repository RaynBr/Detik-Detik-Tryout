import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../../shared/api/client';
import { toast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import { Can } from '../../../shared/components/Can';
import { formatRbacError } from './rbacErrors';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Users,
  Lock,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Eye,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';

interface PermissionItem {
  id: number;
  key: string;
  label: string;
  module: string;
  scope: 'platform' | 'instansi';
}

interface RoleItem {
  id: number;
  name: string;
  label: string;
  instansi_id: string | null;
  is_system: boolean;
  is_global: boolean;
  users_count: number;
  permissions_count: number;
  permissions?: PermissionItem[];
  created_at?: string;
}

interface RoleManagementPageProps {
  scope: 'platform' | 'instansi';
}

export const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ scope }) => {
  const { refreshAuth } = useAuth();
  const isPlatformScope = scope === 'platform';
  const managePerm = isPlatformScope ? 'role_platform.manage' : 'role_instansi.manage';

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', label: '' });
  const [roleFormError, setRoleFormError] = useState<string | null>(null);
  const [submittingRole, setSubmittingRole] = useState(false);

  // Delete Confirmation Modal
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [deletingRole, setDeletingRole] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Permission Matrix Modal
  const [matrixRole, setMatrixRole] = useState<RoleItem | null>(null);
  const [matrixReadOnly, setMatrixReadOnly] = useState(false);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, PermissionItem[]>>({});
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [selectedPermKeys, setSelectedPermKeys] = useState<string[]>([]);
  const [permSearch, setPermSearch] = useState('');
  const [onlySelectedPerms, setOnlySelectedPerms] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [confirmSaveMatrix, setConfirmSaveMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Close open modals cleanly on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (matrixRole) setMatrixRole(null);
        else if (roleToDelete) setRoleToDelete(null);
        else if (showRoleModal) setShowRoleModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [matrixRole, roleToDelete, showRoleModal]);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/roles');
      const list: RoleItem[] = res.data?.data || [];
      setRoles(list);
    } catch (err: any) {
      toast.error(formatRbacError(err, 'Gagal memuat daftar role.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        (r.is_system ? 'sistem' : 'kustom').includes(q)
    );
  }, [roles, search]);

  // Determine whether the current user can mutate a specific role
  const canEditRole = (role: RoleItem): boolean => {
    if (!isPlatformScope) {
      // Admin Instansi: global / system template roles are strictly read-only
      return !role.is_global && !role.is_system;
    }
    // Super Admin: can edit label of system roles (name stays locked), full edit on custom roles
    return true;
  };

  const canDeleteRole = (role: RoleItem): boolean => {
    if (role.is_system) return false;
    if (!isPlatformScope && role.is_global) return false;
    return true;
  };

  const canEditPermissions = (role: RoleItem): boolean => {
    if (!isPlatformScope && role.is_global) return false;
    return true;
  };

  // --- Add / Edit Role Handlers ---
  const handleOpenAdd = () => {
    setEditingRole(null);
    setRoleForm({ name: '', label: '' });
    setRoleFormError(null);
    setShowRoleModal(true);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, label: role.label });
    setRoleFormError(null);
    setShowRoleModal(true);
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormError(null);

    const cleanName = roleForm.name.trim();
    const cleanLabel = roleForm.label.trim();

    if (!cleanLabel) {
      setRoleFormError('Label tampilan role wajib diisi.');
      return;
    }
    if (!editingRole && !cleanName) {
      setRoleFormError('Nama teknis role wajib diisi.');
      return;
    }
    if (!editingRole && !/^[a-zA-Z0-9_-]+$/.test(cleanName)) {
      setRoleFormError('Nama teknis hanya boleh huruf, angka, underscore (_), atau tanda hubung (-).');
      return;
    }

    setSubmittingRole(true);
    try {
      if (editingRole) {
        const payload: any = { label: cleanLabel };
        if (!editingRole.is_system && cleanName && cleanName !== editingRole.name) {
          payload.name = cleanName;
        }
        await apiClient.put(`/roles/${editingRole.id}`, payload);
        toast.success(`Role "${cleanLabel}" berhasil diperbarui.`);
      } else {
        await apiClient.post('/roles', {
          name: cleanName,
          label: cleanLabel,
        });
        toast.success(`Role baru "${cleanLabel}" berhasil dibuat.`);
      }
      setShowRoleModal(false);
      await fetchRoles();
      await refreshAuth();
    } catch (err: any) {
      const msg = formatRbacError(err, 'Gagal menyimpan role.');
      setRoleFormError(msg);
      toast.error(msg);
    } finally {
      setSubmittingRole(false);
    }
  };

  // --- Delete Role Handlers ---
  const handleOpenDelete = (role: RoleItem) => {
    setRoleToDelete(role);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/roles/${roleToDelete.id}`);
      toast.success(`Role "${roleToDelete.label}" berhasil dihapus.`);
      setRoleToDelete(null);
      await fetchRoles();
      await refreshAuth();
    } catch (err: any) {
      const msg = formatRbacError(err, 'Gagal menghapus role.');
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setDeletingRole(false);
    }
  };

  // --- Permission Matrix Handlers ---
  const handleOpenMatrix = async (role: RoleItem) => {
    const readOnly = !canEditPermissions(role);
    setMatrixRole(role);
    setMatrixReadOnly(readOnly);
    setMatrixError(null);
    setPermSearch('');
    setOnlySelectedPerms(false);
    setConfirmSaveMatrix(false);
    setLoadingPermissions(true);

    try {
      const [permsRes, roleDetailRes] = await Promise.all([
        apiClient.get('/permissions', {
          params: !isPlatformScope ? { scope: 'instansi' } : undefined,
        }),
        apiClient.get(`/roles/${role.id}`),
      ]);

      const rawGrouped: Record<string, PermissionItem[]> = permsRes.data?.data || {};
      const detailRole: RoleItem = roleDetailRes.data?.data || role;

      // For instansi custom roles managed by Super Admin, hide platform permissions to prevent INVALID_SCOPE confusion
      let filteredGrouped: Record<string, PermissionItem[]> = {};
      const roleIsInstansi = !!detailRole.instansi_id;

      for (const [mod, items] of Object.entries(rawGrouped)) {
        const validItems = roleIsInstansi
          ? items.filter((p) => p.scope === 'instansi')
          : items;
        if (validItems.length > 0) {
          filteredGrouped[mod] = validItems;
        }
      }

      setGroupedPermissions(filteredGrouped);
      const currentKeys = (detailRole.permissions || []).map((p) => p.key);
      setSelectedPermKeys(currentKeys);
    } catch (err: any) {
      const msg = formatRbacError(err, 'Gagal memuat matriks permission.');
      setMatrixError(msg);
      toast.error(msg);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const togglePermissionKey = (key: string) => {
    if (matrixReadOnly) return;
    setMatrixError(null);
    setConfirmSaveMatrix(false);
    setSelectedPermKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleModuleAll = (items: PermissionItem[]) => {
    if (matrixReadOnly) return;
    setMatrixError(null);
    setConfirmSaveMatrix(false);
    const modKeys = items.map((i) => i.key);
    const allSelected = modKeys.every((k) => selectedPermKeys.includes(k));
    if (allSelected) {
      setSelectedPermKeys((prev) => prev.filter((k) => !modKeys.includes(k)));
    } else {
      setSelectedPermKeys((prev) => Array.from(new Set([...prev, ...modKeys])));
    }
  };

  const handleSaveMatrix = async () => {
    if (!matrixRole || matrixReadOnly) return;
    setSavingMatrix(true);
    setMatrixError(null);
    try {
      await apiClient.put(`/roles/${matrixRole.id}/permissions`, {
        permissions: selectedPermKeys,
      });
      toast.success(`Permission untuk role "${matrixRole.label}" berhasil diperbarui.`);
      setMatrixRole(null);
      setConfirmSaveMatrix(false);
      await fetchRoles();
      await refreshAuth();
    } catch (err: any) {
      const msg = formatRbacError(err, 'Gagal menyimpan perubahan permission.');
      setMatrixError(msg);
      setConfirmSaveMatrix(false);
      toast.error(msg);
    } finally {
      setSavingMatrix(false);
    }
  };

  const filteredModules = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    const out: Record<string, PermissionItem[]> = {};
    for (const [mod, items] of Object.entries(groupedPermissions)) {
      const modMatch = q ? mod.toLowerCase().includes(q) : true;
      let matchedItems = !q || modMatch
        ? items
        : items.filter(
            (p) =>
              p.label.toLowerCase().includes(q) ||
              p.key.toLowerCase().includes(q)
          );
      if (onlySelectedPerms) {
        matchedItems = matchedItems.filter((p) => selectedPermKeys.includes(p.key));
      }
      if (matchedItems.length > 0) {
        out[mod] = matchedItems;
      }
    }
    return out;
  }, [groupedPermissions, permSearch, onlySelectedPerms, selectedPermKeys]);

  const accentBg = isPlatformScope ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-[#38B1ED] hover:bg-[#209ddb]';
  const accentIconBg = isPlatformScope ? 'bg-indigo-600' : 'bg-[#38B1ED]';

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 ${accentIconBg} text-white rounded-2xl border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717]`}>
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#161C2D] dark:text-white tracking-tight">
                {isPlatformScope ? 'Kelola Role & Hak Akses Platform' : 'Kelola Role & Hak Akses Sekolah'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                {isPlatformScope
                  ? 'Kelola role sistem maupun kustom beserta matriks permission untuk seluruh platform CBT.'
                  : 'Kelola role kustom dan matriks hak akses khusus untuk pengguna di instansi sekolah Anda. Role bawaan sistem bersifat read-only.'}
              </p>
            </div>
          </div>

          <Can perm={managePerm}>
            <button
              onClick={handleOpenAdd}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${accentBg} text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer shrink-0`}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Tambah Role Baru</span>
            </button>
          </Can>
        </div>
      </div>

      {/* Search & Info Bar */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-4 shadow-[3px_3px_0px_0px_#171717] dark:shadow-[3px_3px_0px_0px_#000000] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama teknis, label, atau jenis role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-[#161C2D] dark:text-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            Total Role: <strong className="text-[#161C2D] dark:text-white">{filteredRoles.length}</strong>
          </span>
          <button
            onClick={fetchRoles}
            title="Muat ulang daftar role"
            className="p-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] hover:bg-slate-100 dark:hover:bg-white/5 text-[#161C2D] dark:text-white transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Table */}
      <div className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 shadow-[4px_4px_0px_0px_#171717] dark:shadow-[4px_4px_0px_0px_#000000]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#161C2D] dark:border-[#32363A] text-slate-600 dark:text-gray-400 uppercase font-black text-[10px] tracking-wider bg-slate-50 dark:bg-[#0B1014]/40">
                <th className="py-3 px-3">Nama Teknis</th>
                <th className="py-3 px-3">Label Role</th>
                <th className="py-3 px-3 text-center">Jenis</th>
                <th className="py-3 px-3 text-center">Jumlah Pengguna</th>
                <th className="py-3 px-3 text-center">Jumlah Permission</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center font-bold text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat data role & hak akses...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-gray-600" />
                    <p className="font-bold text-slate-600 dark:text-gray-300">Belum ada role ditemukan.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Klik tombol "Tambah Role Baru" untuk membuat role kustom.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const editable = canEditRole(role);
                  const deletable = canDeleteRole(role);
                  const permEditable = canEditPermissions(role);

                  return (
                    <tr key={role.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#161C2D] dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                            {role.name}
                          </span>
                          {role.is_system && (
                            <span title="Role sistem bawaan (dilindungi)">
                              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[#161C2D] dark:text-white block">
                          {role.label}
                        </span>
                        {role.instansi_id && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Instansi: {role.instansi_id}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                            role.is_system
                              ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                          }`}
                        >
                          {role.is_system ? 'Sistem' : 'Kustom'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 font-bold text-[#161C2D] dark:text-white">
                          <Users className="h-3.5 w-3.5 text-slate-500" />
                          {role.users_count}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          <KeyRound className="h-3.5 w-3.5" />
                          {role.permissions_count}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenMatrix(role)}
                            title={permEditable ? 'Atur Matriks Permission' : 'Lihat Daftar Permission (Read-Only)'}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition cursor-pointer"
                          >
                            {permEditable ? <KeyRound className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span>{permEditable ? 'Permission' : 'Lihat'}</span>
                          </button>

                          <Can perm={managePerm}>
                            {editable ? (
                              <button
                                onClick={() => handleOpenEdit(role)}
                                title="Edit Role"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span
                                title="Role sistem/global bersifat read-only"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-gray-600 cursor-not-allowed"
                              >
                                <Edit2 className="h-4 w-4" />
                              </span>
                            )}

                            {deletable ? (
                              <button
                                onClick={() => handleOpenDelete(role)}
                                title="Hapus Role"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span
                                title="Role sistem tidak dapat dihapus"
                                className="p-1.5 rounded-lg text-slate-300 dark:text-gray-600 cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                              </span>
                            )}
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Role (Rendered via Portal to avoid transform containing-block clipping) */}
      {showRoleModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowRoleModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-5 my-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#161C2D] dark:text-white">
                      {editingRole ? 'Edit Role' : 'Tambah Role Baru'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isPlatformScope ? 'Cakupan Platform / Global' : 'Cakupan Instansi Sekolah Anda'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {roleFormError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{roleFormError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitRole} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Nama Teknis Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRole?.is_system}
                    placeholder="Contoh: operator_ujian atau staf_kurikulum"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-mono font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingRole?.is_system
                      ? 'Nama teknis role sistem bawaan tidak dapat diubah.'
                      : 'Hanya huruf, angka, underscore (_), atau tanda hubung (-), tanpa spasi.'}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Label Tampilan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Operator Ujian Sekolah"
                    value={roleForm.label}
                    onChange={(e) => setRoleForm({ ...roleForm, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-white/5 text-[#161C2D] dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(false)}
                    className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRole}
                    className={`px-4 py-2 rounded-xl ${accentBg} disabled:opacity-50 text-white font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer`}
                  >
                    {submittingRole ? 'Menyimpan...' : editingRole ? 'Simpan Perubahan' : 'Buat Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Konfirmasi Hapus Role */}
      {roleToDelete &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setRoleToDelete(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl p-6 max-w-md w-full shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] space-y-4 my-auto"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#161C2D] dark:text-white">Hapus Role Kustom?</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus role <strong>{roleToDelete.label}</strong> (<code className="font-mono">{roleToDelete.name}</code>)?
                {roleToDelete.users_count > 0 && (
                  <span className="block mt-2 text-amber-700 dark:text-amber-300 font-bold">
                    Perhatian: Role ini tercatat masih digunakan oleh {roleToDelete.users_count} pengguna.
                  </span>
                )}
              </p>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingRole}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                >
                  {deletingRole ? 'Menghapus...' : 'Ya, Hapus Role'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal Matriks Permission */}
      {matrixRole &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setMatrixRole(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] rounded-2xl max-w-4xl w-full h-[85vh] max-h-[760px] flex flex-col shadow-[6px_6px_0px_0px_#171717] dark:shadow-[6px_6px_0px_0px_#000000] overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 border-b-2 border-[#161C2D] dark:border-[#32363A] flex items-center justify-between gap-4 shrink-0 bg-white dark:bg-[#1A1E22]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl ${accentIconBg} text-white border-2 border-[#161C2D] shrink-0`}>
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-[#161C2D] dark:text-white truncate">
                        Matriks Permission: {matrixRole.label}
                      </h3>
                      {matrixReadOnly && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-[10px] font-black uppercase">
                          Read-Only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                      Role <code className="font-mono font-bold text-[#161C2D] dark:text-white">{matrixRole.name}</code> • Terpilih:{' '}
                      <strong className="text-indigo-600 dark:text-indigo-400">{selectedPermKeys.length}</strong> permission
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMatrixRole(null)}
                  title="Tutup"
                  className="p-2 rounded-xl text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search, Filter Toggle & Info Area */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 space-y-3 shrink-0 bg-slate-50/50 dark:bg-[#14171A]/50">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari modul, nama permission, atau key (contoh: guru.create)..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {permSearch && (
                      <button
                        onClick={() => setPermSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="inline-flex rounded-xl p-1 bg-white dark:bg-[#1A1E22] border-2 border-[#161C2D] dark:border-[#32363A] text-xs font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => setOnlySelectedPerms(false)}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        !onlySelectedPerms
                          ? `${accentIconBg} text-white`
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setOnlySelectedPerms(true)}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                        onlySelectedPerms
                          ? `${accentIconBg} text-white`
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Aktif ({selectedPermKeys.length})
                    </button>
                  </div>
                </div>

                {matrixReadOnly && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      Role bawaan sistem bersifat read-only bagi Admin Instansi. Buat role kustom baru untuk mengatur kombinasi permission tersendiri.
                    </span>
                  </div>
                )}

                {matrixError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{matrixError}</span>
                  </div>
                )}
              </div>

              {/* Matrix Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                {loadingPermissions ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-bold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Memuat daftar permission...
                  </div>
                ) : Object.keys(filteredModules).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    Tidak ada permission yang sesuai dengan filter.
                  </div>
                ) : (
                  Object.entries(filteredModules).map(([moduleName, items]) => {
                    const modKeys = items.map((i) => i.key);
                    const selectedInMod = modKeys.filter((k) => selectedPermKeys.includes(k)).length;
                    const allSelected = modKeys.length > 0 && selectedInMod === modKeys.length;

                    return (
                      <div
                        key={moduleName}
                        className="rounded-xl border border-slate-200 dark:border-[#32363A] overflow-hidden bg-slate-50/40 dark:bg-white/[0.01]"
                      >
                        <div className="px-4 py-2.5 bg-slate-100/90 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="text-xs font-black text-[#161C2D] dark:text-white truncate">
                              {moduleName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300">
                              {selectedInMod}/{items.length}
                            </span>
                          </div>

                          {!matrixReadOnly && (
                            <button
                              type="button"
                              onClick={() => toggleModuleAll(items)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
                            >
                              {allSelected ? (
                                <>
                                  <CheckSquare className="h-3.5 w-3.5" />
                                  <span>Batal Semua</span>
                                </>
                              ) : (
                                <>
                                  <Square className="h-3.5 w-3.5" />
                                  <span>Pilih Semua</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {items.map((perm) => {
                            const checked = selectedPermKeys.includes(perm.key);
                            return (
                              <label
                                key={perm.key}
                                onClick={() => togglePermissionKey(perm.key)}
                                className={`flex items-start gap-2.5 p-3 rounded-xl border transition ${
                                  matrixReadOnly ? 'cursor-default' : 'cursor-pointer'
                                } ${
                                  checked
                                    ? 'bg-sky-50/90 dark:bg-indigo-950/40 border-sky-400 dark:border-indigo-500'
                                    : 'bg-white dark:bg-[#1A1E22] border-slate-200 dark:border-white/10 hover:border-slate-300'
                                }`}
                              >
                                <div
                                  className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                    checked
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'bg-white dark:bg-transparent border-slate-300 dark:border-gray-600'
                                  }`}
                                >
                                  {checked && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#161C2D] dark:text-white leading-snug">
                                    {perm.label}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <code className="text-[10px] font-mono text-slate-500 dark:text-gray-400 truncate">
                                      {perm.key}
                                    </code>
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        perm.scope === 'platform'
                                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                          : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                                      }`}
                                    >
                                      {perm.scope}
                                    </span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer with Save Confirmation */}
              <div className="px-5 py-3.5 border-t-2 border-[#161C2D] dark:border-[#32363A] bg-slate-50 dark:bg-[#14171A] shrink-0">
                {confirmSaveMatrix ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Simpan {selectedPermKeys.length} permission ke role "{matrixRole.label}"? Perubahan langsung berlaku untuk semua pengguna role ini.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmSaveMatrix(false)}
                        disabled={savingMatrix}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveMatrix}
                        disabled={savingMatrix}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer"
                      >
                        {savingMatrix ? 'Menyimpan...' : 'Ya, Konfirmasi & Simpan'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 dark:text-gray-400 font-semibold">
                      {matrixReadOnly
                        ? 'Mode lihat saja (read-only).'
                        : 'Perubahan permission dicatat di Audit Trail secara otomatis.'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMatrixRole(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold border-2 border-[#161C2D] dark:border-[#32363A] bg-white dark:bg-[#1A1E22] text-[#161C2D] dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
                      >
                        Tutup
                      </button>
                      {!matrixReadOnly && (
                        <Can perm={managePerm}>
                          <button
                            type="button"
                            onClick={() => setConfirmSaveMatrix(true)}
                            disabled={loadingPermissions}
                            className={`px-4 py-2 rounded-xl ${accentBg} disabled:opacity-50 text-white text-xs font-black border-2 border-[#161C2D] shadow-[2px_2px_0px_0px_#171717] transition cursor-pointer`}
                          >
                            Simpan Permission
                          </button>
                        </Can>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

