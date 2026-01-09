# Configuración de OpenStreetMap para LexIA

## 🗺️ ¿Por qué OpenStreetMap?

OpenStreetMap (OSM) es una alternativa **100% gratuita** a Google Maps que no requiere:
- ❌ API Keys
- ❌ Facturación
- ❌ Límites de cuota
- ❌ Configuración compleja

## 📦 Dependencias

El proyecto usa `flutter_map` para integrar OpenStreetMap:

```yaml
dependencies:
  flutter_map: ^7.0.2      # Widget de mapa para Flutter
  latlong2: ^0.9.1         # Manejo de coordenadas lat/lng
  geolocator: ^13.0.2      # Obtener ubicación del usuario
```

## 🚀 Características implementadas

✅ **Mapa interactivo** con tiles de OpenStreetMap  
✅ **Marcadores personalizados** con íconos Material  
✅ **Ubicación actual** del usuario  
✅ **Zoom y navegación** sin restricciones  
✅ **Sin costos** ni límites de uso  

## 📱 Uso en la app

### Funcionalidades del Mapa Legal:

1. **Búsqueda de ubicaciones cercanas**:
   - Busca juzgados, ministerios públicos, etc.
   - Radio configurable (1-50 km)
   - Marcadores rojos para ubicaciones legales

2. **Asesoría por estado**:
   - Muestra oficinas públicas del estado seleccionado
   - Marcadores verdes para oficinas gubernamentales
   - Información detallada al tocar el marcador

3. **Vista de lista/mapa**:
   - Alterna entre vista de mapa y lista
   - Toca un elemento en la lista para centrarlo en el mapa

## 🔧 Configuración de permisos

### Android (`android/app/src/main/AndroidManifest.xml`):

```xml
<!-- Permisos para geolocalización -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET"/>
```

### iOS (`ios/Runner/Info.plist`):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para mostrarte oficinas legales cercanas</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Necesitamos tu ubicación para mostrarte oficinas legales cercanas</string>
```

## 🎨 Personalización de tiles

Actualmente usamos los tiles oficiales de OSM:

```dart
TileLayer(
  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  userAgentPackageName: 'com.example.flutter_application_1',
  maxZoom: 19,
)
```

### Alternativas de tiles (todos gratuitos):

1. **OpenStreetMap Standard** (actual):
   ```
   https://tile.openstreetmap.org/{z}/{x}/{y}.png
   ```

2. **CartoDB Positron** (diseño minimalista):
   ```
   https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png
   ```

3. **CartoDB Dark Matter** (tema oscuro):
   ```
   https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png
   ```

4. **OpenTopoMap** (topográfico):
   ```
   https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png
   ```

## 🔍 Ejemplo de uso

```dart
FlutterMap(
  mapController: _mapController,
  options: MapOptions(
    initialCenter: LatLng(19.4326, -99.1332), // CDMX
    initialZoom: 14.0,
    minZoom: 5.0,
    maxZoom: 18.0,
  ),
  children: [
    TileLayer(
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      userAgentPackageName: 'com.example.flutter_application_1',
    ),
    MarkerLayer(
      markers: [
        Marker(
          point: LatLng(19.4326, -99.1332),
          width: 40,
          height: 40,
          child: Icon(Icons.location_on, color: Colors.red, size: 40),
        ),
      ],
    ),
  ],
)
```

## ✅ Ventajas de OpenStreetMap

| Característica | Google Maps | OpenStreetMap |
|----------------|-------------|---------------|
| **Costo** | $200 USD/mes crédito, luego paga | ✅ Gratis |
| **API Key** | ✅ Requerida | ❌ No necesaria |
| **Límites** | 28,000 cargas/mes gratis | ✅ Sin límites |
| **Configuración** | Compleja (Cloud Console) | ✅ Simple |
| **Privacidad** | Datos en Google | ✅ Open source |
| **Offline** | Limitado | ✅ Cacheable |

## 🐛 Troubleshooting

### Los tiles no cargan

- **Causa**: Sin conexión a internet
- **Solución**: Verifica la conexión y permisos de internet en AndroidManifest.xml

### "Failed to load tile"

- **Causa**: Servidor de tiles temporalmente no disponible
- **Solución**: Cambia a un proveedor alternativo de tiles (ej: CartoDB)

### Marcadores no aparecen

- **Causa**: Coordenadas incorrectas o fuera del viewport
- **Solución**: Verifica que las coordenadas sean válidas y usa `_mapController.move()` para centrar

### App lenta con muchos marcadores

- **Solución**: 
  1. Limita la cantidad de marcadores visibles
  2. Usa clustering para agrupar marcadores cercanos
  3. Considera `flutter_map_marker_cluster` para optimización

## 📚 Referencias

- [OpenStreetMap](https://www.openstreetmap.org/)
- [flutter_map Package](https://pub.dev/packages/flutter_map)
- [Tile Servers](https://wiki.openstreetmap.org/wiki/Tile_servers)
- [Leaflet Providers](https://leaflet-extras.github.io/leaflet-providers/preview/)

## 🌍 Política de uso

OpenStreetMap es **gratuito** pero pide respetar su [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/):

1. ✅ Incluir User-Agent válido (ya configurado)
2. ✅ Cachear tiles cuando sea posible
3. ✅ No hacer más de 2 requests/segundo por usuario
4. ✅ Considerar donaciones si tu app tiene mucho tráfico

Para apps de alto tráfico, considera servicios comerciales como:
- Mapbox (tiene tier gratuito)
- Maptiler (tiene tier gratuito)
- Thunderforest (para mapas especializados)

