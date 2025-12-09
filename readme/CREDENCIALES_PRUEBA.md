# Credenciales de Prueba - Flutter Lexia

Este documento contiene las credenciales de prueba para cada tipo de usuario en la aplicación.

## Usuario Normal

**Correo:** `usuario@lexia.com`
**Contraseña:** `Usuario123`

**Tipo de cuenta:** Usuario
**Descripción:** Este usuario tiene acceso al panel de usuario normal, donde puede:
- Hacer consultas legales a LexIA
- Ver su historial de consultas
- Participar en el foro comunitario
- Buscar contenido legal
- Ver el mapa de instituciones legales
- Gestionar su perfil

---

## Abogado

**Correo:** `abogado@lexia.com`
**Contraseña:** `Abogado123`

**Tipo de cuenta:** Abogado
**Descripción:** Este abogado tiene acceso al panel profesional, donde puede:
- Ver estadísticas de su práctica profesional
- Gestionar consultas pendientes
- Participar y responder en el foro comunitario
- Ver métricas mensuales de desempeño
- Acceder a estadísticas avanzadas
- Gestionar su perfil profesional

---

## Notas Importantes

1. **Configuración del Backend:** Estas credenciales deben ser configuradas en tu backend para que funcionen correctamente.

2. **Tipo de Usuario:** El backend debe devolver un campo `role`, `tipo`, o `userType` con el valor:
   - `"user"` para usuarios normales
   - `"lawyer"` o `"abogado"` para abogados

3. **Ejemplo de respuesta del backend al hacer login:**

```json
{
  "access_token": "eyJhbGc...",
  "usuario": {
    "id": 1,
    "email": "abogado@lexia.com",
    "nombre": "Ana María",
    "apellidos": "González",
    "telefono": "5551234567",
    "role": "lawyer",
    "suscripcion_id": 2,
    "fecha_registro": "2024-01-15T10:30:00Z"
  }
}
```

4. **Redirección Automática:**
   - Los usuarios normales serán redirigidos a `/home` después del login
   - Los abogados serán redirigidos a `/lawyer` después del login

5. **Para Testing Local:** Si no tienes acceso al backend, puedes modificar temporalmente el `LoginNotifier` para simular diferentes tipos de usuarios.
