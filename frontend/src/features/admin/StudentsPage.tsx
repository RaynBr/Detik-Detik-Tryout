import React, { useState, useEffect } from 'react';
import { apiClient } from '../../shared/api/client';
import { TableSkeleton } from '../../shared/components/LoadingSkeleton';
import { useToast } from '../../shared/context/ToastContext';
import { Plus, Edit2, Trash2, X, Users, Search, Upload, KeyRound } from 'lucide-react';
import { StudentImportModal } from './components/StudentImportModal';

interface Major {
  id: number;
  name: string;
  code: string;
}

interface ClassRoom {
  id: number;
  name: string;
  level: number;
}

interface StudentProfile {
  id: number;
  nisn: string | null;
  nis: string | null;
  class_id: number | null;
  major_id: number | null;
  class_room: ClassRoom | null;
  major: Major | null;
}

interface StudentUser {
  id: number;
  name: string;
  email: string | null;
  username: string;
  student: StudentProfile | null;
}

export const StudentsPage: React.FC = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nisn, setNisn] = useState('');
  const [nis, setNis] = useState('');
  const [classId, setClassId] = useState('');
  const [majorId, setMajorId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [studentsRes, classesRes, majorsRes] = await Promise.all([
        apiClient.get('/admin/students'),
        apiClient.get('/admin/classes'),
        apiClient.get('/admin/majors')
      ]);
      setStudents(studentsRes.data);
      setClasses(classesRes.data);
      setMajors(majorsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingStudent(null);
    setName('');
    setEmail('');
    setUsername('');
    setPassword('');
    setNisn('');
    setNis('');
    setClassId('');
    setMajorId('');
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (student: StudentUser) => {
    setEditingStudent(student);
    setName(student.name);
    setEmail(student.email || '');
    setUsername(student.username);
    setPassword('');
    setNisn(student.student?.nisn || '');
    setNis(student.student?.nis || '');
    setClassId(student.student?.class_id ? student.student.class_id.toString() : '');
    setMajorId(student.student?.major_id ? student.student.major_id.toString() : '');
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload: any = {
      name,
      email: email || null,
      username,
      nisn: nisn || null,
      nis: nis || null,
      class_id: classId ? Number(classId) : null,
      major_id: majorId ? Number(majorId) : null,
    };

    if (password) {
      payload.password = password;
    } else if (!editingStudent) {
      setError('Password wajib diisi untuk siswa baru.');
      setLoading(false);
      return;
    }

    try {
      if (editingStudent) {
        await apiClient.put(`/admin/students/${editingStudent.id}`, payload);
        toast.success('Data siswa berhasil diperbarui!');
      } else {
        await apiClient.post('/admin/students', payload);
        toast.success('Siswa baru berhasil ditambahkan!');
      }
      fetchData();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal menyimpan data siswa.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus siswa ini? Semua log pengerjaan akan terhapus.')) return;
    try {
      await apiClient.delete(`/admin/students/${id}`);
      toast.success('Data siswa berhasil dihapus!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus siswa.');
    }
  };

  const handleResetPassword = async (student: StudentUser) => {
    if (!confirm(`Apakah Anda yakin ingin mereset password akun siswa "${student.name}"? Password baru yang aman akan dibuat secara otomatis.`)) return;
    try {
      const res = await apiClient.post(`/admin/students/${student.id}/reset-password`);
      toast.success(`Password siswa berhasil direset! Password baru: ${res.data.new_password}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset password siswa.');
    }
  };

  // Filter students logic
  const filteredStudents = students.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.student?.nis && s.student.nis.includes(search));
    
    const matchesClass = classFilter === '' || s.student?.class_id === Number(classFilter);
    const matchesMajor = majorFilter === '' || s.student?.major_id === Number(majorFilter);

    return matchesSearch && matchesClass && matchesMajor;
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/30">
              <Users className="h-6 w-6" />
            </div>
            <span>Manajemen Siswa</span>
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-xs md:text-sm mt-1 font-medium">
            Konfigurasi akun siswa dan data kelengkapan ujian CBT.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-bold transition active:scale-95 shadow-xs"
          >
            <Upload className="h-4 w-4" />
            <span>Impor Siswa (Excel/CSV)</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 glass-panel p-4 rounded-3xl shadow-sm">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Cari nama, NISN, atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 font-medium"
          />
        </div>

        <div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0f172a] font-medium"
          >
            <option value="">-- Semua Kelas --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Kelas {cls.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={majorFilter}
            onChange={(e) => setMajorFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 glass-input rounded-xl text-sm text-slate-900 dark:text-white bg-white dark:bg-[#0f172a] font-medium"
          >
            <option value="">-- Semua Jurusan --</option>
            {majors.map((mj) => (
              <option key={mj.id} value={mj.id}>
                {mj.code} — {mj.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => {
            setSearch('');
            setClassFilter('');
            setMajorFilter('');
          }}
          className="py-2.5 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition"
        >
          Reset Filter
        </button>
      </div>

      {/* Table or Skeleton */}
      {loadingData ? (
        <TableSkeleton rows={6} columns={5} />
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">NISN (Username)</th>
                <th className="px-6 py-4">Nama Siswa</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">Jurusan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-sm text-slate-700 dark:text-gray-300 font-medium">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-300 text-xs font-bold">{std.username}</td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{std.name}</td>
                    <td className="px-6 py-4">
                      {std.student?.class_room ? (
                        <span className="text-slate-900 dark:text-white font-semibold">{std.student.class_room.name}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-xs">Belum diplot</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {std.student?.major ? (
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 text-xs font-bold rounded-lg">
                          {std.student.major.code}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1">
                      <button
                        onClick={() => handleResetPassword(std)}
                        className="inline-flex p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl transition"
                        title="Reset Password Siswa"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(std)}
                        className="inline-flex p-2 hover:bg-indigo-50 dark:hover:bg-white/5 text-indigo-600 dark:text-indigo-400 rounded-xl transition"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(std.id)}
                        className="inline-flex p-2 hover:bg-rose-50 dark:hover:bg-white/5 text-rose-600 dark:text-rose-400 rounded-xl transition"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-gray-500 font-medium">
                    Tidak ada data siswa yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* CRUD Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#070a13]/80 backdrop-blur-md">
          <div className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-4">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h2>

            {error && (
              <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-semibold shrink-0">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Nama Lengkap Siswa
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Izul Fitra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    NISN (Username Login)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 1234567890"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Email Siswa (Opsional)
                  </label>
                  <input
                    type="email"
                    placeholder="siswa@cbt.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Kata Sandi {editingStudent && '(Kosongkan jika tidak diubah)'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required={!editingStudent}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    NIS (Nomor Induk Siswa)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 10245"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 1234567890"
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Pilih Kelas
                  </label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Kelas {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Pilih Jurusan
                  </label>
                  <select
                    value={majorId}
                    onChange={(e) => setMajorId(e.target.value)}
                    className="w-full px-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-sm bg-white dark:bg-[#0f172a] font-medium"
                  >
                    <option value="">-- Pilih Jurusan --</option>
                    {majors.map((mj) => (
                      <option key={mj.id} value={mj.id}>
                        {mj.code} — {mj.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition flex justify-center items-center shadow-lg shadow-indigo-600/30"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Import Modal (XLSX / CSV) */}
      <StudentImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
};
