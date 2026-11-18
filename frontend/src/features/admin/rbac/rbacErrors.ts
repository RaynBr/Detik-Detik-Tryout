export function formatRbacError(err: any, fallbackMessage = 'Terjadi kesalahan saat memproses permintaan.'): string {
  const code = err?.response?.data?.code;
  const serverMsg = err?.response?.data?.message;

  switch (code) {
    case 'ANTI_LOCKOUT':
      return serverMsg || 'Perlindungan Anti-Lockout: Anda tidak dapat mencabut hak kelola role dari diri Anda sendiri.';
    case 'PRIVILEGE_ESCALATION_BLOCKED':
      return serverMsg || 'Akses Ditolak (Anti Privilege Escalation): Anda hanya boleh memberikan permission yang Anda miliki sendiri.';
    case 'INVALID_SCOPE':
      return serverMsg || 'Scope Tidak Valid: Permission ber-scope platform tidak dapat diberikan kepada role instansi.';
    case 'SYSTEM_ROLE_PROTECTED':
      return serverMsg || 'Role sistem bawaan dilindungi dan tidak dapat diubah namanya atau dihapus.';
    case 'SUPER_ADMIN_PROTECTED':
      return serverMsg || 'Permission milik role Super Admin tidak boleh dikurangi.';
    case 'MINIMAL_SUPER_ADMIN_REQUIRED':
      return serverMsg || 'Sistem harus memiliki minimal satu Super Admin aktif.';
    case 'ROLE_IN_USE':
      return serverMsg || 'Role ini tidak dapat dihapus karena masih digunakan oleh pengguna aktif. Pindahkan role pengguna terlebih dahulu.';
    case 'RESERVED_ROLE_NAME':
      return serverMsg || 'Nama teknis tersebut termasuk nama sistem yang dilindungi. Gunakan nama lain.';
    case 'ROLE_EXISTS':
      return serverMsg || 'Nama teknis role sudah digunakan pada cakupan ini.';
    case 'INCOMPATIBLE_ROLE_TYPE':
      return serverMsg || 'Role yang dipilih tidak cocok dengan tipe akun pengguna (misalnya akun Guru tidak dapat diberi role Admin/Super Admin).';
    case 'STUDENT_ROLE_RESTRICTED':
      return serverMsg || 'Akun siswa hanya diperbolehkan memiliki role siswa.';
    case 'TENANT_FORBIDDEN':
      return serverMsg || 'Akses ditolak: Pengguna atau role tersebut berada di luar instansi Anda.';
    case 'FORBIDDEN':
      return serverMsg || 'Akses ditolak: Anda tidak memiliki izin untuk tindakan ini.';
    default:
      if (err?.response?.data?.errors) {
        const firstErr = Object.values(err.response.data.errors).flat()[0];
        if (typeof firstErr === 'string') return firstErr;
      }
      return serverMsg || fallbackMessage;
  }
}

