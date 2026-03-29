# 🗺️ Sistema de Mapa del Campus - Instrucciones de Instalación

## ✅ Implementación Completada

Se ha implementado el sistema completo de mapa del campus con las siguientes características:

### 🎯 Funcionalidades Implementadas

#### 1. Puntos de Interés (POIs)
- **19 categorías diferentes**: Estacionamiento, baños, biblioteca, cafetería, accesos, paraderos, bicicletas, enfermería, seguridad, Wi-Fi, extinguidores, salidas de emergencia, ascensores, escaleras, áreas verdes, patios, gimnasio, auditorio y otros
- **Sistema CRUD completo** para gestores
- **Iconos personalizables** (emoji) y colores por categoría
- **Metadata flexible** (capacidades, género de baño, etc.)

#### 2. Rutas y Caminos
- **4 tipos de rutas**: Peatonal, vehicular, bicicleta, accesible (rampa)
- **Polilíneas visuales** en el mapa con colores y grosores personalizables
- **Conectores** entre puntos de interés

#### 3. Áreas del Mapa
- **Polígonos delimitadores**: Estacionamientos, zonas verdes, patios, canchas, zonas restringidas
- **Colores y transparencia** ajustables

#### 4. Mapa Interactivo
- **Marcadores de edificios** con etiquetas permanentes
- **Marcadores de salas** con indicador de disponibilidad (verde/rojo)
- **Control de capas** para mostrar/ocultar elementos
- **Popups informativos** al hacer click
- **Tooltips** con nombres en hover

#### 5. Página de Inicio Pública
- **Mapa del campus** visible sin autenticación
- **Buscadores** de salas, horarios y actividades
- **Accesos rápidos** a puntos de interés comunes
- **Botón de login** para acceder al panel de administración

---

## 🚀 Pasos para Activar en el Servidor

### 1. Ejecutar Migración de Base de Datos

**En tu servidor PHP**, ejecuta el script de migración:

\`\`\`bash
php backend/migrate_map_features.php
\`\`\`

Esto creará 3 nuevas tablas:
- \`pois\` - Puntos de interés
- \`routes\` - Rutas/caminos
- \`map_areas\` - Áreas/polígonos

**Nota:** Si la base de datos no existe aún, ejecuta primero:
\`\`\`bash
php backend/install.php
\`\`\`

### 2. Verificar Archivos del Backend

Asegúrate de que estos archivos estén en el servidor:

\`\`\`
backend/
├── api/
│   ├── pois.php          ✅ NUEVO - Endpoints para POIs
│   ├── routes.php        ✅ NUEVO - Endpoints para rutas
│   ├── map-areas.php     ✅ NUEVO - Endpoints para áreas
│   ├── edificios.php     ✅ Ya existente
│   └── salas.php         ✅ Ya existente
├── schema.sql            ✅ Actualizado con nuevas tablas
└── migrate_map_features.php  ✅ NUEVO - Script de migración
\`\`\`

### 3. Permisos de Archivos

Asegúrate de que la base de datos tenga permisos de escritura:

\`\`\`bash
chmod 664 backend/db/horarios.sqlite
\`\`\`

---

## 📁 Archivos Frontend Creados

### Feature: Map

\`\`\`
src/features/map/
├── types/
│   └── index.ts                    # Tipos TypeScript para POIs, rutas, áreas
├── services/
│   └── mapService.ts              # Servicios de API para comunicación con backend
├── hooks/
│   └── useMapData.ts              # Hook para cargar todos los datos del mapa
├── components/
│   ├── CampusMap.tsx              # Componente principal del mapa
│   ├── POIMarker.tsx              # Marcador de punto de interés
│   ├── BuildingMarker.tsx         # Marcador de edificio
│   ├── RoomMarker.tsx             # Marcador de sala
│   ├── RoutePolyline.tsx          # Polilínea de ruta
│   ├── AreaPolygon.tsx            # Polígono de área
│   ├── LayerControl.tsx           # Control de visibilidad de capas
│   └── POIForm.tsx                # Formulario de creación/edición de POI
└── views/
    ├── MapView.tsx                # Vista del mapa para usuarios autenticados
    └── POIManagerView.tsx         # Gestor de POIs (solo gestores)
\`\`\`

### Feature: Public

\`\`\`
src/features/public/
└── views/
    └── HomePage.tsx               # Página de inicio pública con mapa y buscadores
\`\`\`

---

## 🎨 Rutas Actualizadas

### Públicas (sin autenticación)
- \`/\` - Página de inicio con mapa y buscadores
- \`/login\` - Login
- \`/public/room/:id\` - Horario público de sala
- \`/public/teacher/:id\` - Horario público de docente
- \`/report\` - Reportar observación vía QR

### Protegidas (requieren login)
- \`/admin/dashboard\` - Dashboard principal
- \`/admin/map\` - Vista completa del mapa
- \`/admin/map/poi-manager\` - Gestor de POIs (solo gestor)
- \`/admin/schedules\` - Horarios
- \`/admin/rooms\` - Salas
- \`/admin/buildings\` - Edificios (solo gestor)
- Y las demás rutas existentes...

---

## 🧪 Cómo Probar

1. **Inicia el servidor de desarrollo:**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Accede a la página de inicio:**
   - Ve a \`http://localhost:5173\`
   - Deberías ver el mapa del campus inmediatamente (sin login)

3. **Prueba el gestor de POIs:**
   - Haz click en "Iniciar Sesión"
   - Login: \`gestor@horarios.cl\` / \`demo123\`
   - Ve a la sección "Mapa" en el menú
   - Verás un botón para gestionar POIs

4. **Agrega tu primer POI:**
   - Click en "➕ Agregar Punto de Interés"
   - Selecciona categoría (ej: Estacionamiento)
   - Ingresa nombre y descripción
   - **Haz click en el mapa** para seleccionar ubicación (o arrastra el marcador)
   - Guarda

5. **Verifica en la página pública:**
   - Cierra sesión o abre en incógnito
   - Ve a \`/\`
   - Deberías ver el marcador que acabas de crear en el mapa

---

## 🎯 Próximos Pasos Sugeridos

1. **Agregar datos iniciales:**
   - Crear POIs para estacionamientos principales
   - Marcar ubicación de baños en cada edificio
   - Agregar ubicación de biblioteca, cafeterías, etc.

2. **Dibujar rutas:**
   - Rutas peatonales entre edificios
   - Rutas de acceso desde estacionamientos
   - Rutas accesibles para sillas de ruedas

3. **Delimitar áreas:**
   - Áreas de estacionamiento
   - Zonas verdes
   - Canchas deportivas

4. **Implementar búsqueda:**
   - Conectar los buscadores de la página de inicio con las APIs
   - Filtrado en tiempo real

5. **Integrar disponibilidad en tiempo real:**
   - Calcular disponibilidad de salas según horarios
   - Mostrar colores actualizados (verde/rojo)

---

## 📝 Notas Técnicas

- **Leaflet** se usa para el mapa base (OpenStreetMap)
- Los datos se almacenan en **SQLite** (backend)
- La comunicación frontend-backend es vía **JSON REST API**
- Los POIs usan **iconos emoji** (fácilmente personalizables)
- El control de capas permite mostrar/ocultar hasta **22 tipos diferentes** de elementos

---

## ❓ Problemas Comunes

### "Error al cargar datos del mapa"
- Verifica que el backend esté corriendo
- Revisa que los endpoints PHP estén accesibles
- Comprueba la consola del navegador para más detalles

### "No se ven los marcadores"
- Asegúrate de que la migración se ejecutó correctamente
- Verifica que haya datos en las tablas (usa phpLiteAdmin o similar)
- Revisa el control de capas (puede que estén ocultos)

### "No puedo hacer click en el mapa"
- Esto es normal en el \`MapLocationPicker\` (formulario de creación)
- En el mapa principal, los clicks abren popups de marcadores existentes

---

**Fecha de Implementación:** 2026-01-06
**Versión:** 1.0
**Estado:** ✅ Completado y listo para usar
