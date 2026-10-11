@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0capture-scribble-transition.ps1' %*"
