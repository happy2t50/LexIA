# 🧪 Cómo Probar el Sistema de Preferencias de Profesionistas

**Fecha:** 2025-12-05
**Objetivo:** Verificar que el sistema OLAP registra preferencias de usuarios y filtra profesionistas rechazados

---

## 📋 Resumen del Sistema

El sistema de preferencias permite:
- **Registrar "Me interesa"** cuando el usuario hace match con un profesionista
- **Registrar "No me interesa"** cuando el usuario rechaza (X) un profesionista
- **Filtrar profesionistas rechazados** de futuras recomendaciones para ese usuario

---

## 🔧 Flujo de Datos

```
Usuario hace click en X/Match
    ↓
Frontend (Flutter) → POST /api/chat/profesionista/preferencia
    ↓
Backend (Chat Service) → OLAPIntegrationService.registrarPreferenciaProfesionista()
    ↓
OLAP Cube Service → Almacena preferencia en base de datos
    ↓
Próxima consulta del usuario → SmartResponseService.getTopProfesionistas()
    ↓
Se filtran profesionistas rechazados usando obtenerProfesionistasRechazados()
```

---

## ✅ TEST 1: Registrar "No me interesa"

### Pasos:

1. **Iniciar la app Flutter y hacer login**

2. **Hacer una pregunta que active recomendaciones de profesionistas:**
   ```
   "me chocaron y el wey se fue"
   ```

3. **Verificar que aparecen cards de profesionistas:**
   - Deben aparecer mínimo 2-3 profesionistas
   - Cada card debe tener botón X (rojo) y ❤️ (verde)

4. **Click en la X (No me interesa) de Carlos**

5. **Verificar el feedback:**
   - Debe aparecer SnackBar verde con mensaje:
     ```
     "Entendido, no te mostraremos a Carlos en el futuro"
     ```

6. **Verificar logs del backend:**
   ```bash
   docker logs lexia-chat --tail 50 | grep "Preferencia"
   ```

   **Logs esperados:**
   ```
   👎 OLAP: Preferencia registrada - Carlos (no_interesa) para usuario 12345678
   ```

7. **Hacer una nueva pregunta del mismo tipo:**
   ```
   "me detuvieron por exceso de velocidad"
   ```

8. **Verificar que Carlos NO aparece en las recomendaciones**
   - Deben aparecer otros profesionistas (María, Juan, etc.)
   - Carlos debe estar filtrado

---

## ✅ TEST 2: Registrar "Me interesa"

### Pasos:

1. **Hacer una pregunta:**
   ```
   "atropellé a una persona"
   ```

2. **Click en el botón ❤️ (Hacer Match) de María**

3. **Verificar logs del backend:**
   ```bash
   docker logs lexia-chat --tail 50 | grep "Preferencia"
   ```

   **Logs esperados:**
   ```
   👍 Preferencia registrada: María (me_interesa)
   👍 OLAP: Preferencia registrada - María (me_interesa) para usuario 12345678
   ```

4. **Verificar que se inicia el chat privado con María**

---

## ✅ TEST 3: Múltiples Rechazos

### Pasos:

1. **Hacer una pregunta:**
   ```
   "me pasé un semáforo en rojo"
   ```

2. **Rechazar (X) a los primeros 3 profesionistas:**
   - Carlos → X
   - María → X
   - Juan → X

3. **Hacer otra pregunta similar:**
   ```
   "me multaron por no llevar licencia"
   ```

4. **Verificar que los 3 profesionistas rechazados NO aparecen**
   - Deben aparecer otros profesionistas diferentes

5. **Verificar logs del filtrado:**
   ```bash
   docker logs lexia-chat --tail 100 | grep "Filtrando"
   ```

   **Logs esperados:**
   ```
   🚫 Filtrando 3 profesionistas rechazados para usuario 12345678
   ```

---

## ✅ TEST 4: Verificar Endpoint Directamente

### Prueba Manual con curl:

```bash
curl -X POST http://localhost/api/chat/profesionista/preferencia \
  -H "Content-Type: application/json" \
  -d '{
    "usuarioId": "test-user-123",
    "profesionistaId": "prof-carlos-001",
    "profesionistaNombre": "Carlos Pérez",
    "tipoInteraccion": "no_interesa",
    "cluster": "accidente"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Preferencia registrada",
  "tipoInteraccion": "no_interesa"
}
```

---

## 📊 Verificar Logs en Tiempo Real

Mientras pruebas en la app, ejecuta en otra terminal:

```bash
# Backend Chat Service
docker logs -f lexia-chat | grep -E "👍|👎|🚫|Preferencia"

# OLAP Service (si está disponible)
docker logs -f olap-cube | grep "preferencia"
```

**Logs que debes ver:**

1. **Al rechazar profesionista:**
   ```
   👎 Preferencia registrada: Carlos (no_interesa)
   👎 OLAP: Preferencia registrada - Carlos (no_interesa) para usuario 12345678
   ```

2. **Al hacer match:**
   ```
   👍 Preferencia registrada: María (me_interesa)
   👍 OLAP: Preferencia registrada - María (me_interesa) para usuario 12345678
   ```

3. **Al filtrar en próximas recomendaciones:**
   ```
   🚫 Filtrando 2 profesionistas rechazados para usuario 12345678
   ```

---

## ❌ Errores Comunes

### Error 1: "No hay userId para registrar preferencia"

**Síntoma:** Logs muestran:
```
🔴 HomeNotifier - No hay userId para registrar preferencia
```

**Causa:** Usuario no autenticado o sesión expirada

**Solución:** Cerrar sesión y volver a hacer login

---

### Error 2: Preferencia no se registra (OLAP falla)

**Síntoma:** Logs muestran:
```
⚠️ OLAP preferencia falló (no crítico): Request failed with status code 400
```

**Causa:** OLAP service no está configurado o tiene un endpoint incorrecto

**Solución:**
1. Verificar que el servicio OLAP esté corriendo:
   ```bash
   docker ps | grep olap
   ```
2. Verificar variable de entorno en `docker-compose.yml`:
   ```yaml
   OLAP_SERVICE_URL: http://olap-cube:3001
   ```

---

### Error 3: Carlos sigue apareciendo después de rechazarlo

**Síntoma:** Profesionista rechazado aún aparece en recomendaciones

**Causas posibles:**
1. **No se llamó al endpoint** - Verificar logs del frontend:
   ```
   🚀 POST: http://localhost/api/chat/profesionista/preferencia
   ```
2. **Backend no filtró** - Verificar que aparece el log:
   ```
   🚫 Filtrando X profesionistas rechazados
   ```
3. **Cache local** - Limpiar sesión y hacer nueva pregunta

**Solución:** Rebuild del servicio chat:
```bash
docker-compose build chat
docker-compose up -d chat
```

---

### Error 4: "Don't use BuildContext across async gaps"

**Síntoma:** Warnings en Flutter console

**Causa:** Es solo una advertencia de linting, no afecta funcionalidad

**Solución:** (Opcional) Agregar `if (context.mounted)` antes de usar context después de `await`

---

## 🎯 Casos de Prueba Completos

### Caso 1: Usuario Nuevo - Primera Vez

```
1. Usuario hace login por primera vez
2. Pregunta: "me chocaron"
3. Aparecen: Carlos, María, Juan
4. Usuario rechaza a Carlos (X)
5. ✅ Carlos no debe aparecer en futuras consultas
```

### Caso 2: Usuario Recurrente - Múltiples Rechazos

```
1. Usuario con historial existente
2. Ya rechazó anteriormente a: Carlos, Pedro
3. Nueva pregunta: "me multaron"
4. ✅ NO deben aparecer Carlos ni Pedro
5. ✅ Deben aparecer: María, Juan, Ana
```

### Caso 3: Mix de Preferencias

```
1. Usuario pregunta: "atropellé a alguien"
2. Hace match (❤️) con María
3. Rechaza (X) a Carlos y Juan
4. Nueva pregunta: "me detuvieron por alcohol"
5. ✅ NO aparecen Carlos ni Juan
6. ✅ María puede aparecer (solo se filtra "no_interesa")
```

---

## 📝 Checklist de Verificación

Marca cada item después de probarlo:

- [ ] **TEST 1:** Rechazar profesionista y verificar logs ✓
- [ ] **TEST 2:** Hacer match con profesionista ✓
- [ ] **TEST 3:** Rechazar múltiples profesionistas ✓
- [ ] **TEST 4:** Verificar endpoint con curl ✓
- [ ] **LOGS:** Se ve `👎 OLAP: Preferencia registrada` ✓
- [ ] **LOGS:** Se ve `🚫 Filtrando X profesionistas rechazados` ✓
- [ ] **FILTRADO:** Profesionistas rechazados NO aparecen en futuras consultas ✓

---

## 🔍 Archivos Modificados

### Backend:

1. **[OLAPIntegrationService.ts](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\microservices\chat\src\services\OLAPIntegrationService.ts)**
   - Líneas 266-309: Métodos para registrar y obtener preferencias

2. **[SmartResponseService.ts](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\microservices\chat\src\services\SmartResponseService.ts)**
   - Líneas 1593-1662: `getTopProfesionistas()` con filtrado de rechazados
   - Línea 2167: Llamada con `usuarioId`

3. **[index.ts](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\microservices\chat\src\index.ts)**
   - Líneas 706-735: Endpoint `/profesionista/preferencia`

### Frontend (Flutter):

1. **[api_endpoints.dart](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\FromIntegrador\lib\core\network\api_endpoints.dart)**
   - Línea 37: Constante `profesionistasPreferencia`

2. **[home_notifier.dart](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\FromIntegrador\lib\features\home\presentation\providers\home_notifier.dart)**
   - Líneas 404-439: Método `registrarPreferenciaProfesionista()`

3. **[home_content.dart](c:\Users\umina\OneDrive\Escritorio\LexIA2.0\FromIntegrador\lib\features\home\presentation\widgets\home_content.dart)**
   - Líneas 444-463: Callback `onRechazar` con API call
   - Líneas 667-674: Registro de preferencia en `_handleMatchProfesionista`

---

## 🚀 Cómo Ejecutar las Pruebas

### Método 1: Desde la App (Recomendado)

1. Iniciar Docker:
   ```bash
   docker-compose up -d
   ```

2. Iniciar app Flutter:
   ```bash
   cd FromIntegrador
   flutter run
   ```

3. Seguir los pasos de los tests descritos arriba

### Método 2: Script Automatizado (Backend)

```bash
cd microservices/chat
node test-preferencias.js
```

*(Nota: Este script aún no existe, pero puede crearse basándose en `test-ollama-integration.bat`)*

---

## 📞 Soporte

Si encuentras problemas:

1. **Verificar que todos los servicios estén corriendo:**
   ```bash
   docker ps
   ```

2. **Ver logs completos del servicio chat:**
   ```bash
   docker logs lexia-chat --tail 200
   ```

3. **Rebuild completo si nada funciona:**
   ```bash
   docker-compose down
   docker-compose build chat
   docker-compose up -d
   ```

---

**¿Listo para probar?** Inicia la app y comienza con el TEST 1.
