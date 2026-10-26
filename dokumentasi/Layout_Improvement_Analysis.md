# Layout Improvement Analysis: Perbaikan Struktur Layout Back Office Dashboard

**Proyek:** Sistem CBT Ujian Online (Online Examination System)  
**Lingkup Pengguna:** Seluruh Role Back Office (*Super Admin IP, Admin Instansi / Admin Sekolah, Guru*)  
**Pengecualian Mutlak:** Siswa (*Tetap menggunakan layout mandiri saat ini tanpa perubahan*)  
**Status:** Dokumen Analisis Perubahan Arsitektur Tampilan (Sebelum Pengubahan Source Code)

---

## 1. Kondisi Saat Ini (Berdasarkan Source Code)

Berdasarkan pemeriksaan langsung pada file layout yang aktif:
- [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) (Melayani **Super Admin** dan **Admin Instansi**)
- [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx) (Melayani **Guru**)

### 1.1. Struktur Hierarki Elemen Saat Ini
```tsx
<div className="min-h-screen flex bg-slate-100/70 dark:bg-[#070a13] ...">
  {/* Sidebar Desktop */}
  <aside className="hidden md:flex flex-col w-64 glass-panel border-r ... shrink-0">
    <div>... Header Logo & Toggle ...</div>
    <nav className="flex-1 space-y-1.5 ...">
      {/* Menu Navigasi */}
    </nav>
    <div className="border-t pt-4 mt-4 space-y-3 w-full">
      {/* Theme Toggle, Profile User Card, Tombol Keluar */}
    </div>
  </aside>

  {/* Mobile Topbar */}
  <div className="md:hidden fixed top-0 left-0 right-0 h-16 ...">...</div>

  {/* Area Konten Utama */}
  <main className="flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto">
    <div className="p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
      <Outlet />
    </div>
  </main>
</div>
```

### 1.2. Penggunaan Kelas CSS Saat Ini
1. **Container Luar (Root `div`):**
   - Menggunakan `min-h-screen flex`.
   - **TIDAK menggunakan** `h-screen`, `overflow-hidden`, atau pengunci batas viewport peramban.
2. **Sidebar Desktop (`<aside>`):**
   - Menggunakan `flex-col shrink-0` dengan lebar dinamis `w-64` atau `w-20`.
   - **TIDAK memiliki** pembatas tinggi eksplisit `h-screen` atau `sticky top-0`.
   - Footer sidebar hanya diberi `mt-4 pt-4 border-t` dan **TIDAK menggunakan `mt-auto`**.
3. **Area Konten (`<main>`):**
   - Diberi `flex-1 overflow-y-auto`, namun karena container induknya `min-h-screen` tidak memiliki batas tinggi maksimum (`max-h-screen` / `h-screen`), kelas `overflow-y-auto` di `<main>` menjadi tidak aktif sebagai pembatas scroll viewport.
4. **Desktop Navbar:**
   - Saat ini **belum ada bar navigasi atas di tampilan desktop**. Header hanya ada untuk tampilan mobile (`md:hidden`).

---

## 2. Penyebab Masalah

### 2.1. Penyebab Masalah 1: Footer Sidebar Tenggelam ke Bawah pada Halaman Panjang
1. **Peregangan Otomatis Flexbox (*Flex Stretch*):** Container root menggunakan `min-h-screen flex`. Secara bawaan CSS Flexbox, nilai properti `align-items` adalah `stretch`.
2. Ketika halaman anak ([Bank Soal](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/QuestionBankPage.tsx), [Live Monitoring](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/LiveMonitoringPage.tsx), [Paket Ujian](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/ExamsPage.tsx), atau [Laporan Nilai](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/ExamReportPage.tsx)) merender konten yang sangat panjang (misal 2.500 piksel), container root `div` ikut memanjang menjadi 2.500 piksel.
3. Karena container root memanjang, elemen `<aside>` otomatis ikut memanjang menjadi 2.500 piksel.
4. Di dalam `<aside>`, elemen `<nav className="flex-1">` meregang mengisi sisa ruang vertikal (~2.200 piksel). Akibatnya, footer sidebar (*Theme Toggle, Profile, Logout*) **terdorong sejauh 2.200 piksel ke bawah layar**, sehingga user harus menggulir halaman hingga ke ujung dasar hanya untuk melihat identitas akun atau tombol logout.

### 2.2. Penyebab Masalah 2: Sidebar Ikut Tergulung saat Konten Kanan Di-scroll
1. Karena container terluar tidak dikunci dengan `h-screen overflow-hidden`, peramban menjalankan **Window-Level Scrolling** (pengguliran terjadi pada elemen `<body>` / `<html>` browser secara global).
2. Posisi `<aside>` bukanlah fixed/sticky viewport, melainkan elemen statis di dalam alur dokumen (*normal flow*).
3. Saat pengguna memutar roda mouse pada area konten sebelah kanan, seluruh jendela peramban bergerak ke bawah, menyebabkan sidebar kiri ikut tergulung ke atas dan menghilang dari pandangan mata pengguna.

---

## 3. Layout Yang Direkomendasikan (Standar Dashboard Modern)

Mengadopsi pola arsitektur layout profesional seperti **GitHub, Laravel Nova, dan Filament Admin**:

```
+----------------------+----------------------------------------------------+
|                      | Navbar (Breadcrumbs, Page Title, Context Role)     |
|                      +----------------------------------------------------+
|                      |                                                    |
| Sidebar (Desktop)    |                                                    |
| - Full Height        | Main Content (Area Kerja Kerja Mandiri)            |
| - Tetap di Kiri      | - Scroll Sendiri (overflow-y-auto)                 |
| - Tidak Ikut Scroll  | - Tidak Mempengaruhi Sidebar                       |
| - Collapse Tetap OK  | - Tetap Responsif                                  |
| - Menu Scrollable    |                                                    |
|----------------------|                                                    |
| Footer Sidebar:      |                                                    |
| - Theme Toggle       |                                                    |
| - Profile Card       |                                                    |
| - Logout Button      |                                                    |
+----------------------+----------------------------------------------------+
```

### 3 Prinsip Utama Implementasi:
1. **Viewport Lock pada Root:** Container terluar dikunci dengan `h-screen w-screen overflow-hidden flex`. Scrollbar global peramban ditiadakan 100%.
2. **Sidebar Terisolasi Penuh (Full Height & Pinned Footer):**
   - `<aside>` memiliki tinggi tetap `h-screen flex flex-col`.
   - `<nav>` di dalam sidebar diberi `flex-1 overflow-y-auto custom-scrollbar` agar jika daftar menu panjang atau resolusi layar laptop pendek, menu navigasi dapat di-scroll di dalam sidebar tanpa mendorong footer.
   - Footer sidebar diberi kelas `shrink-0 mt-auto` agar **secara mutlak selalu menempel di bagian paling bawah layar**, konsisten di semua halaman tanpa terpengaruh panjangnya konten.
3. **Kolom Kanan Mandiri (Navbar + Main Content):**
   - Kolom kanan menggunakan `flex-1 flex flex-col h-screen min-w-0 overflow-hidden`.
   - Di bagian atas ditambahkan **Desktop Top Navbar** (`h-16 shrink-0 border-b glass-panel`) untuk menampilkan judul halaman/breadcrumb dan status instansi.
   - Area konten utama `<main>` menggunakan `flex-1 overflow-y-auto min-w-0`, menjadikannya **satu-satunya elemen yang dapat di-scroll**.

---

## 4. File Yang Akan Diubah

Sesuai aturan *"Gunakan layout yang sudah ada dan jangan membuat layout baru jika tidak diperlukan"*, perbaikan diterapkan pada 2 file layout Back Office:

| No | File Path | Pengguna / Role | Keterangan |
| :---: | :--- | :--- | :--- |
| 1 | [frontend/src/features/admin/AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) | Super Admin IP & Admin Instansi | Penyesuaian container `h-screen`, penambahan Desktop Navbar, dan penguncian footer sidebar dengan tema Indigo. |
| 2 | [frontend/src/features/teacher/TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx) | Guru / Pengajar | Penyesuaian container `h-screen`, penambahan Desktop Navbar, dan penguncian footer sidebar dengan tema Cyan. |
| 3 | [frontend/src/features/student/StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx) | Siswa | **TIDAK DISENTUH SAMA SEKALI** (Sesuai instruksi). |

---

## 5. Perubahan Tailwind CSS

Berikut adalah perbandingan kelas utilitas Tailwind CSS antara kode lama dan kode baru:

| Elemen Target | Kelas Saat Ini (Lama) | Kelas Rekomendasi (Baru) | Alasan Perubahan |
| :--- | :--- | :--- | :--- |
| **Container Root** | `min-h-screen flex` | `h-screen w-screen overflow-hidden flex` | Mengunci seluruh layar agar scrollbar browser mati dan layout menjadi berbasis viewport aplikasi. |
| **Sidebar `<aside>`** | `hidden md:flex flex-col w-64 glass-panel ...` | `hidden md:flex flex-col h-screen glass-panel border-r ... shrink-0 select-none` | Mengunci tinggi sidebar tepat 100% tinggi layar (`h-screen`) dan mencegah seleksi teks tak sengaja. |
| **Navigasi `<nav>`** | `flex-1 space-y-1.5` | `flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 custom-scrollbar` | Memungkinkan daftar menu di-scroll mandiri jika layar vertikal sempit tanpa mendorong footer ke bawah. |
| **Footer Sidebar** | `border-t pt-4 mt-4 space-y-3 w-full` | `shrink-0 mt-auto border-t pt-4 space-y-3 w-full` | `mt-auto` dan `shrink-0` memastikan posisi footer **selalu menempel di paling bawah sidebar** secara permanen. |
| **Kolom Kanan Wrapper** | *(Belum ada)* | `flex-1 flex flex-col h-screen min-w-0 overflow-hidden` | Memisahkan kolom kerja kanan menjadi kesatuan yang menaungi Navbar atas dan Content bawah. |
| **Desktop Navbar** | *(Belum ada - hanya mobile)* | `hidden md:flex items-center justify-between h-16 px-8 border-b glass-panel shrink-0` | Menghadirkan navbar horizontal atas yang elegan sesuai diagram target user. |
| **Main Content `<main>`** | `flex-1 flex flex-col min-w-0 pt-16 md:pt-0 overflow-y-auto` | `flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-16 md:pt-0` | Menjadikan `<main>` satu-satunya wadah pengguliran vertikal; sidebar di sisi kiri tetap 100% diam dan kokoh. |

---

## 6. Perubahan React Component

Struktur JSX pada [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) dan [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx) akan ditata ulang menjadi arsitektur berikut:

```tsx
export const AdminLayout: React.FC = () => {
  // 1. Logika Collapse & LocalStorage Tetap Dipertahankan 100%
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    return localStorage.getItem('cbt_sidebar_collapsed') === 'true';
  });

  // 2. Helper penentu nama menu aktif untuk Desktop Navbar
  const currentMenu = menuItems.find(item => item.path === location.pathname)?.name || 'Dashboard';

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-100/70 dark:bg-[#070a13] text-slate-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* SIDEBAR: Full Height, Locked Left, Never Scrolls */}
      <aside className={`hidden md:flex flex-col h-screen glass-panel border-r border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out shrink-0 select-none ${
        isCollapsed ? 'w-20 p-3 items-center' : 'w-64 p-5'
      }`}>
        {/* Header Logo & Collapse Toggle */}
        <div className="shrink-0 mb-6 w-full">...</div>

        {/* Menu Navigasi dengan scroll internal aman */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden space-y-1.5 w-full pr-1">...</nav>

        {/* Footer Sidebar Selalu Terkunci di Paling Bawah */}
        <div className="shrink-0 mt-auto border-t border-slate-200 dark:border-white/5 pt-4 space-y-3 w-full">
          {/* ThemeToggle, Profile Card, Logout */}
        </div>
      </aside>

      {/* KOLOM KANAN: Navbar Atas + Area Konten Scrollable */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        
        {/* Mobile Topbar (Hanya muncul di layar < 768px) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 ...">...</div>

        {/* Desktop Navbar (Muncul di layar >= 768px sesuai Target Layout) */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 border-b border-slate-200 dark:border-white/5 bg-white/60 dark:bg-[#070a13]/60 backdrop-blur-xl shrink-0 z-20">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{currentMenu}</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">Detik Detik TryOut CBT Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-gray-300">
              {user?.role === 'super_admin' ? 'Super Admin IP' : user?.role === 'admin' ? (user?.profile?.institution || 'Admin Sekolah') : 'Guru'}
            </span>
          </div>
        </header>

        {/* Main Content: SATU-SATUNYA Elemen yang Melakukan Scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 pt-16 md:pt-0">
          <div className="p-3.5 sm:p-5 md:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

    </div>
  );
};
```

---

## 7. Dampak Untuk Setiap Role

| Role | Terpengaruh | Keterangan |
| :--- | :---: | :--- |
| **Super Admin** | **Ya** | Menggunakan [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx). Sidebar akan terkunci di kiri layar penuh, footer profil selalu berada di bawah, dan halaman tabel data besar (*Live Monitoring, Instansi*) dapat di-scroll tanpa menggerakkan sidebar. |
| **Admin Instansi** | **Ya** | Menggunakan [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx). Mendapatkan pengalaman UI/UX yang identik dengan Super Admin dengan pembatasan instansi masing-masing. |
| **Guru** | **Ya** | Menggunakan [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx). Sidebar panel guru terkunci di kiri layar penuh dengan aksen warna Cyan. Halaman Bank Soal dan Laporan Nilai dapat di-scroll secara independen. |
| **Siswa** | **Tidak** | **Tetap menggunakan layout sekarang ([StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx)).** Tidak mengalami perubahan tata letak apa pun. |

---

## 8. Risiko & Strategi Mitigasi

| Potensi Risiko | Dampak | Strategi Mitigasi |
| :--- | :--- | :--- |
| **1. Kemunculan Dobel Scrollbar (*Double Scrollbar*)** | Sedang | Memastikan elemen container root memiliki `overflow-hidden` dan `w-screen`, serta `<main>` memiliki `overflow-x-hidden` sehingga hanya ada satu scrollbar vertikal pada konten utama. |
| **2. Ketinggian Menu Melebihi Layar pada Laptop Kecil** | Sedang | Membungkus tag `<nav>` di dalam sidebar dengan `overflow-y-auto` mandiri. Jika layar laptop hanya setinggi 720px, daftar menu dapat di-scroll secara halus di dalam sidebar tanpa mendorong footer profil ke luar layar. |
| **3. Terganggunya Fitur Collapse yang Sudah Dibuat** | Tinggi | Seluruh state `isCollapsed`, fungsi `toggleSidebar()`, dan persistensi `localStorage.getItem('cbt_sidebar_collapsed')` dipertahankan 100% tanpa perubahan logika. |
| **4. Tabrakan Ruang Mobile (*Mobile Spacing Collision*)** | Rendah | Menggunakan padding top responsif `pt-16 md:pt-0` pada `<main>` sehingga pada layar mobile tetap memiliki ruang di bawah mobile topbar `fixed h-16`, sementara pada desktop menempel rapi di bawah desktop navbar. |

---

## 9. Checklist Implementasi

- [ ] **1. Persetujuan Analisis**
  - [x] Analisis mendalam masalah dan arsitektur layout selesai disusun.
  - [ ] Menunggu review dan persetujuan dari Anda sebelum mengubah source code.
- [ ] **2. Penerapan pada [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx)**
  - [ ] Ubah container root menjadi `h-screen w-screen overflow-hidden flex`.
  - [ ] Pasang `h-screen flex flex-col shrink-0` pada elemen `<aside>` desktop.
  - [ ] Beri `flex-1 overflow-y-auto` pada elemen `<nav>` menu.
  - [ ] Beri `shrink-0 mt-auto` pada footer sidebar (*ThemeToggle, Profile, Logout*).
  - [ ] Tambahkan wrapper kolom kanan `flex-1 flex flex-col h-screen min-w-0 overflow-hidden`.
  - [ ] Tambahkan Desktop Top Navbar di atas area konten.
  - [ ] Pasang `flex-1 overflow-y-auto` pada elemen `<main>`.
- [ ] **3. Penerapan pada [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx)**
  - [ ] Terapkan penataan yang sama persis pada layout guru dengan mempertahankan warna aksen Cyan.
- [ ] **4. Pengujian & Verifikasi (Quality Assurance)**
  - [ ] **Uji Halaman Panjang:** Buka halaman Bank Soal (ratusan baris) & Laporan Nilai -> pastikan footer sidebar (*Profile, Tema, Logout*) tetap tampak di dasar layar tanpa bergeser.
  - [ ] **Uji Scroll Independen:** Gulir konten ke bawah -> pastikan sidebar diam di tempat dan hanya konten kanan yang bergerak.
  - [ ] **Uji Collapse & Persistensi:** Tutup sidebar, reload (F5), buka halaman lain -> pastikan status collapse tetap tersimpan dan animasi tetap halus.
  - [ ] **Uji Tampilan Mobile:** Pastikan di viewport ponsel (< 768px), drawer mobile dan topbar tetap berfungsi normal.
  - [ ] **Uji Modul Siswa:** Login sebagai siswa dan pastikan layout siswa tidak terpengaruh sama sekali.

---

*Dokumen ini telah disimpan ke [dokumentasi/Layout_Improvement_Analysis.md](file:///d:/MAGANG/exam/Sistem-Ujian-Online/dokumentasi/Layout_Improvement_Analysis.md). Sesuai aturan, saya berhenti di sini untuk menunggu review dan persetujuan Anda.*
