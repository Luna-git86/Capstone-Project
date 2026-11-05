@echo off
title Start PostgreSQL RSIA
echo ================================================
echo Menjalankan Layanan PostgreSQL (postgresql-x64-18)
echo ================================================
net start postgresql-x64-18
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUKSES] Database PostgreSQL berhasil dijalankan!
) else (
    echo.
    echo [CATATAN] Jika muncul pesan "Access is denied", klik kanan file ini lalu pilih "Run as administrator".
)
echo.
pause
