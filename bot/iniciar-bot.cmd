@echo off
title PetZilla Discord Bot
cd /d "%~dp0"
echo ========================================
echo Iniciando PetZilla Discord Bot
echo Pasta: %cd%
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado no computador.
  echo Instale o Node.js ou confira se ele esta no PATH.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo ERRO: Arquivo .env nao encontrado na pasta do bot.
  echo Copie .env.example para .env e preencha o token do Discord.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencias nao encontradas. Instalando...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo ERRO: Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Node:
node -v
echo.
echo O bot vai ficar aberto nesta janela.
echo Se o Discord estiver instavel, ele tentara reconectar sozinho.
echo.

node index.js
echo.
echo O bot foi encerrado. Veja a mensagem acima para entender o motivo.
pause
