@echo off
title Cozy Music Downloader
cd /d "%~dp0"
node_modules\.bin\electron-vite dev
if %errorlevel% neq 0 (
    echo.
    echo Error launching app. Press any key to close.
    pause >nul
)
