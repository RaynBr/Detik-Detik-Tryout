import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/api/client';
import { useToast } from '../../../shared/context/ToastContext';
import { Pagination } from '../../../shared/components/Pagination';
import { usePaginationUrl } from '../../../shared/utils/usePaginationUrl';
import { 
  Megaphone, Plus, Search, Clock, 
  Users, CheckCircle2, Edit, Trash2, Archive, 
  Send, Paperclip, RefreshCw, X, Shield, School, User
} from 'lucide-react';

export interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  category: string;
  category_label?: string;
  priority: string;
  status: string;
  is_active: boolean;
  badge_text?: string;
  publish_at?: string | null;
  expired_at?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  created_by?: string;
  sender_name?: string;
  sender_role?: string;
  role?: string;
  idkategori?: string | number | null;
  instansi_name?: string;
  target_type: string;
  target_id?: string | null;
  target_label?: string;
  is_global?: boolean;
  created_at: string;
  created_at_human?: string;
  id_guru?: number | null;
}

export interface TargetOptionGroup {
  role: string;
  target_types: { value: string; label: string }[];
  instansi?: { idkategori: any; nama_kategori: string }[];
  classes?: { idkelas: any; nama_kelas: string }[];
  academic_years?: { idtahun_ajaran: any; nama_tahun_ajaran: string }[];
  levels?: { idtingkat: any; nama_tingkat: string }[];
}

interface AnnouncementManagementPageProps {
  scope: 'super_admin' | 'admin' | 'guru';
}

const CATEGORIES = [
  'Informasi', 'Pengumuman', 'Jadwal Ujian', 'Ujian Aktif', 
  'Peringatan', 'Nilai', 'Tugas', 'Penting'
];

const PRIORITIES = ['Rendah', 'Normal', 'Tinggi', 'Sangat Penting'];

export const AnnouncementManagementPage: React.FC<AnnouncementManagementPageProps> = ({ scope }) => {
  const { toast } = useToast();
  const { currentPage, paginationMeta, setPaginationFromResponse } = usePaginationUrl(10);

  // Endpoint base prefix based on scope
  const apiPrefix = scope === 'super_admin' ? '/super-admin' : (scope === 'guru' ? '/teacher' : '/admin');

  // State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [priorityFilter, setPriorityFilter] = useState('Semua');

  // Target Options from backend
  const [targetOptions, setTargetOptions] = useState<TargetOptionGroup | null>(null);

  // Modal Create/Edit State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('Informasi');
  const [formPriority, setFormPriority] = useState('Normal');
  const [formStatus, setFormStatus] = useState('Aktif');
  const [formPublishAt, setFormPublishAt] = useState('');
  const [formExpiredAt, setFormExpiredAt] = useState('');
  const [formTargetType, setFormTargetType] = useState('all');
  const [formTargetId, setFormTargetId] = useState('');
  const [formIdkategori, setFormIdkategori] = useState('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formAttachmentName, setFormAttachmentName] = useState('');

  // 1. Fetch Target Options
  const fetchTargetOptions = async () => {
    try {
      const res = await apiClient.get(`${apiPrefix}/announcements/target-options`);
      setTargetOptions(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load target options:', err);
    }
  };

  // 2. Fetch Announcements List
  const fetchAnnouncements = async (page = currentPage) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'Semua') params.status = statusFilter;
      if (categoryFilter !== 'Semua') params.category = categoryFilter;
      if (priorityFilter !== 'Semua') params.priority = priorityFilter;

      const res = await apiClient.get(`${apiPrefix}/announcements`, { params });
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setAnnouncements(items);
      setPaginationFromResponse(res.data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      toast.error('Gagal memuat daftar pengumuman.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargetOptions();
  }, [scope]);

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [currentPage, search, statusFilter, categoryFilter, priorityFilter]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('Informasi');
    setFormPriority('Normal');
    setFormStatus('Aktif');
    const today = new Date().toISOString().split('T')[0];
    setFormPublishAt(today);
    setFormExpiredAt('');
    
    if (scope === 'guru') {
      setFormTargetType('all_taught');
    } else {
      setFormTargetType('all');
    }
    setFormTargetId('');
    setFormIdkategori('');
    setFormAttachmentUrl('');
    setFormAttachmentName('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: AnnouncementItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormCategory(item.category || 'Informasi');
    setFormPriority(item.priority || 'Normal');
    setFormStatus(item.status || 'Aktif');
    setFormPublishAt(item.publish_at ? item.publish_at.split(' ')[0] : '');
    setFormExpiredAt(item.expired_at ? item.expired_at.split(' ')[0] : '');
    setFormTargetType(item.target_type || 'all');
    setFormTargetId(item.target_id || '');
    setFormIdkategori(item.idkategori ? String(item.idkategori) : '');
    setFormAttachmentUrl(item.attachment_url || '');
    setFormAttachmentName(item.attachment_name || '');
    setModalOpen(true);
  };

  // Submit Save
  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Judul dan isi pengumuman wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        priority: formPriority,
        status: formStatus,
        publish_at: formPublishAt ? `${formPublishAt} 00:00:00` : null,
        expired_at: formExpiredAt ? `${formExpiredAt} 23:59:59` : null,
        target_type: formTargetType,
        target_id: formTargetId || null,
        attachment_url: formAttachmentUrl || null,
        attachment_name: formAttachmentName || null,
      };

      if (scope === 'super_admin' && formTargetType === 'instansi' && formIdkategori) {
        payload.idkategori = formIdkategori;
      }

      if (editingItem) {
        await apiClient.put(`${apiPrefix}/announcements/${editingItem.id}`, payload);
        toast.success('Pengumuman berhasil diperbarui.');
      } else {
        await apiClient.post(`${apiPrefix}/announcements`, payload);
        toast.success('Pengumuman baru berhasil dibuat!');
      }

      setModalOpen(false);
      fetchAnnouncements(1);
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengumuman.');
    } finally {
      setSaving(false);
    }
  };

  // Publish Announcement
  const handlePublish = async (id: number) => {
    try {
      await apiClient.post(`${apiPrefix}/announcements/${id}/publish`);
      toast.success('Pengumuman berhasil dipublikasikan dan aktif!');
      fetchAnnouncements(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mempublikasikan pengumuman.');
    }
  };

  // Archive Announcement
  const handleArchive = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin mengarsipkan pengumuman ini? Pengumuman tidak akan tampil lagi untuk siswa.')) return;
    try {
      await apiClient.post(`${apiPrefix}/announcements/${id}/archive`);
      toast.success('Pengumuman berhasil diarsipkan.');
      fetchAnnouncements(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengarsipkan pengumuman.');
    }
  };

  // Delete Announcement
  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus pengumuman ini secara permanen?')) return;
    try {
      await apiClient.delete(`${apiPrefix}/announcements/${id}`);
      toast.success('Pengumuman berhasil dihapus.');
      fetchAnnouncements(currentPage);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengumuman.');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const activeCount = announcements.filter(a => a.status === 'Aktif' || a.is_active).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
              {scope === 'super_admin' ? 'Super Admin' : (scope === 'guru' ? 'Guru Pengampu' : 'Admin Instansi')}
            </span>
            <span className="text-xs font-semibold text-slate-400">• Satu Sumber Data Sistem</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {scope === 'super_admin' 
              ? 'Kelola Pengumuman Global Platform' 
              : (scope === 'guru' ? 'Kelola Pengumuman Kelas & Ujian' : 'Kelola Pengumuman Sekolah')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            {scope === 'super_admin'
              ? 'Terbitkan pengumuman pemeliharaan sistem, pembaruan, dan agenda nasional untuk semua instansi.'
              : (scope === 'guru'
                  ? 'Kirim pemberitahuan langsung kepada siswa pada kelas yang Anda ampu.'
                  : 'Kirim pengumuman resmi instansi/sekolah dengan target rombel, tingkat, atau tahun ajaran.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchAnnouncements(currentPage)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 font-bold transition flex items-center justify-center cursor-pointer shadow-xs"
            title="Segarkan Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#1A1E22]/70">
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Total Pengumuman
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {paginationMeta.total || announcements.length}
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            Seluruh arsip & terbitan
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#1A1E22]/70">
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Pengumuman Aktif
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {activeCount}
          </p>
          <span className="text-[10px] text-emerald-600/80 font-medium mt-1 block">
            Tampil di popup siswa
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#1A1E22]/70">
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Peran Anda
          </span>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {scope === 'super_admin' ? 'Super Admin' : (scope === 'guru' ? 'Guru' : 'Admin Sekolah')}
          </p>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">
            {scope === 'guru' ? 'Otoritas kelas yang diajar' : 'Otoritas terpusat'}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-[#1A1E22]/70">
          <span className="text-[11px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
            Penerima
          </span>
          <p className="text-xl font-black text-cyan-600 dark:text-cyan-400">
            Siswa CBT
          </p>
          <span className="text-[10px] text-cyan-600/80 font-medium mt-1 block">
            Popup Login & Navbar Bell
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul, isi, atau penulis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif (Tayang)</option>
              <option value="Draft">Draft (Konsep)</option>
              <option value="Terjadwal">Terjadwal</option>
              <option value="Berakhir">Berakhir</option>
              <option value="Arsip">Arsip</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
            >
              <option value="Semua">Semua Kategori</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
            >
              <option value="Semua">Semua Prioritas</option>
              {PRIORITIES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/4"></div>
              <div className="h-6 bg-slate-200 dark:bg-white/10 rounded w-1/2"></div>
              <div className="h-10 bg-slate-100 dark:bg-white/5 rounded"></div>
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-white/10 space-y-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl inline-block">
            <Megaphone className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Belum Ada Pengumuman
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'Semua' 
              ? 'Tidak ada pengumuman yang sesuai dengan kriteria filter.' 
              : 'Klik tombol "Buat Pengumuman Baru" untuk mempublikasikan pengumuman pertama Anda.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Buat Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {announcements.map((item) => {
            const canManage = scope === 'super_admin' 
              || (scope === 'admin' && item.role !== 'super_admin')
              || (scope === 'guru' && item.role === 'guru');

            return (
              <div
                key={item.id}
                className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#1A1E22] transition hover:shadow-md space-y-3"
              >
                {/* Header item */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      item.status === 'Aktif'
                        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700'
                        : item.status === 'Draft'
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 border border-slate-300 dark:border-white/10'
                        : item.status === 'Arsip'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700'
                        : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400'
                    }`}>
                      {item.status}
                    </span>

                    {/* Category Badge */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40">
                      {item.category}
                    </span>

                    {/* Priority Badge */}
                    {item.priority === 'Sangat Penting' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                        🚨 Sangat Penting
                      </span>
                    )}
                    {item.priority === 'Tinggi' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white">
                        ⚡ Tinggi
                      </span>
                    )}

                    {/* Target Scope Badge */}
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 flex items-center gap-1">
                      <Users className="h-3 w-3 text-indigo-500" />
                      <span>{item.target_label || `Target: ${item.target_type}`}</span>
                    </span>

                    {/* Creator Identity */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 flex items-center gap-1">
                      {item.role === 'super_admin' ? (
                        <>
                          <Shield className="h-3 w-3 text-purple-500" />
                          <span>Global (Super Admin)</span>
                        </>
                      ) : item.role === 'admin' ? (
                        <>
                          <School className="h-3 w-3 text-blue-500" />
                          <span>{item.instansi_name || 'Admin Sekolah'}</span>
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 text-emerald-500" />
                          <span>Guru: {item.sender_name || item.created_by}</span>
                        </>
                      )}
                    </span>
                  </div>

                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {/* Title & Content */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                    <span>{item.title}</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-line line-clamp-3">
                    {item.content}
                  </p>
                </div>

                {/* Attachment if present */}
                {item.attachment_url && (
                  <div>
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Lampiran: {item.attachment_name || 'Berkas Terlampir'}</span>
                    </a>
                  </div>
                )}

                {/* Actions Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.publish_at && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Tayang: {formatDate(item.publish_at)}
                      </span>
                    )}
                    {item.expired_at && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        s.d. {formatDate(item.expired_at)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage ? (
                      <>
                        {item.status !== 'Aktif' && (
                          <button
                            onClick={() => handlePublish(item.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Publikasikan</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(item)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Edit</span>
                        </button>

                        {item.status !== 'Arsip' && (
                          <button
                            onClick={() => handleArchive(item.id)}
                            className="px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-100 transition flex items-center gap-1.5 cursor-pointer"
                            title="Arsipkan"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            <span>Arsip</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer"
                          title="Hapus Permanen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-400 italic">
                        Pengumuman Instansi / Global (Read-only)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {paginationMeta.lastPage > 1 && (
            <div className="pt-4 flex justify-center">
              <Pagination
                currentPage={paginationMeta.currentPage}
                lastPage={paginationMeta.lastPage}
                total={paginationMeta.total}
                onPageChange={(p) => fetchAnnouncements(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* MODAL CREATE / EDIT ANNOUNCEMENT */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1E22] shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Sistem Pengumuman Terpadu (Super Admin • Admin Instansi • Guru)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Jadwal Ujian Akhir Semester Dimulai Besok"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Isi Pengumuman <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tuliskan detail pengumuman yang jelas untuk dibaca siswa pada popup..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 2-Columns: Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Kategori Pengumuman
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Prioritas Tampil
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2-Columns: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Tanggal Mulai Tayang
                  </label>
                  <input
                    type="date"
                    value={formPublishAt}
                    onChange={(e) => setFormPublishAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Tanggal Berakhir (Opsional)
                  </label>
                  <input
                    type="date"
                    value={formExpiredAt}
                    onChange={(e) => setFormExpiredAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs text-slate-900 dark:text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Target Type & Scope Configuration */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Target Sasaran Pengumuman
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                      Tipe Target
                    </label>
                    <select
                      value={formTargetType}
                      onChange={(e) => {
                        setFormTargetType(e.target.value);
                        setFormTargetId('');
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1A1E22] text-xs font-medium focus:outline-none"
                    >
                      {targetOptions?.target_types?.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      )) || (
                        <option value="all">Semua Siswa</option>
                      )}
                    </select>
                  </div>

                  {/* Super Admin specific: Target Instansi */}
                  {scope === 'super_admin' && formTargetType === 'instansi' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                        Pilih Instansi Sekolah
                      </label>
                      <select
                        value={formIdkategori}
                        onChange={(e) => setFormIdkategori(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1A1E22] text-xs font-medium focus:outline-none"
                      >
                        <option value="">Pilih Instansi...</option>
                        {targetOptions?.instansi?.map(i => (
                          <option key={i.idkategori} value={i.idkategori}>{i.nama_kategori}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Class selection for Guru or Admin */}
                  {(formTargetType === 'class' || (scope === 'guru' && formTargetType === 'class')) && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-gray-400 mb-1">
                        Pilih Kelas
                      </label>
                      <select
                        value={formTargetId}
                        onChange={(e) => setFormTargetId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1A1E22] text-xs font-medium focus:outline-none"
                      >
                        <option value="">Pilih Kelas...</option>
                        {targetOptions?.classes?.map(c => (
                          <option key={c.idkelas} value={c.idkelas}>{c.nama_kelas}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Attachment URL (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    URL Lampiran (Opsional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://contoh.com/berkas-jadwal.pdf"
                    value={formAttachmentUrl}
                    onChange={(e) => setFormAttachmentUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                    Label Lampiran (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Unduh PDF Jadwal Lengkap"
                    value={formAttachmentName}
                    onChange={(e) => setFormAttachmentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Status Penerbitan
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-xs font-medium focus:outline-none"
                >
                  <option value="Aktif">Aktif (Langsung tayang di popup siswa)</option>
                  <option value="Draft">Draft (Simpan sebagai konsep)</option>
                  <option value="Arsip">Arsip (Sembunyikan dari siswa)</option>
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saving ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Terbitkan Pengumuman')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
