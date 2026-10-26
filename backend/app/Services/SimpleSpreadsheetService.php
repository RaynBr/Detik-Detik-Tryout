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

            fputcsv($handle, $headers);

            foreach ($sampleRows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        };

        return new StreamedResponse($callback, 200, $responseHeaders);
    }
}
