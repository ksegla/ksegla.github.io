@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 start-laptop.py
) else (
  python start-laptop.py
)
pause
