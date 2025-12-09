# 🗺️ Mapa Legal - Integración Completa

## ✅ Implementación Completada

### 📦 Componentes Agregados

1. **Modelos de Datos** (`lib/features/location/data/models/location_models.dart`):
   - `LegalLocation` - Ubicaciones legales con coordenadas
   - `NearbyLocationsResponse` - Respuesta de búsqueda geoespacial
   - `PublicOffice` - Oficinas públicas para asesoría
   - `AdvisoryResponse` - Respuesta de asesoría con diferenciación de plan

2. **DataSource** (`lib/features/location/data/datasources/location_datasource.dart`):
   - `getNearbyLocations()` - Búsqueda por radio y geolocalización
   - `getAdvisory()` - Obtener oficinas públicas por estado

3. **UI con Google Maps** (`lib/features/location/presentation/pages/legal_map_page.dart`):
   - ✅ Integración completa con `google_maps_flutter`
   - ✅ Geolocalización con permisos
   - ✅ Marcadores interactivos (azul = usuario, rojo = ubicaciones, verde = oficinas)
   - ✅ Dos vistas: Mapa y Lista
   - ✅ Filtros: Estado y Radio (1-50 km)
   - ✅ Dos modos: Cercanas y Asesoría
   - ✅ Diferenciación Free vs Pro

### 🔌 Integración

- ✅ Registrado en DI (`injection_container.dart`)
- ✅ Ruta agregada (`/legal-map` en `app_router.dart`)
- ✅ Menú drawer actualizado (icono de mapa)
- ✅ Paquetes instalados:
  - `geolocator: ^13.0.4`
  - `google_maps_flutter: ^2.14.0`

### 🔑 Configuración Requerida

#### 1. API Key de Google Maps

**IMPORTANTE**: Debes configurar tu API Key de Google Maps para que el mapa funcione.

Consulta el archivo [`CONFIGURAR_GOOGLE_MAPS.md`](./CONFIGURAR_GOOGLE_MAPS.md) para instrucciones detalladas.

**Pasos rápidos**:

1. Obtén una API Key en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilita **Maps SDK for Android**
3. Edita `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.geo.API_KEY"
    android:value="TU_API_KEY_AQUI" />
```

⚠️ **NO subas tu API key al repositorio**. Usa `local.properties` (ver guía completa).

### 📱 Permisos Configurados

En `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### 🎯 Funcionalidades

#### Vista de Mapa

- 🔵 **Marcador azul**: Tu ubicación actual
- 🔴 **Marcadores rojos**: Ubicaciones legales cercanas
- 🟢 **Marcadores verdes**: Oficinas públicas (solo Pro)
- Botón flotante para re-centrar en ubicación actual
- Tap en marcadores para ver detalles

#### Búsqueda Cercanas

1. Usuario presiona botón **"Cercanas"**
2. Se obtiene ubicación actual (solicita permisos si es necesario)
3. Busca ubicaciones en radio seleccionado
4. Muestra marcadores y lista

#### Asesoría (Diferenciación Free vs Pro)

1. Usuario presiona botón **"Asesoría"**
2. Selecciona estado en dropdown
3. **Plan Free**: Muestra mensaje de upgrade con candado 🔒
4. **Plan Pro**: Muestra oficinas públicas con detalles completos

#### Vista de Lista

- Alterna entre mapa y lista con botón en AppBar
- Tap en item de lista centra el mapa en esa ubicación
- Muestra distancia calculada desde tu ubicación

### 🔗 Endpoints Utilizados

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/ubicacion/locations/nearby` | GET | Búsqueda geoespacial por radio |
| `/ubicacion/locations/asesoria` | GET | Oficinas públicas por estado |

**Query Parameters**:

**Nearby**:
- `latitud`: Latitud del usuario
- `longitud`: Longitud del usuario
- `distancia_km`: Radio de búsqueda
- `tipo`: (Opcional) Filtrar por tipo
- `limit`: Límite de resultados

**Asesoría**:
- `usuario_id`: UUID del usuario
- `estado`: Estado seleccionado
- `tema`: (Opcional) Tema de asesoría

### 🧪 Testing

#### Prerrequisitos

1. ✅ API Key configurada
2. ✅ Dispositivo físico o emulador con Google Play Services
3. ✅ Backend `microservicio_orientacion_local` corriendo
4. ✅ Usuario autenticado en la app

#### Pasos de Prueba

```bash
# 1. Ejecutar en dispositivo
flutter run

# 2. Iniciar sesión
# 3. Ir al menú lateral
# 4. Presionar "Mapa Legal"
# 5. Aceptar permisos de ubicación
# 6. Probar botón "Cercanas"
# 7. Cambiar estado y probar "Asesoría"
# 8. Alternar entre vista Mapa y Lista
```

#### Casos de Prueba

| Caso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Abrir mapa sin permisos | Solicita permisos de ubicación |
| 2 | Denegar permisos | Muestra mensaje de error y botón reintentar |
| 3 | Aceptar permisos | Centra mapa en ubicación actual |
| 4 | Presionar "Cercanas" | Busca y muestra marcadores rojos |
| 5 | Tap en marcador | Abre bottom sheet con detalles |
| 6 | Cambiar radio a 50 km | Busca en radio más amplio |
| 7 | Presionar "Asesoría" (Free) | Muestra mensaje de upgrade |
| 8 | Presionar "Asesoría" (Pro) | Muestra oficinas verdes |
| 9 | Alternar a vista Lista | Muestra lista de ubicaciones |
| 10 | Tap en item de lista | Centra mapa y vuelve a vista mapa |

### 🐛 Troubleshooting

#### El mapa no se muestra (pantalla gris)

- **Causa**: API Key no configurada o incorrecta
- **Solución**: 
  1. Verifica que hayas copiado bien la API Key
  2. Asegúrate de habilitar **Maps SDK for Android** en Google Cloud Console
  3. Reconstruye la app: `flutter clean && flutter run`

#### Error "Location services are disabled"

- **Causa**: GPS desactivado en el dispositivo
- **Solución**: Activa la ubicación en Configuración del dispositivo

#### No se muestran marcadores

- **Causa**: Backend no está respondiendo o no hay datos
- **Solución**:
  1. Verifica que `microservicio_orientacion_local` esté corriendo
  2. Revisa logs del backend
  3. Prueba con diferentes radios de búsqueda

#### "Permiso denegado permanentemente"

- **Causa**: Usuario negó permisos y marcó "No volver a preguntar"
- **Solución**: 
  1. Ir a Configuración > Apps > LexIA > Permisos
  2. Habilitar manualmente permisos de ubicación

### 📊 Diferencias Free vs Pro

| Característica | Free | Pro |
|----------------|------|-----|
| Búsqueda cercanas | ✅ | ✅ |
| Vista de mapa | ✅ | ✅ |
| Marcadores | ✅ | ✅ |
| Asesoría legal | ❌ Mensaje de upgrade | ✅ Lista completa |
| Oficinas públicas | ❌ | ✅ Con detalles completos |
| Teléfonos y horarios | ❌ | ✅ |

### 💰 Costos de Google Maps

- **Gratis**: $200 USD de crédito mensual
- **Cubre**: ~28,000 cargas de mapa estático o ~40,000 cargas dinámicas
- **Para desarrollo**: Más que suficiente
- **Monitoreo**: Google Cloud Console > APIs & Services > Dashboard

### 📚 Referencias

- [google_maps_flutter](https://pub.dev/packages/google_maps_flutter)
- [geolocator](https://pub.dev/packages/geolocator)
- [Google Maps Platform](https://developers.google.com/maps)
- [PostGIS Documentation](https://postgis.net/docs/)

### 🎨 Personalización Futura

Ideas para mejorar el mapa:

- [ ] Clusters de marcadores cuando hay muchos
- [ ] Rutas desde ubicación actual a destino
- [ ] Búsqueda por dirección/ciudad
- [ ] Filtros por tipo de ubicación (juzgados, fiscalías, etc.)
- [ ] Favoritos/guardados
- [ ] Compartir ubicación
- [ ] Modo oscuro para el mapa
- [ ] Integración con Google Places para autocompletado

---

✅ **Estado**: Implementación completa, listo para testing con API Key configurada
