import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultRouteForUser } from '../src/shared/utils/rbacNavigation.ts';

test('admin dengan dashboard_sekolah.view diarahkan ke /admin/dashboard', () => {
  const user = { role: 'admin' as const };
  const perms = ['dashboard_sekolah.view', 'jadwal.view'];
  const menus = [
    { id: 1, label: 'Dashboard Sekolah', path: '/admin/dashboard', permission_key: 'dashboard_sekolah.view' },
    { id: 2, label: 'Jadwal Ujian', path: '/admin/exams', permission_key: 'jadwal.view' },
  ];

  assert.equal(getDefaultRouteForUser(user, menus, perms), '/admin/dashboard');
});

test('admin tanpa dashboard_sekolah.view tetapi punya menu lain (Operator Ujian) diarahkan ke menu pertama yang berizin', () => {
  const user = { role: 'admin' as const };
  const perms = ['jadwal.view', 'monitoring.view'];
  const menus = [
    { id: 4, label: 'Jadwal Ujian', path: '/admin/exams', permission_key: 'jadwal.view' },
    { id: 5, label: 'Monitoring Ujian', path: '/admin/proctoring', permission_key: 'monitoring.view' },
  ];

  assert.equal(getDefaultRouteForUser(user, menus, perms), '/admin/exams');
});

test('admin tanpa dashboard_sekolah.view dengan hanya submenu berizin tetap diarahkan ke child path yang berizin', () => {
  const user = { role: 'admin' as const };
  const perms = ['mapel.view'];
  const menus = [
    {
      id: 3,
      label: 'Master Akademik',
      path: '/admin/classes',
      permission_key: 'kelas.view',
      children: [
        { id: 31, label: 'Mata Pelajaran', path: '/admin/master-akademik/mata-pelajaran', permission_key: 'mapel.view' },
      ],
    },
  ];

  assert.equal(
    getDefaultRouteForUser(user, menus, perms),
    '/admin/master-akademik/mata-pelajaran'
  );
});

test('admin tanpa menu yang boleh diakses sama sekali diarahkan ke /unauthorized (tanpa loop ke /admin/dashboard)', () => {
  const user = { role: 'admin' as const };

  // Kasus 1: menus kosong & permissions kosong
  assert.equal(getDefaultRouteForUser(user, [], []), '/unauthorized');

  // Kasus 2: menus hanya berisi item yang tidak dimiliki permission-nya
  const menus = [
    { id: 1, label: 'Dashboard Sekolah', path: '/admin/dashboard', permission_key: 'dashboard_sekolah.view' },
    { id: 2, label: 'Jadwal Ujian', path: '/admin/exams', permission_key: 'jadwal.view' },
  ];
  assert.equal(getDefaultRouteForUser(user, menus, ['profil.other']), '/unauthorized');
});

test('super_admin, guru, dan siswa diarahkan ke dashboard standar masing-masing', () => {
  assert.equal(getDefaultRouteForUser({ role: 'super_admin' }, [], []), '/super-admin/dashboard');
  assert.equal(getDefaultRouteForUser({ role: 'guru' }, [], []), '/teacher/dashboard');
  assert.equal(getDefaultRouteForUser({ role: 'siswa' }, [], []), '/student/dashboard');
  assert.equal(getDefaultRouteForUser(null, [], []), '/login');
});

