# Sidebar Feature Analysis: Penambahan Collapsible Persistent Sidebar pada Back Office

**Proyek:** Sistem CBT Ujian Online (Online Examination System)  
**Lingkup Pengguna:** Back Office (Super Admin IP, Admin Sekolah, Guru)  
**Pengecualian:** Siswa (Tidak diterapkan / Tetap menggunakan layout saat ini)  
**Status:** Dokumen Analisis Perubahan (Change Request Analysis - Sebelum Tahap Coding)

---

## 1. Kondisi Saat Ini (Berdasarkan Source Code)

### 1.1. Framework Frontend & Arsitektur Aplikasi
- **Framework Utama:** **React 19.2** (Single Page Application / SPA) berbasis **Vite 8** dan **TypeScript**.
- **Styling Engine:** **Tailwind CSS v4** (`@tailwindcss/vite` v4.3.3) dikombinasikan dengan token utilitas kustom di [index.css](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/index.css) (seperti `.glass-panel`, `.glass-card`).
- **Routing Engine:** **React Router DOM v7** (`BrowserRouter`, `Routes`, `Route`, `Outlet`, `useNavigate`, `useLocation`).
- **Icons Library:** **Lucide React** (`lucide-react` v1.31.0).
- **Teknologi yang TIDAK Digunakan:** Proyek ini **tidak** menggunakan AlpineJS, Livewire, Vue, Bootstrap, maupun manipulasi DOM JavaScript biasa (jQuery). Seluruh komponen berbasis komponen deklaratif React fungsional.

### 1.2. Layout Utama Dashboard & Sidebar Component
Berdasarkan pemeriksaan langsung pada [frontend/src/App.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/App.tsx), arsitektur layout terbagi menjadi 2 kelompok utama:

1. **Layout Back Office (Admin & Super Admin):** Menggunakan [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx).
   - Melayani rute `/admin/*` untuk peran `super_admin` dan `admin`.
   - Warna aksen: Indigo (`bg-indigo-600`).
2. **Layout Guru:** Menggunakan [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx).
   - Melayani rute `/teacher/*` untuk peran `guru`, `admin`, dan `super_admin`.
   - Warna aksen: Cyan (`bg-cyan-600`).
3. **Layout Siswa:** Menggunakan halaman mandiri [StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx).
   - Menggunakan navigasi atas (*top navbar header*) tanpa sidebar sama sekali.

> **Temuan Faktik Source Code:**
> Saat ini **belum ada file komponen Sidebar terpisah** (misalnya `Sidebar.tsx`). Elemen sidebar diimplementasikan secara langsung (*hardcoded inline*) di dalam tag `<aside>` pada masing-masing [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx#L43) dan [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx#L33).

### 1.3. Cara Kerja Sidebar Saat Ini
- **Dimensi Statis:** Sidebar desktop memiliki lebar tetap yang kaku (`w-64` atau 256 piksel), bersifat fleksibel menyamping terhadap konten utama melalui flexbox container:
  ```tsx
  <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200 dark:border-white/5 p-5 shrink-0">
  ```
- **Ketiadaan Tombol Collapse:** Tidak ada tombol toggle untuk menciutkan (*collapse*) maupun memperluas (*expand*) sidebar di tampilan desktop.
- **Tampilan Mobile:** Pada layar kecil (`< 768px`), sidebar desktop disembunyikan (`hidden md:flex`) dan digantikan oleh *Mobile Topbar* (tinggi `h-16`) dengan tombol drawer (*hamburger menu*) yang membuka overlay pop-up menu.
- **Struktur Konten Sidebar Saat Ini:**
  1. *Header Sidebar:* Ikon sekolah (`School`), judul aplikasi *"Detik Detik TryOut"*, dan label role.
  2. *Navigasi Menu:* Daftar tombol menu dengan ikon + teks label.
  3. *Footer Sidebar:* Komponen pengganti tema (`<ThemeToggle compact />`), kartu identitas pengguna (Avatar inisial, nama, badge role), dan tombol *"Keluar"* (`logout`).

### 1.4. Cara Perpindahan Halaman & Mekanisme Routing
- Navigasi menu menggunakan tombol dengan handler `onClick={() => navigate(item.path)}`.
- Konten halaman anak dirender di sisi kanan menggunakan `<Outlet />` dari `react-router-dom`.
- Status menu aktif dideteksi secara reaktif melalui perbandingan URL:
  ```tsx
  const isActive = location.pathname === item.path;
  ```
- **Karakteristik Lifecycle Layout:** Karena `AdminLayout` dan `TeacherLayout` membungkus rute anak (`<Route element={<AdminLayout />}> ... </Route>`), komponen layout **tidak di-unmount** saat user berpindah halaman di dalam portal yang sama (misal dari `/admin/dashboard` ke `/admin/questions`). Namun, jika user me-refresh peramban (F5) atau membuka tab baru, seluruh state lokal di dalam memory React (`useState`) akan kembali ke nilai awal (*default state*).

### 1.5. Kondisi State Management Saat Ini
Proyek telah memiliki pola state management menggunakan **React Context API** dengan persistensi peramban:
- [ThemeContext.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/shared/context/ThemeContext.tsx): Menyimpan preferensi tema dengan persistensi `localStorage.getItem('cbt_theme_mode')`.
- [AuthContext.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/shared/context/AuthContext.tsx): Menyimpan token otentikasi dan data user dengan persistensi `localStorage.getItem('cbt_token')` dan `localStorage.getItem('cbt_user')`.
- [ToastContext.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/shared/context/ToastContext.tsx): Mengelola antrean notifikasi dinamis dalam memori aplikasi.
- Belum ada global store eksternal (Redux/Zustand), dan penggunaan Context API + Local Storage sudah menjadi standar resmi di codebase ini.

---

## 2. Perubahan Yang Dibutuhkan

1. **Kemampuan Collapse & Expand Sidebar:**
   - Menambahkan tombol pemicu toggle (ikon panah / toggle sidebar dari Lucide React, misal: `PanelLeftClose` / `PanelLeftOpen` atau `ChevronLeft` / `ChevronRight`).
   - Mode Terbuka (*Expanded*): Lebar normal `w-64` (256px), menampilkan logo, teks judul, teks menu, profil lengkap, tema, dan tombol keluar.
   - Mode Tertutup (*Collapsed*): Lebar ringkas `w-20` (80px), hanya menampilkan ikon menu di tengah, menyembunyikan teks label, menyembunyikan teks nama dan instansi, menampilkan avatar inisial mini, serta tombol logout dan tema dalam bentuk ikon ringkas.
2. **Animasi Transisi Halus:**
   - Menggunakan transisi Tailwind `transition-all duration-300 ease-in-out` agar perubahan lebar sidebar tidak menghentak secara visual.
3. **Persistensi State Lintas Halaman & Lintas Sesi:**
   - Ketika user menutup sidebar di halaman Dashboard lalu berpindah ke Bank Soal, Paket Ujian, atau Laporan Nilai, sidebar harus **tetap dalam keadaan tertutup**.
   - Ketika user membuka kembali sidebar lalu berpindah halaman, sidebar harus **tetap terbuka**.
   - Jika halaman di-refresh (F5) atau browser ditutup dan dibuka kembali, preferensi terakhir user harus tetap dipertahankan.
4. **Isolasi Peran (Role Exclusivity):**
   - Diterapkan pada layout Back Office: [AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) dan [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx).
   - **TIDAK DITERAPKAN** pada modul siswa ([StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx)).

---

## 3. Analisis Metode State Sidebar (Komparasi Mendalam)

Berikut adalah evaluasi 4 (empat) metode penyimpanan state berdasarkan karakteristik teknis arsitektur proyek CBT ini:

| Metode | Cara Kerja | Kelebihan | Kekurangan | Kesesuaian Proyek |
| :--- | :--- | :--- | :--- | :--- |
| **Local Storage (`localStorage`)** | Data disimpan di penyimpanan lokal browser klien tanpa batas waktu kedaluwarsa. | • **Instan & Tanpa Latensi:** Pembacaan bersifat sinkron (`localStorage.getItem`) saat render pertama komponen React, mencegah *flicker* layout.<br>• **Konsisten dengan Arsitektur Codebase:** Pola ini sudah diterapkan pada `ThemeContext` (`cbt_theme_mode`) dan `AuthContext` (`cbt_token`).<br>• **Persisten Penuh:** Bertahan saat pindah halaman, reload tab (F5), maupun tutup-buka browser.<br>• **Zero Server Overhead:** Tidak membebani API backend dan database sama sekali. | • Preferensi tersimpan per peramban/perangkat (jika user berpindah dari PC kantor ke laptop pribadi, sidebar di laptop baru mengikuti default awal). | ⭐⭐⭐⭐⭐ **(Sangat Direkomendasikan - Opsi Terbaik)** |
| **Session Storage (`sessionStorage`)** | Data disimpan hanya selama siklus hidup (*lifecycle*) tab browser aktif. | • Cepat dan tanpa beban jaringan.<br>• Data otomatis bersih saat tab browser ditutup. | • **Tidak Bertahan Saat Buka Tab Baru:** Jika user membuka tab baru atau menutup browser, preferensi sidebar kembali terbuka lebar (default).<br>• Mengurangi kenyamanan UX bagi staf yang terbiasa bekerja dengan sidebar tertutup. | ⭐⭐⭐ (Kurang Ideal) |
| **Cookie (`document.cookie`)** | Data disimpan dalam string cookie peramban. | • Dapat dibaca oleh peramban dan server jika sistem menggunakan Server-Side Rendering (SSR). | • **Overhead HTTP Request:** Setiap request API ke backend Laravel akan membawa header cookie tersebut meskipun server backend tidak membutuhkannya.<br>• Proyek ini murni **React Client-Side SPA (Vite)**, bukan SSR/Blade, sehingga kegunaan cookie untuk UI state tidak relevan.<br>• Parsing cookie di JavaScript/TypeScript lebih lambat dan memerlukan kode tambahan. | ⭐⭐ (Tidak Efisien) |
| **Server Session / Database User Preference** | Menyimpan status sidebar di database backend (`user_bo`) via API endpoint `PATCH`. | • Preferensi tersimpan lintas perangkat (buka di PC manapun, state tetap sama). | • **Network Latency & Layout Shift:** Membutuhkan request asinkron ke server saat render pertama. Jika internet lambat, sidebar sempat terbuka lebar lalu tiba-tiba menciut setelah response tiba (*layout flickering*).<br>• **Overengineering:** Membutuhkan penambahan kolom database, endpoint API baru, dan controller backend hanya untuk status buka-tutup visual. | ⭐ (Overkill & Berisiko) |

### Rekomendasi Metode Terpilih:
> **Pilihan Utama: `localStorage`** dengan kunci penyimpanan:
> `cbt_sidebar_collapsed` bertipe nilai boolean string (`'true'` atau `'false'`).
> 
> *Alasan Teknis:*
> 1. Memberikan performa render tercepat tanpa *layout shift*.
> 2. Selaras 100% dengan konvensi penamaan kunci penyimpanan yang telah digunakan di proyek ini (`cbt_theme_mode`, `cbt_token`, `cbt_session_token`, `cbt_user`).
> 3. Tidak memerlukan komunikasi jaringan (zero API call).

---

## 4. User Experience (UX)

1. **Optimalisasi Area Kerja (Screen Real Estate):**
   - Halaman Back Office banyak memuat tabel dan panel data yang sangat lebar, seperti:
     - **Live Proctoring:** Menampilkan matriks status ujian banyak siswa secara real-time.
     - **Bank Soal & Butir Soal:** Menampilkan teks soal, rumus matematika KaTeX, dan tabel opsi jawaban.
     - **Laporan Nilai:** Menampilkan rekapitulasi skor dan statistik persentase.
   - Dengan menciutkan sidebar menjadi `w-20`, area pandang tabel/kartu bertambah luas hingga ~176 piksel, meminimalisir scroll horizontal dan membuat tampilan lebih lega.
2. **Kejelasan Navigasi saat Collapsed (Accessibility & Usability):**
   - Saat sidebar dalam posisi tertutup (`collapsed`), label teks disembunyikan.
   - Setiap tombol ikon menu harus dilengkapi dengan atribut `title={item.name}` atau tooltip mini agar pengguna tetap mengetahui nama halaman saat kursor diarahkan (*hover*) ke ikon tersebut.
3. **Indikator Aktif yang Jelas:**
   - Tombol menu aktif tetap memiliki warna latar penanda (Indigo untuk Admin, Cyan untuk Guru) dengan radius rounded yang presisi di sekeliling ikon.
4. **Indikator Profil & Logout yang Ringkas:**
   - Pada mode collapse, avatar inisial (misal: "A" atau "G") tetap tampil di tengah dengan posisi proporsional.
   - Tombol logout berubah menjadi ikon pintu keluar tunggal dengan warna merah lembut saat di-hover.

---

## 5. File Yang Terpengaruh

Sesuai aturan *"Jangan membuat file baru jika tidak diperlukan dan jangan mengubah struktur project tanpa alasan"*, modifikasi dilakukan langsung pada file layout yang sudah ada:

| Kategori | File Path | Jenis Perubahan |
| :--- | :--- | :--- |
| **Layout Admin** | [frontend/src/features/admin/AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) | • Penambahan state `isCollapsed` dengan inisialisasi dari `localStorage`.<br>• Penambahan tombol toggle collapse/expand.<br>• Penyesuaian class Tailwind CSS pada tag `<aside>`, teks judul, menu, profil, dan logout (`w-64` vs `w-20`). |
| **Layout Guru** | [frontend/src/features/teacher/TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx) | • Penambahan state `isCollapsed` dengan inisialisasi dari `localStorage`.<br>• Penambahan tombol toggle collapse/expand dengan palet warna Cyan.<br>• Penyesuaian class Tailwind CSS pada elemen `<aside>` dan anak-anaknya. |
| **Sidebar Component** | *(Tidak Ada)* | Tidak ada file komponen sidebar terpisah; menyatu di dalam layout di atas. |
| **Navbar/Header** | *(Tidak Berubah)* | Mobile Topbar tetap berjalan mandiri (`md:hidden`) tanpa terpengaruh oleh state desktop collapse. |
| **Layout Siswa** | [frontend/src/features/student/StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx) | **TIDAK DISENTUH SAMA SEKALI** (Sesuai instruksi). |
| **Backend & Controller** | *(Tidak Ada)* | Tidak ada controller atau route backend yang diubah. |

---

## 6. Database Impact

* **Apakah ada perubahan database?**
  **TIDAK ADA.** Skema database `sertidemi` tidak mengalami perubahan sama sekali.
* **Alasan Teknis:**
  State buka-tutup (*collapse/expand*) sidebar adalah preferensi visual antarmuka peramban di sisi klien (*Client-Side Presentation State*). Preferensi ini tidak memiliki korelasi dengan integritas data bisnis, data akademik, maupun data pengerjaan ujian. Menggunakan penyimpanan peramban `localStorage` jauh lebih bersih, cepat, dan tidak membebani database MySQL.

---

## 7. Rekomendasi Implementasi Teknis

### 7.1. Pola Pengelolaan State di Komponen Layout
State diinisialisasi secara *lazy* langsung dari `localStorage` agar tidak ada jeda perubahan nilai:

```tsx
// Inisialisasi state sinkron dari LocalStorage
const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
  return localStorage.getItem('cbt_sidebar_collapsed') === 'true';
});

// Handler toggle yang memperbarui state dan localStorage secara bersamaan
const toggleSidebar = () => {
  setIsCollapsed((prev) => {
    const nextState = !prev;
    localStorage.setItem('cbt_sidebar_collapsed', String(nextState));
    return nextState;
  });
};
```

### 7.2. Struktur Kelas Tailwind CSS Dinamis
Tag `<aside>` desktop diperbarui agar merespons state `isCollapsed`:
```tsx
<aside 
  className={`hidden md:flex flex-col glass-panel border-r border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out shrink-0 ${
    isCollapsed ? 'w-20 p-3 items-center' : 'w-64 p-5'
  }`}
>
```

### 7.3. Penempatan Tombol Toggle
Tombol toggle ditempatkan secara ergonomis pada header sidebar desktop:
- Saat `expanded`: Tampil di samping kanan judul aplikasi / logo.
- Saat `collapsed`: Berada di bawah logo di posisi tengah dengan ikon yang berbalik arah (`PanelLeftOpen` atau `ChevronRight`).

### 7.4. Penanganan Komponen di Footer Sidebar saat Collapsed
- **ThemeToggle:** Saat collapsed, komponen tombol tema tetap ditampilkan dalam mode compact atau disesuaikan agar posisinya simetris di tengah.
- **Profil Pengguna:** Saat collapsed, teks nama dan instansi disembunyikan menggunakan utilitas conditional rendering (`{!isCollapsed && (...) }`), menyisakan lingkaran avatar inisial dengan atribut `title={user?.name}`.
- **Tombol Keluar:** Tombol keluar diringkas menjadi ikon `LogOut` tunggal di tengah dengan atribut `title="Keluar"`.

---

## 8. Risiko & Strategi Mitigasi

| Potensi Risiko | Dampak | Strategi Mitigasi |
| :--- | :--- | :--- |
| **1. Layout Shift / Kedipan Render Awal (Flicker)** | Rendah | Menggunakan *lazy state initializer* pada `useState(() => localStorage.getItem(...) === 'true')` sehingga nilai awal sudah bernilai `true` sebelum DOM selesai dilukis pertama kali oleh React. |
| **2. Teks Menu Menumpuk / Meluap (*Text Overflow*) saat Animasi** | Sedang | Membungkus teks label menu dalam kontainer dengan kelas `overflow-hidden whitespace-nowrap` atau menyembunyikan teks seketika saat `isCollapsed === true`. |
| **3. Kebingungan Ikon Menu saat Tertutup** | Sedang | Memberikan atribut HTML `title={item.name}` pada setiap tombol menu saat mode collapse, sehingga ketika mouse melayang di atas ikon, nama menu akan muncul sebagai tooltip bawaan browser. |
| **4. Bentrok dengan Tampilan Mobile** | Rendah | Memastikan seluruh aturan collapse desktop dibatasi oleh breakpoint Tailwind `md:` (misal `hidden md:flex`), sementara menu mobile tetap menggunakan mobile topbar dan drawer yang sudah ada tanpa perubahan. |

---

## 9. Checklist Implementasi Developer

Sebelum kode diubah, berikut adalah tahapan kerja terstruktur yang akan dijalankan:

- [ ] **Tahap 1: Verifikasi & Persiapan**
  - [x] Analisis source code layout saat ini ([AdminLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/admin/AdminLayout.tsx) & [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx)).
  - [x] Pastikan layout siswa ([StudentExamsPage.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/student/StudentExamsPage.tsx)) tidak tersentuh.
- [ ] **Tahap 2: Implementasi pada AdminLayout.tsx**
  - [ ] Tambahkan state `isCollapsed` dengan lazy read dari `localStorage.getItem('cbt_sidebar_collapsed')`.
  - [ ] Tambahkan tombol toggle collapse di header sidebar desktop menggunakan ikon dari `lucide-react`.
  - [ ] Pasang kelas dinamis Tailwind pada `<aside>` (`w-64` vs `w-20` dengan `transition-all duration-300`).
  - [ ] Sesuaikan item menu (`nav`): sembunyikan label teks saat collapsed, pusatkan ikon, dan sematkan atribut `title`.
  - [ ] Sesuaikan footer sidebar: avatar inisial compact, ThemeToggle, dan tombol logout.
- [ ] **Tahap 3: Implementasi pada TeacherLayout.tsx**
  - [ ] Terapkan pola yang identik pada [TeacherLayout.tsx](file:///d:/MAGANG/exam/Sistem-Ujian-Online/frontend/src/features/teacher/TeacherLayout.tsx) dengan menjaga keselarasan warna aksen Cyan (`bg-cyan-600`).
  - [ ] Pastikan kunci `localStorage` yang digunakan sama (`cbt_sidebar_collapsed`) agar jika user berganti peran atau mengakses kedua portal, status preferensi tetap konsisten.
- [ ] **Tahap 4: Pengujian & Validasi (Quality Assurance)**
  - [ ] Uji klik toggle: pastikan animasi collapse dan expand berjalan mulus tanpa lag.
  - [ ] Uji persistensi: tutup sidebar di Dashboard, navigasikan ke halaman Bank Soal, Paket Ujian, Laporan Nilai -> pastikan sidebar tetap tertutup.
  - [ ] Uji refresh peramban: tekan F5 saat sidebar tertutup -> pastikan sidebar tidak terbuka kembali.
  - [ ] Uji responsivitas mobile: periksa tampilan pada viewport `< 768px`, pastikan drawer mobile tetap berfungsi normal.
  - [ ] Uji modul siswa: login sebagai siswa (`verinakris@gmail.com`) dan pastikan layout siswa tidak mengalami perubahan apa pun.

---

*Dokumen analisis ini telah disusun dan disimpan ke [dokumentasi/Sidebar_Feature_Analysis.md](file:///d:/MAGANG/exam/Sistem-Ujian-Online/dokumentasi/Sidebar_Feature_Analysis.md). Tahap pengubahan kode belum dilakukan dan menunggu persetujuan Anda.*
