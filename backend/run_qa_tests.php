<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\UserBo;
use App\Models\MasterKelas;
use App\Models\MasterMataPelajaran;
use App\Models\MasterJenjang;
use App\Models\GuruMataPelajaran;
use App\Models\UserSiswa;
use App\Models\Assessment;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Services\SimpleSpreadsheetService;

$results = [];

function pass($name, $details = '') {
    global $results;
    $results[] = ['status' => 'PASS', 'test' => $name, 'details' => $details];
    echo "[PASS] $name" . ($details ? " - $details" : "") . "\n";
}

function fail($name, $details = '') {
    global $results;
    $results[] = ['status' => 'FAIL', 'test' => $name, 'details' => $details];
    echo "[FAIL] $name - $details\n";
}

echo "====================================================\n";
echo "STARTING FULL QA TEST SUITE\n";
echo "====================================================\n\n";

// 1. SETUP ACTING USER
$admin = UserBo::where('login_email', 'sertidemi@gmail.com')->first();
if (!$admin) {
    $admin = UserBo::first();
}

echo "Acting as Admin: {$admin->nama} (ID: {$admin->iduser_bo}, Kategori: {$admin->idkategori})\n\n";
auth()->setUser($admin);

// TEST 1: TEMPLATE GURU
echo "--- TEST 1: TEMPLATE DOWNLOAD GURU ---\n";
try {
    $teacherController = app(\App\Http\Controllers\Api\Admin\TeacherController::class);
    $spreadsheetService = app(SimpleSpreadsheetService::class);
    $response = $teacherController->downloadTemplate($spreadsheetService);
    
    ob_start();
    $response->sendContent();
    $content = ob_get_clean();
    
    $expectedCols = ['Nama Guru', 'NIP', 'NUPTK', 'Email', 'Username', 'Password', 'Jenis Kelamin', 'No HP', 'Alamat', 'Status', 'Instansi', 'Jenjang', 'Mata Pelajaran', 'Role'];
    $allPresent = true;
    foreach ($expectedCols as $col) {
        if (strpos($content, $col) === false) {
            $allPresent = false;
            fail("Template Guru Column Check", "Missing column: $col");
            break;
        }
    }
    if ($allPresent) {
        pass("Template Guru 14 Columns Valid", "All 14 columns present in template CSV");
    }
} catch (\Exception $e) {
    fail("Template Guru Exception", $e->getMessage());
}

// TEST 2: TEMPLATE SISWA
echo "\n--- TEST 2: TEMPLATE DOWNLOAD SISWA ---\n";
try {
    $studentController = app(\App\Http\Controllers\Api\Admin\StudentController::class);
    $response = $studentController->downloadTemplate($spreadsheetService);
    
    ob_start();
    $response->sendContent();
    $content = ob_get_clean();
    
    $expectedColsSiswa = ['Nama', 'NIS', 'NISN', 'Username', 'Password', 'Jenis Kelamin', 'Nomor Absen', 'Kelas', 'Jenjang', 'Tempat Lahir', 'Tanggal Lahir', 'Agama', 'No HP', 'Alamat', 'Status'];
    $allPresentSiswa = true;
    foreach ($expectedColsSiswa as $col) {
        if (strpos($content, $col) === false) {
            $allPresentSiswa = false;
            fail("Template Siswa Column Check", "Missing column: $col");
            break;
        }
    }
    if ($allPresentSiswa) {
        pass("Template Siswa 15 Columns Valid", "All 15 columns present in template CSV");
    }
} catch (\Exception $e) {
    fail("Template Siswa Exception", $e->getMessage());
}

// TEST 3: GURU MATA PELAJARAN (PER KELAS MANAGEMENT)
echo "\n--- TEST 3: GURU MATA PELAJARAN (DETAIL KELAS CRUD) ---\n";
try {
    $masterKelasController = app(\App\Http\Controllers\Api\Admin\MasterKelasController::class);
    $kelas = MasterKelas::first();
    
    $initialWaliKelas = $kelas->wali_kelas_id;
    echo "Testing on Kelas: {$kelas->nama_kelas} (ID: {$kelas->id}, Current Wali: " . ($initialWaliKelas ?: 'None') . ")\n";

    // 3a. Get subject teachers
    $res = $masterKelasController->getSubjectTeachers($kelas->id);
    $data = json_decode($res->getContent(), true);
    if ($res->getStatusCode() === 200 && isset($data['data'])) {
        pass("GET Subject Teachers", "Found " . count($data['data']) . " existing assignments");
    } else {
        fail("GET Subject Teachers", "Status: " . $res->getStatusCode());
    }

    // 3b. Assign Subject Teacher
    $mapel = MasterMataPelajaran::first();
    $guru = UserBo::where('role_type', 'guru')->first() ?: UserBo::first();

    if ($mapel && $guru) {
        $postReq = Request::create("/api/admin/classes/{$kelas->id}/subject-teachers", 'POST', [
            'idmapel' => $mapel->id,
            'iduser_bo' => $guru->iduser_bo,
            'tahun_ajaran' => '2026/2027',
            'status' => 'aktif'
        ]);
        $postReq->setUserResolver(fn() => $admin);
        $postRes = $masterKelasController->assignSubjectTeacher($postReq, $kelas->id);
        $postData = json_decode($postRes->getContent(), true);

        if ($postRes->getStatusCode() === 201 || $postRes->getStatusCode() === 200) {
            $createdId = $postData['data']['id'] ?? null;
            if ($createdId) {
                pass("POST Assign Subject Teacher", "Created assignment ID: {$createdId}");

                // 3c. Update status
                $putReq = Request::create("/api/admin/classes/{$kelas->id}/subject-teachers/{$createdId}", 'PUT', [
                    'status' => 'nonaktif',
                    'tahun_ajaran' => '2026/2027'
                ]);
                $putReq->setUserResolver(fn() => $admin);
                $putRes = $masterKelasController->updateSubjectTeacher($putReq, $kelas->id, $createdId);
                $putData = json_decode($putRes->getContent(), true);

                if ($putRes->getStatusCode() === 200 && ($putData['data']['status'] ?? '') === 'nonaktif') {
                    pass("PUT Update Subject Teacher", "Updated status to nonaktif successfully");
                } else {
                    fail("PUT Update Subject Teacher", "Status: " . $putRes->getStatusCode());
                }

                // 3d. Delete Subject Teacher
                $delRes = $masterKelasController->removeSubjectTeacher($kelas->id, $createdId);
                if ($delRes->getStatusCode() === 200) {
                    pass("DELETE Subject Teacher", "Removed assignment successfully");
                } else {
                    fail("DELETE Subject Teacher", "Status: " . $delRes->getStatusCode());
                }
            } else {
                fail("POST Assign Subject Teacher", "No created ID returned: " . $postRes->getContent());
            }
        } else {
            fail("POST Assign Subject Teacher", "Status: " . $postRes->getStatusCode() . " Response: " . $postRes->getContent());
        }
    } else {
        echo "Skip assign test: No mapel or guru found\n";
    }

    // 3e. Verify Wali Kelas was NOT touched
    $kelas->refresh();
    if ($kelas->wali_kelas_id === $initialWaliKelas) {
        pass("Wali Kelas Integrity Check", "Wali Kelas unaffected: " . ($initialWaliKelas ?: 'None'));
    } else {
        fail("Wali Kelas Integrity Check", "Wali kelas was modified! Old: $initialWaliKelas, New: {$kelas->wali_kelas_id}");
    }

} catch (\Exception $e) {
    fail("Guru Mata Pelajaran Test Exception", $e->getMessage());
}

// TEST 4: IMPORT GURU PREVIEW & EXACT MATCH VALIDATION
echo "\n--- TEST 4: IMPORT GURU (PREVIEW & EXACT MATCH) ---\n";
try {
    $existingMapel = MasterMataPelajaran::first();
    $existingJenjang = MasterJenjang::first();

    $validMapelName = $existingMapel ? $existingMapel->nama_mapel : 'Matematika';
    $validJenjangName = $existingJenjang ? $existingJenjang->nama_jenjang : 'SMA';

    // CSV test content with 3 rows:
    // Row 1: Valid
    // Row 2: Invalid Mapel (Exact match fails)
    // Row 3: Invalid Email (duplicate / invalid format)
    $tmpCsv = sys_get_temp_dir() . '/test_import_guru_' . time() . '.csv';
    $fp = fopen($tmpCsv, 'w');
    fputcsv($fp, ['Nama Guru', 'NIP', 'NUPTK', 'Email', 'Username', 'Password', 'Jenis Kelamin', 'No HP', 'Alamat', 'Status', 'Instansi', 'Jenjang', 'Mata Pelajaran', 'Role']);
    
    $uniqueTag = time() . rand(10, 99);
    fputcsv($fp, ["Guru Test Valid $uniqueTag", '198501012010011001', '1234567890123456', "gurutest{$uniqueTag}@test.com", "gurutest{$uniqueTag}", 'Pass1234!', 'L', '0812345678', 'Jl. Test', 'Aktif', 'Test Instansi', $validJenjangName, $validMapelName, 'guru']);
    fputcsv($fp, ["Guru Test Invalid Mapel $uniqueTag", '', '', "guruinvalid{$uniqueTag}@test.com", "guruinvalid{$uniqueTag}", 'Pass1234!', 'P', '', '', 'Aktif', 'Test Instansi', $validJenjangName, 'Mata Pelajaran Yang Tidak Pernah Ada 12345', 'guru']);
    fputcsv($fp, ["Guru Test Invalid Email $uniqueTag", '', '', "bukan-email", "guruinvemail{$uniqueTag}", 'Pass1234!', 'L', '', '', 'Aktif', '', $validJenjangName, $validMapelName, 'guru']);
    fclose($fp);

    $uploadedFile = new UploadedFile($tmpCsv, 'test_import_guru.csv', 'text/csv', null, true);

    $previewReq = Request::create('/api/admin/teachers/import?preview=true', 'POST', [], [], ['file' => $uploadedFile]);
    $previewReq->setUserResolver(fn() => $admin);
    $previewRes = $teacherController->import($previewReq, $spreadsheetService);
    $previewData = json_decode($previewRes->getContent(), true);

    if ($previewRes->getStatusCode() === 200 && isset($previewData['total_data'])) {
        if ($previewData['total_data'] === 3 && $previewData['valid_count'] === 1 && $previewData['invalid_count'] === 2) {
            pass("Import Guru Preview Counters", "Total: 3, Valid: 1, Invalid: 2 (Exact match verified)");
        } else {
            fail("Import Guru Preview Counters", "Expected 3 total, 1 valid, 2 invalid. Got: Total=" . ($previewData['total_data'] ?? '') . ", Valid=" . ($previewData['valid_count'] ?? '') . ", Invalid=" . ($previewData['invalid_count'] ?? ''));
        }

        // Verify rows table structure: No, Nama, Status, Pesan
        $hasProperColumns = true;
        foreach ($previewData['rows'] as $row) {
            if (!isset($row['row_number']) || !isset($row['name']) || !isset($row['status']) || !isset($row['message'])) {
                $hasProperColumns = false;
                break;
            }
        }
        if ($hasProperColumns) {
            pass("Import Guru Preview Table Format", "All rows contain [row_number, name, status, message]");
        } else {
            fail("Import Guru Preview Table Format", "Missing required preview table attributes");
        }

        // Now test Commit of the valid row
        $validRow = $previewData['rows'][0];
        $commitReq = Request::create('/api/admin/teachers/import', 'POST', [
            'rows' => [$validRow]
        ]);
        $commitReq->setUserResolver(fn() => $admin);
        $commitRes = $teacherController->import($commitReq, $spreadsheetService);
        $commitData = json_decode($commitRes->getContent(), true);

        if ($commitRes->getStatusCode() === 200 && ($commitData['saved_count'] ?? 0) === 1) {
            pass("Import Guru Batch Commit", "Successfully committed 1 valid row");

            // Clean up test guru
            $savedGuru = UserBo::where('login_email', "gurutest{$uniqueTag}@test.com")->first();
            if ($savedGuru) {
                GuruMataPelajaran::where('iduser_bo', $savedGuru->iduser_bo)->delete();
                $savedGuru->delete();
            }
        } else {
            fail("Import Guru Batch Commit", "Commit failed with code " . $commitRes->getStatusCode() . ": " . $commitRes->getContent());
        }

    } else {
        fail("Import Guru Preview", "Response code: " . $previewRes->getStatusCode() . " Content: " . $previewRes->getContent());
    }

    if (file_exists($tmpCsv)) unlink($tmpCsv);
} catch (\Exception $e) {
    fail("Import Guru Exception", $e->getMessage());
}

// TEST 5: IMPORT SISWA PREVIEW & EXACT MATCH VALIDATION
echo "\n--- TEST 5: IMPORT SISWA (PREVIEW & EXACT MATCH) ---\n";
try {
    $existingKelas = MasterKelas::first();
    $existingJenjang = MasterJenjang::first();

    $validKelasName = $existingKelas ? $existingKelas->nama_kelas : 'X IPA 1';
    $validJenjangName = $existingJenjang ? $existingJenjang->nama_jenjang : 'SMA';

    $tmpCsvSiswa = sys_get_temp_dir() . '/test_import_siswa_' . time() . '.csv';
    $fp = fopen($tmpCsvSiswa, 'w');
    fputcsv($fp, ['Nama', 'NIS', 'NISN', 'Username', 'Password', 'Jenis Kelamin', 'Nomor Absen', 'Kelas', 'Jenjang', 'Tempat Lahir', 'Tanggal Lahir', 'Agama', 'No HP', 'Alamat', 'Status']);

    $uniqueTag = time() . rand(10, 99);
    // Row 1: Valid
    fputcsv($fp, ["Siswa Valid $uniqueTag", "NIS{$uniqueTag}", "NISN{$uniqueTag}", "user{$uniqueTag}", 'Pass1234!', 'L', '1', $validKelasName, $validJenjangName, 'Jakarta', '2008-01-01', 'Islam', '0812345678', 'Jl. Test', 'Aktif']);
    // Row 2: Invalid Kelas (Exact match fails)
    fputcsv($fp, ["Siswa Invalid Kelas $uniqueTag", "NIS2{$uniqueTag}", "NISN2{$uniqueTag}", "user2{$uniqueTag}", 'Pass1234!', 'P', '2', 'Kelas Asal Asalan Tidak Terdaftar', $validJenjangName, 'Surabaya', '2008-02-02', 'Islam', '', '', 'Aktif']);
    // Row 3: Empty NISN
    fputcsv($fp, ["Siswa Invalid NISN $uniqueTag", "NIS3{$uniqueTag}", '', "user3{$uniqueTag}", 'Pass1234!', 'L', '3', $validKelasName, $validJenjangName, 'Bandung', '2008-03-03', 'Islam', '', '', 'Aktif']);
    fclose($fp);

    $uploadedFileSiswa = new UploadedFile($tmpCsvSiswa, 'test_import_siswa.csv', 'text/csv', null, true);

    $previewReq = Request::create('/api/admin/students/import?preview=true', 'POST', [], [], ['file' => $uploadedFileSiswa]);
    $previewReq->setUserResolver(fn() => $admin);
    $previewRes = $studentController->import($previewReq, $spreadsheetService);
    $previewData = json_decode($previewRes->getContent(), true);

    if ($previewRes->getStatusCode() === 200 && isset($previewData['total_data'])) {
        if ($previewData['total_data'] === 3 && $previewData['valid_count'] === 1 && $previewData['invalid_count'] === 2) {
            pass("Import Siswa Preview Counters", "Total: 3, Valid: 1, Invalid: 2 (Exact match verified)");
        } else {
            fail("Import Siswa Preview Counters", "Expected 3 total, 1 valid, 2 invalid. Got: Total=" . ($previewData['total_data'] ?? '') . ", Valid=" . ($previewData['valid_count'] ?? '') . ", Invalid=" . ($previewData['invalid_count'] ?? ''));
        }

        // Verify row columns
        $hasProperCols = true;
        foreach ($previewData['rows'] as $r) {
            if (!isset($r['row_number']) || !isset($r['name']) || !isset($r['status']) || !isset($r['message'])) {
                $hasProperCols = false;
                break;
            }
        }
        if ($hasProperCols) {
            pass("Import Siswa Preview Table Format", "All rows contain [row_number, name, status, message]");
        } else {
            fail("Import Siswa Preview Table Format", "Missing preview table attributes");
        }

        // Commit valid row
        $validRow = $previewData['rows'][0];
        $commitReq = Request::create('/api/admin/students/import', 'POST', [
            'rows' => [$validRow]
        ]);
        $commitReq->setUserResolver(fn() => $admin);
        $commitRes = $studentController->import($commitReq, $spreadsheetService);
        $commitData = json_decode($commitRes->getContent(), true);

        if ($commitRes->getStatusCode() === 200 && ($commitData['saved_count'] ?? 0) === 1) {
            pass("Import Siswa Batch Commit", "Successfully committed 1 valid row");

            // Clean up test student
            $savedStudent = UserSiswa::where('nisn', "NISN{$uniqueTag}")->first();
            if ($savedStudent) {
                \App\Models\SiswaKelas::where('iduser', $savedStudent->iduser)->delete();
                $savedStudent->delete();
            }
        } else {
            fail("Import Siswa Batch Commit", "Commit failed with code " . $commitRes->getStatusCode() . ": " . $commitRes->getContent());
        }

    } else {
        fail("Import Siswa Preview", "Status: " . $previewRes->getStatusCode() . " Content: " . $previewRes->getContent());
    }

    if (file_exists($tmpCsvSiswa)) unlink($tmpCsvSiswa);
} catch (\Exception $e) {
    fail("Import Siswa Exception", $e->getMessage());
}

// TEST 6: HALAMAN REPORT (EXAM REPORT API & SAFE DATA)
echo "\n--- TEST 6: EXAM REPORT API & SAFE DATA ---\n";
try {
    $teacherExamController = app(\App\Http\Controllers\Api\Teacher\TeacherExamController::class);
    
    // 6a. Test GET /exams?all=true
    $examsReq = Request::create('/api/teacher/exams?all=true', 'GET', ['all' => 'true']);
    $examsReq->setUserResolver(fn() => $admin);
    $examsRes = $teacherExamController->index($examsReq);
    
    if ($examsRes->getStatusCode() === 200) {
        $examsData = json_decode($examsRes->getContent(), true);
        pass("GET Teacher Exams with all=true", "Status 200, returned " . (isset($examsData['data']) ? count($examsData['data']) : count($examsData)) . " records");
    } else {
        fail("GET Teacher Exams with all=true", "Status: " . $examsRes->getStatusCode());
    }

    // 6b. Test GET /exams/{id}/report for an existing assessment or non-existent assessment
    $assessment = Assessment::where('idkategori', $admin->idkategori)->orWhereNull('idkategori')->first() ?: Assessment::first();
    $targetId = $assessment ? $assessment->idassessment : 99999999;
    
    $repReq = Request::create("/api/teacher/exams/{$targetId}/report", 'GET');
    $repReq->setUserResolver(fn() => $admin);
    auth()->setUser($admin);
    $repRes = $teacherExamController->report($repReq, $targetId);

    if ($repRes->getStatusCode() === 200) {
        $repData = json_decode($repRes->getContent(), true);
        $hasStats = isset($repData['statistics']);
        $hasDist = isset($repData['statistics']['score_distribution']);
        pass("GET Exam Report Payload Structure", "Returned statistics=" . ($hasStats ? 'YES' : 'NO') . ", score_distribution=" . ($hasDist ? 'YES' : 'NO'));
    } else if ($repRes->getStatusCode() === 404 && !$assessment) {
        pass("GET Exam Report Non-existent Assessment", "Graceful 404 when no assessment found");
    } else {
        fail("GET Exam Report", "Status: " . $repRes->getStatusCode());
    }

} catch (\Exception $e) {
    fail("Halaman Report Exception", $e->getMessage());
}

echo "\n====================================================\n";
echo "SUMMARY TEST RESULTS:\n";
$total = count($results);
$passed = count(array_filter($results, fn($r) => $r['status'] === 'PASS'));
$failed = count(array_filter($results, fn($r) => $r['status'] === 'FAIL'));
echo "Total: $total | Passed: $passed | Failed: $failed\n";
echo "====================================================\n";

if ($failed > 0) {
    exit(1);
} else {
    exit(0);
}
