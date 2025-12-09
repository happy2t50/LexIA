@echo off
echo ========================================
echo FINE-TUNING DE MODELO LEGAL LEXIA
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Verificando que Ollama este corriendo...
ollama list >nul 2>&1
if errorlevel 1 (
    echo ERROR: Ollama no esta corriendo. Inicia Ollama primero.
    pause
    exit /b 1
)
echo OK - Ollama esta corriendo
echo.

echo [2/4] Creando modelo base personalizado...
ollama create lexia-legal-1b -f Modelfile
if errorlevel 1 (
    echo ERROR: No se pudo crear el modelo base
    pause
    exit /b 1
)
echo OK - Modelo base creado
echo.

echo [3/4] Ejecutando fine-tuning con dataset...
echo NOTA: Esto puede tardar 30-60 minutos dependiendo del hardware
echo.
ollama run lexia-legal-1b --train dataset-dialogos-legales.jsonl --epochs 3 --batch-size 4
if errorlevel 1 (
    echo ERROR: Fine-tuning fallo
    pause
    exit /b 1
)
echo OK - Fine-tuning completado
echo.

echo [4/4] Probando el modelo...
echo.
echo Escribe casos de prueba para verificar el modelo:
echo - "me detuvieron"
echo - "tuve un accidente"
echo - "me chocaron y el wey se fue"
echo.
ollama run lexia-legal-1b

echo.
echo ========================================
echo FINE-TUNING COMPLETADO EXITOSAMENTE
echo ========================================
echo.
echo Modelo: lexia-legal-1b
echo Para usar en la app, actualiza OLLAMA_MODEL=lexia-legal-1b
echo.
pause
