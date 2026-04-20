@echo off
:: Garante que o script execute na pasta onde o arquivo .bat está salvo
cd /d "%~dp0"

:: Verifica se tem permissão de administrador
net session >nul 2>&1
if %errorLevel% == 0 (
    powershell -ExecutionPolicy Bypass -File ".\server.ps1"
) else (
    echo Solicitando permissoes de administrador...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
pause