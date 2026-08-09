@echo off
title Kebena MKC Display
rem pushd handles the trailing backslash in %~dp0 (and spaces in the path) safely.
pushd "%~dp0"

if not exist "node_modules\" (
  echo Installing the app. This only happens the first time, please wait...
  echo.
  call npm install
  if errorlevel 1 goto failed
)

echo Starting Kebena MKC Display...
call npm start
if errorlevel 1 goto failed

popd
exit /b 0

:failed
echo.
echo Something went wrong starting the app.
echo Please take a photo of this window and share it.
echo.
pause
popd
exit /b 1
