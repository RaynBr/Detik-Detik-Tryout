<?php

namespace App\Services;

use Exception;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class SimpleSpreadsheetService
{
    /**
     * Parse spreadsheet file (.xlsx, .csv, .txt) into an array of rows.
     * Each row is an indexed array of cell string values.
     *
     * @param string $filePath Absolute path to uploaded file
     * @param string|null $originalFilename
     * @return array<int, array<int, string>>
     * @throws Exception
     */
    public function parse(string $filePath, ?string $originalFilename = null): array
    {
        $extension = strtolower(pathinfo($originalFilename ?: $filePath, PATHINFO_EXTENSION));

        if ($extension === 'xlsx') {
            return $this->parseXlsx($filePath);
        }

        return $this->parseCsv($filePath);
    }

    /**
     * Parse CSV / TXT using native fgetcsv with auto-delimiter detection.
     */
    protected function parseCsv(string $filePath): array
    {
        if (!file_exists($filePath) || !is_readable($filePath)) {
            throw new Exception("Berkas CSV tidak dapat dibaca.");
        }

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new Exception("Gagal membuka berkas CSV.");
        }

        // Detect delimiter (comma vs semicolon)
        $firstLine = fgets($handle);
        rewind($handle);

        $delimiter = ',';
        if ($firstLine !== false && substr_count($firstLine, ';') > substr_count($firstLine, ',')) {
            $delimiter = ';';
        }

        $rows = [];
        $isFirst = true;

        while (($data = fgetcsv($handle, 0, $delimiter)) !== false) {
            if ($isFirst) {
                // Strip UTF-8 BOM from first cell if present
                if (isset($data[0])) {
                    $data[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$data[0]);
                }
                $isFirst = false;
            }

            // Skip empty rows
            $hasContent = false;
            foreach ($data as $val) {
                if (trim((string)$val) !== '') {
                    $hasContent = true;
                    break;
                }
            }

            if ($hasContent) {
                $rows[] = array_map(fn($v) => trim((string)$v), $data);
            }
        }

        fclose($handle);
        return $rows;
    }

    /**
     * Parse .xlsx using native PHP ZipArchive and SimpleXML without any external libraries.
     */
    protected function parseXlsx(string $filePath): array
    {
        if (!class_exists('ZipArchive')) {
            // Fallback: If ZipArchive is somehow disabled in PHP environment, throw clear error
            throw new Exception("Ekstensi PHP ZipArchive tidak aktif untuk membaca berkas .xlsx. Silakan gunakan format .csv.");
        }

        $zip = new ZipArchive();
        if ($zip->open($filePath) !== true) {
            throw new Exception("Berkas .xlsx tidak dapat dibuka atau korup.");
        }

        // 1. Read shared strings
        $sharedStrings = [];
        $sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($sharedStringsXml !== false) {
            $xml = @simplexml_load_string($sharedStringsXml);
            if ($xml && isset($xml->si)) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string) $si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string) $r->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        // 2. Read sheet1
        $sheetXmlContent = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXmlContent === false) {
            // Try looking for any sheet
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if (str_starts_with($stat['name'], 'xl/worksheets/sheet') && str_ends_with($stat['name'], '.xml')) {
                    $sheetXmlContent = $zip->getFromIndex($i);
                    break;
                }
            }
        }

        $zip->close();

        if ($sheetXmlContent === false) {
            throw new Exception("Lembar kerja (worksheet) tidak ditemukan di dalam berkas .xlsx.");
        }

        $sheetXml = @simplexml_load_string($sheetXmlContent);
        if (!$sheetXml || !isset($sheetXml->sheetData->row)) {
            return [];
        }

        $rows = [];

        foreach ($sheetXml->sheetData->row as $row) {
            $rowData = [];
            $maxColIndex = 0;

            foreach ($row->c as $c) {
                $cellRef = (string) $c['r']; // e.g. "A1", "B2"
                $colLetters = preg_replace('/[0-9]/', '', $cellRef);
                $colIndex = $this->columnLetterToIndex($colLetters);

                $cellType = (string) $c['t'];
                $val = '';

                if ($cellType === 's') {
                    // Shared string
                    $idx = (int) $c->v;
                    $val = $sharedStrings[$idx] ?? '';
                } elseif ($cellType === 'inlineStr' && isset($c->is->t)) {
                    $val = (string) $c->is->t;
                } elseif (isset($c->v)) {
                    $val = (string) $c->v;
                }

                $rowData[$colIndex] = trim($val);
                if ($colIndex > $maxColIndex) {
                    $maxColIndex = $colIndex;
                }
            }

            // Fill empty gaps up to max column
            $normalizedRow = [];
            for ($i = 0; $i <= $maxColIndex; $i++) {
                $normalizedRow[$i] = $rowData[$i] ?? '';
            }

            // Check if row has any non-empty values
            $hasContent = false;
            foreach ($normalizedRow as $item) {
                if ($item !== '') {
                    $hasContent = true;
                    break;
                }
            }

            if ($hasContent) {
                $rows[] = $normalizedRow;
            }
        }

        return $rows;
    }

    /**
     * Convert Excel column letters (A, B, ..., Z, AA, AB) to 0-based index.
     */
    protected function columnLetterToIndex(string $letters): int
    {
        $letters = strtoupper(trim($letters));
        $len = strlen($letters);
        $index = 0;

        for ($i = 0; $i < $len; $i++) {
            $index = $index * 26 + (ord($letters[$i]) - ord('A') + 1);
        }

        return max(0, $index - 1);
    }

    /**
     * Sanitize cell value to prevent CSV/Excel Formula Injection (CWE-1236)
     */
    public static function sanitizeCell($value): string
    {
        $val = (string) $value;
        if ($val === '') {
            return $val;
        }

        $firstChar = $val[0];
        if (in_array($firstChar, ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'" . $val;
        }

        return $val;
    }

    /**
     * Stream a CSV file download with UTF-8 BOM.
     */
    public function downloadCsv(array $headers, array $sampleRows, string $filename): StreamedResponse
    {
        $responseHeaders = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($headers, $sampleRows) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM for Microsoft Excel compatibility
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            $sanitizedHeaders = array_map([self::class, 'sanitizeCell'], $headers);
            fputcsv($handle, $sanitizedHeaders);

            foreach ($sampleRows as $row) {
                $sanitizedRow = array_map([self::class, 'sanitizeCell'], $row);
                fputcsv($handle, $sanitizedRow);
            }

            fclose($handle);
        };

        return new StreamedResponse($callback, 200, $responseHeaders);
    }

    /**
     * Download Excel (.xlsx) Template with 2 Sheets and consistent styling:
     * Sheet 1: Template Bank Soal (Formatted header, consistent height, background, borders, center-aligned, proportional widths)
     * Sheet 2: Petunjuk Pengisian (Field descriptions, mandatory/optional status, examples)
     */
    public function downloadBankSoalTemplateXlsx(array $headers, array $sampleRows, array $instructions, string $filename = 'template_upload_bank_soal.xlsx'): StreamedResponse
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();

        // ----------------------------------------------------
        // SHEET 1: TEMPLATE BANK SOAL
        // ----------------------------------------------------
        $sheet1 = $spreadsheet->getActiveSheet();
        $sheet1->setTitle('Template Bank Soal');
        $sheet1->setShowGridLines(true);

        // Header Row (Row 1)
        $sheet1->getRowDimension(1)->setRowHeight(28);

        $colCount = count($headers);
        for ($i = 0; $i < $colCount; $i++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i + 1);
            $sheet1->setCellValue("{$colLetter}1", $headers[$i]);
        }

        $lastColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colCount);

        // Header Styling: Uniform Font, Bold, Solid Dark Indigo/Blue Fill, White Text, Center Horizontal, Middle Vertical, Thin Borders
        $headerRange = "A1:{$lastColLetter}1";
        $sheet1->getStyle($headerRange)->applyFromArray([
            'font' => [
                'name' => 'Calibri',
                'size' => 11,
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'], // Dark Slate / Indigo
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => '475569'],
                ],
            ],
        ]);

        // Sample Data Rows
        $currentRow = 2;
        foreach ($sampleRows as $row) {
            $sheet1->getRowDimension($currentRow)->setRowHeight(22);
            for ($colIdx = 0; $colIdx < count($row); $colIdx++) {
                $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx + 1);
                $val = (string) $row[$colIdx];
                $sheet1->setCellValueExplicit("{$colLetter}{$currentRow}", $val, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
            }

            // Row border & alignment
            $rowRange = "A{$currentRow}:{$lastColLetter}{$currentRow}";
            $sheet1->getStyle($rowRange)->applyFromArray([
                'font' => [
                    'name' => 'Calibri',
                    'size' => 10,
                ],
                'alignment' => [
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_HAIR,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
            ]);

            $currentRow++;
        }

        // Proportional column widths
        $columnWidths = [
            1 => 16, // Jenjang
            2 => 18, // Kelas
            3 => 24, // Mata Pelajaran
            4 => 16, // Tahun Ajaran
            5 => 14, // Tahun Soal
            6 => 30, // Judul Paket Soal
            7 => 12, // Nomor Soal
            8 => 45, // Pertanyaan
            9 => 24, // Pilihan A
            10 => 24, // Pilihan B
            11 => 24, // Pilihan C
            12 => 24, // Pilihan D
            13 => 24, // Pilihan E
            14 => 16, // Jawaban Benar
            15 => 35, // Pembahasan
            16 => 18, // Tingkat Kesulitan
            17 => 16, // Status
        ];

        for ($c = 1; $c <= $colCount; $c++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($c);
            $width = $columnWidths[$c] ?? 20;
            $sheet1->getColumnDimension($colLetter)->setWidth($width);
        }

        // Freeze pane on header row
        $sheet1->freezePane('A2');

        // ----------------------------------------------------
        // SHEET 2: PETUNJUK PENGISIAN
        // ----------------------------------------------------
        $sheet2 = $spreadsheet->createSheet();
        $sheet2->setTitle('Petunjuk Pengisian');
        $sheet2->setShowGridLines(true);

        // Title banner
        $sheet2->mergeCells('A1:E1');
        $sheet2->getRowDimension(1)->setRowHeight(32);
        $sheet2->setCellValue('A1', 'PETUNJUK PENGISIAN TEMPLATE UPLOAD BANK SOAL');
        $sheet2->getStyle('A1')->applyFromArray([
            'font' => [
                'name' => 'Calibri',
                'size' => 14,
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4338CA'], // Indigo
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Subtitle note
        $sheet2->mergeCells('A2:E2');
        $sheet2->getRowDimension(2)->setRowHeight(24);
        $sheet2->setCellValue('A2', 'Harap ikuti panduan kolom di bawah ini agar proses validasi Master Akademik dan import berjalan lancar.');
        $sheet2->getStyle('A2')->applyFromArray([
            'font' => [
                'name' => 'Calibri',
                'size' => 10,
                'italic' => true,
                'color' => ['rgb' => '475569'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Instruction Table Headers (Row 4)
        $sheet2->getRowDimension(4)->setRowHeight(26);
        $instrHeaders = ['No', 'Nama Kolom', 'Wajib / Opsional', 'Keterangan & Aturan Validasi', 'Contoh Pengisian'];
        for ($i = 0; $i < count($instrHeaders); $i++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i + 1);
            $sheet2->setCellValue("{$colLetter}4", $instrHeaders[$i]);
        }

        $sheet2->getStyle('A4:E4')->applyFromArray([
            'font' => [
                'name' => 'Calibri',
                'size' => 11,
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1E293B'],
            ],
            'alignment' => [
                'horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER,
                'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                    'color' => ['rgb' => '475569'],
                ],
            ],
        ]);

        $iRow = 5;
        foreach ($instructions as $instr) {
            $sheet2->getRowDimension($iRow)->setRowHeight(24);
            $sheet2->setCellValue("A{$iRow}", $instr['no']);
            $sheet2->setCellValue("B{$iRow}", $instr['kolom']);
            $sheet2->setCellValue("C{$iRow}", $instr['status']);
            $sheet2->setCellValue("D{$iRow}", $instr['keterangan']);
            $sheet2->setCellValue("E{$iRow}", $instr['contoh']);

            $isWajib = str_contains(strtolower($instr['status']), 'wajib');
            $sheet2->getStyle("A{$iRow}:E{$iRow}")->applyFromArray([
                'font' => ['name' => 'Calibri', 'size' => 10],
                'alignment' => ['vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => \PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
            ]);

            // Center align No and Status
            $sheet2->getStyle("A{$iRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("C{$iRow}")->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
            $sheet2->getStyle("C{$iRow}")->getFont()->setBold($isWajib);
            if ($isWajib) {
                $sheet2->getStyle("C{$iRow}")->getFont()->getColor()->setRGB('B91C1C'); // Red
            }

            $iRow++;
        }

        $sheet2->getColumnDimension('A')->setWidth(8);
        $sheet2->getColumnDimension('B')->setWidth(24);
        $sheet2->getColumnDimension('C')->setWidth(18);
        $sheet2->getColumnDimension('D')->setWidth(55);
        $sheet2->getColumnDimension('E')->setWidth(30);

        // Select Sheet 1 by default
        $spreadsheet->setActiveSheetIndex(0);

        $responseHeaders = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'max-age=0',
        ];

        $callback = function () use ($spreadsheet) {
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
        };

        return new StreamedResponse($callback, 200, $responseHeaders);
    }
}
