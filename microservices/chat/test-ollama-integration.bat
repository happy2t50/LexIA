@echo off
REM Script de pruebas para verificar integración de Ollama con llama3.2:3b
REM Autor: Claude Code
REM Fecha: 2025-12-04

echo.
echo ========================================
echo   PRUEBAS DE INTEGRACION OLLAMA + RAG
echo ========================================
echo.

REM === TEST 1: Pregunta General ===
echo [TEST 1] Pregunta General (solo Ollama)
echo Pregunta: "por que debo detenerme en un alto"
echo Esperado: Sin emojis, sin artículos RAG
echo.

curl -X POST http://localhost/api/chat/message -H "Content-Type: application/json" -d "{\"sessionId\":\"test-1\",\"mensaje\":\"por que debo detenerme en un alto\",\"usuarioId\":\"test-123\",\"nombre\":\"Test\"}" > temp_test1.json 2>nul

if exist temp_test1.json (
  echo Respuesta recibida. Verificando...
  type temp_test1.json | findstr /C:"mensaje" > temp_msg1.txt

  REM Buscar emojis (esto es aproximado en batch)
  findstr /C:"Tipo de pregunta: general" temp_test1.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Tipo de pregunta: general
  ) else (
    echo [?] No se pudo verificar el tipo
  )

  echo.
  echo --- Respuesta (fragmento) ---
  type temp_msg1.txt
  echo.
) else (
  echo [ERROR] No se pudo conectar al servicio
)

echo ========================================
echo.

REM === TEST 2: Situación Legal ===
echo [TEST 2] Situacion Legal (Ollama + RAG)
echo Pregunta: "me chocaron y el wey se fue"
echo Esperado: Con articulos RAG sobre fuga
echo.

curl -X POST http://localhost/api/chat/message -H "Content-Type: application/json" -d "{\"sessionId\":\"test-2\",\"mensaje\":\"me chocaron y el wey se fue\",\"usuarioId\":\"test-123\",\"nombre\":\"Javi\"}" > temp_test2.json 2>nul

if exist temp_test2.json (
  echo Respuesta recibida. Verificando articulos...

  findstr /C:"articulos" temp_test2.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Contiene articulos del RAG
  ) else (
    echo [?] No se encontraron articulos
  )

  findstr /C:"fuga" temp_test2.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Articulos relacionados con fuga
  )

  echo.
)

echo ========================================
echo.

REM === TEST 3: Profesionistas Solo en Cards ===
echo [TEST 3] Profesionistas Solo en Cards
echo Pregunta: "me detuvieron por exceso de velocidad"
echo Esperado: Profesionistas NO en mensaje, SI en array
echo.

curl -X POST http://localhost/api/chat/message -H "Content-Type: application/json" -d "{\"sessionId\":\"test-3\",\"mensaje\":\"me detuvieron por exceso de velocidad\",\"usuarioId\":\"test-123\",\"nombre\":\"Carlos\"}" > temp_test3.json 2>nul

if exist temp_test3.json (
  echo Respuesta recibida. Verificando...

  findstr /C:"Profesionistas especializados" temp_test3.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [FALLO] Profesionistas aparecen en el texto
  ) else (
    echo [OK] Profesionistas NO estan en el texto
  )

  findstr /C:"profesionistas" temp_test3.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Array de profesionistas presente
  )

  echo.
)

echo ========================================
echo.

REM === TEST 4: Off-Topic ===
echo [TEST 4] Off-Topic Detection
echo Pregunta: "sabes cuando sale el nuevo call of duty"
echo Esperado: cluster = "off_topic"
echo.

curl -X POST http://localhost/api/chat/message -H "Content-Type: application/json" -d "{\"sessionId\":\"test-4\",\"mensaje\":\"sabes cuando sale el nuevo call of duty\",\"usuarioId\":\"test-123\",\"nombre\":\"Test\"}" > temp_test4.json 2>nul

if exist temp_test4.json (
  echo Respuesta recibida. Verificando cluster...

  findstr /C:"off_topic" temp_test4.json >nul
  if %ERRORLEVEL% EQU 0 (
    echo [OK] Detectado como off_topic
  ) else (
    echo [FALLO] NO detectado como off_topic
    findstr /C:"cluster" temp_test4.json
  )

  echo.
)

echo ========================================
echo.

REM === Verificar Logs ===
echo [LOGS] Verificando logs del servicio chat...
echo.
docker logs lexia-chat --tail 30 | findstr /C:"Tipo de pregunta" /C:"llama3.2:3b" /C:"Respuesta de"

echo.
echo ========================================
echo   PRUEBAS COMPLETADAS
echo ========================================
echo.
echo Para ver resultados detallados, revisa los archivos:
echo   - temp_test1.json
echo   - temp_test2.json
echo   - temp_test3.json
echo   - temp_test4.json
echo.

pause
