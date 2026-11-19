@echo off
chcp 65001 >nul
title Detik-Detik Tryout - Akses Online HP (Beda WiFi)
cls
echo ===================================================================
echo     DETIK-DETIK TRYOUT - LINK ONLINE HP (BEDA WI-FI / DATA)
echo ===================================================================
echo.
echo [INFO] Link ini adalah opsi tambahan agar HP Anda bisa membuka web
echo        walaupun beda Wi-Fi atau sedang menggunakan paket data seluler.
echo.
echo [PERSIAPAN] Pastikan 2 terminal utama Anda sudah jalan:
echo   1. Backend Laravel (php artisan serve di port 8000)
echo   2. Frontend Vite   (npm run dev di port 5173)
echo.
echo -------------------------------------------------------------------
echo  Pilih metode tunneling yang ingin digunakan:
echo    [1] SSH Tunnel (Rekomendasi Utama - Langsung dapat Link HTTPS)
echo    [2] Localtunnel (Alternatif via npm/npx)
echo -------------------------------------------------------------------
echo.
set /p opt="Masukkan pilihan (1 atau 2, default 1): "

if "%opt%"=="2" goto opt_lt

:opt_ssh
echo.
echo [Memeriksa kunci SSH lokal...]
if not exist "%USERPROFILE%\.ssh\id_ed25519" (
    if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh" >nul 2>&1
    echo [Menyiapkan kunci SSH pertama kali...]
    ssh-keygen -t ed25519 -N "" -f "%USERPROFILE%\.ssh\id_ed25519" >nul 2>&1
)
echo [Menghubungkan ke server SSH Tunnel...]
echo Link URL HTTPS akan muncul di bawah (contoh: https://xxxx.lhr.life)
echo.
ssh -o StrictHostKeyChecking=no -R 80:localhost:5173 nokey@localhost.run
goto finish

:opt_lt
echo.
echo [Menghubungkan via Localtunnel...]
echo Link URL publik akan muncul di bawah (contoh: https://xxxx.loca.lt)
echo Jika di HP muncul halaman konfirmasi IP, masukkan IP publik laptop Anda.
echo.
npx --yes localtunnel --port 5173
goto finish

:finish
echo.
echo Jembatan online ditutup.
pause
