@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ALPINE FREERIDE v0.18.0 - MULTIPLAYER BUILD - local game server on port 5208
rem Portable Node can live beside the game, or use an existing installation.
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
set "ALPINE_PORTABLE_NODE=%USERPROFILE%\Downloads\node-v24.21.0-win-x64\node-v24.21.0-win-x64"
if exist "%ALPINE_PORTABLE_NODE%\node.exe" set "PATH=%ALPINE_PORTABLE_NODE%;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node 22.12 or newer, or extract its
  echo Windows portable ZIP into this game's node folder so node\node.exe exists.
  echo Then run this file again. See README.md.
  pause
  exit /b 1
)
node scripts\serve-built.mjs --port 5208
if errorlevel 1 pause
