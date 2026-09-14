# Documento de Proyecto — Sistema OWEN

**Fecha de revisión:** 30 de marzo de 2026
**URL de producción:** https://tmeduca.org/owen/
**Estado general:** MVP funcional con datos de prueba, varios módulos pendientes de implementación

---

## 1. Descripción General

Sistema OWEN es una plataforma web de gestión de horarios institucional para un campus universitario en Puerto Montt, Chile. Permite administrar salas, edificios, docentes, carreras y bloques horarios, con un portal público para que cualquier persona consulte disponibilidad de salas y explore el campus en un mapa interactivo.

---

## 2. Portal Público (sin autenticación)

### 2.1 Página Principal
**Captura:** `01_public_home.png`, `01_home.png`

La página de inicio presenta tres secciones principales:

- **Buscador de Salas y Horarios:** Dos modos de búsqueda:
  - *Por Sala:* Campo de texto para buscar por código, nombre o edificio, con filtros rápidos por tipo (Aula, Laboratorio, Auditorio, Taller, Sala Reuniones, Oficina, Biblioteca, Medioteca) y botón "Buscar".
  - *Por Carrera/Nivel:* Selectores desplegables de Carrera y Nivel.
- **Lugares de Interés:** Enlace para encontrar secretarías, casinos, bibliotecas, estacionamientos, con botón "Explorar Campus".
- **Mapa del Campus:** Mapa interactivo (Leaflet + OpenStreetMap) con marcadores azules en los edificios, leyenda de estado de salas (Disponible/Ocupada), y control de capas.

**Observaciones:**
- Al buscar "Laboratorio" se muestra "No se encontraron salas" — posiblemente no hay laboratorios registrados en los datos de prueba.
- El mapa muestra correctamente la ubicación costera del campus con edificios numerados (100, 400, 500, etc.).
- El footer incluye "Sistema OWEN - Sede Puerto Montt, Chile" y enlace "Reportar observación".

### 2.2 Reportar Observación
**Captura:** `06_reportar_observacion.png`

Página `/report` muestra solo el título "Reportar Observación" con contenido vacío. **El formulario de observaciones no está implementado.**

### 2.3 Login
**Captura:** `07_login_page.png`

Formulario limpio y centrado en la pantalla con:
- Campo Email (placeholder: usuario@ejemplo.cl)
- Campo Contraseña
- Botón "Iniciar sesión"
- Título "Sistema OWEN — Sistema de Gestión de Horarios"

---

## 3. Panel de Administración

### 3.1 Estructura de Navegación (Sidebar)

El panel usa un sidebar lateral izquierdo con la siguiente estructura:

```
Panel Principal
Horarios
Asistente Horarios

GESTIÓN FÍSICA
├── Edificios
├── Salas
└── Mapa del Campus

GESTIÓN ACADÉMICA
├── Carreras
├── Unidades
└── Docentes

SISTEMA
├── Bloques Horarios
├── Solicitudes
├── Observaciones
├── Reportes
└── Configuración
```

Header superior: Logo "Sistema OWEN" + subtítulo genérico "Sistema de horarios tipo W para Escuela tipo N" + selector de idioma (ES) + nombre de usuario (Administrador/Gestor) + botón "Cerrar Sesión".

### 3.2 Dashboard (Panel Principal)
**Captura:** `01_dashboard.png`

Contadores principales en cards:
| Métrica | Valor |
|---------|-------|
| Salas | 4 |
| Edificios | 3 |
| Docentes | 1 |
| Carreras | 1 |
| Horarios | 0 |
| Asignaturas | 1 |

Widgets:
- **Ocupación de hoy:** 0% (0 de X salas ocupadas ahora)
- **Solicitudes recientes:** Sin solicitudes
- **Últimos horarios creados:** Sin horarios registrados
- **Salas por tipo:** Funcional pero con pocos datos
- **Versionado de horarios:** Sin versionado (feature planificada con modelo tipo Git: branches, commits, diff, merge)

**Accesos rápidos:** Horarios, Salas, Solicitudes, Mapa, Asistente de horarios, Solver, Reportes.

### 3.3 Horarios
**Captura:** `02_horarios.png`, `03_horarios_scroll.png`

Vista de grilla semanal con:
- **Filtros por vista:** Por Sala | Por Docente | Por Nivel | Por Asignatura
- **Selector de sala:** Dropdown (ej: "501 - 501")
- **Grilla:** Columnas Lun-Vie, filas por bloque horario (Bloque 1 a 7+, cada uno con su rango de horas)
- **Botones "+"** en cada celda para agregar un horario
- **Leyenda:** Asignatura, Docente, Sala, "Click para ver detalles"
- **Estado actual:** 0 clases programadas

### 3.4 Asistente de Horarios (Wizard)
**Captura:** `04_asistente_horarios.png`, `19_wizard_detalle.png`

Wizard paso a paso para crear horarios:
- **Paso 1 — Seleccionar sala:** Lista de salas con búsqueda por código, nombre o edificio. Muestra: código, tipo (Aula), nombre, capacidad. Botón "+ Nueva Sala" para crear una nueva.
- Salas disponibles: 501 (cap. 30), 508 (cap. 30), 507 (cap. 30), 101 (cap. 30)
- Navegación: botones "Atrás" / "Siguiente"
- Enlace a "Vista clásica" (la grilla normal de horarios)

### 3.5 Edificios
**Captura:** `05_edificios.png`, `17_edificio_crear_form.png`

Cards por edificio con:
- Espacio para foto (vacío en los 3 edificios)
- Código numérico (100, 400, 500)
- Descripción (ej: edificio 400 tiene descripción sobre primer piso)
- Contadores: X pisos, X aulas, X metros cuadrados
- Botones: Editar, Eliminar
- Botón "Nuevo Edificio" en la esquina superior

**Formulario de nuevo edificio (modal):**
- Nombre del Edificio, Código
- Número de Pisos
- Descripción (opcional)
- Fotos del Edificio (carga de imágenes)
- Ubicación en el Campus (mapa interactivo para posicionar)

### 3.6 Gestión de Salas
**Captura:** `06_salas.png`, `18_sala_crear_form.png`

Cards por sala con:
- Espacio para foto
- Código (501, 508, 507, 101, 161)
- Tipo + capacidad
- Estado de gestión (ej: "gestión central")
- Ícono de proyector/equipamiento
- Cantidad de metros cuadrados
- Enlace "Ver público" (vista pública de horario)
- Botón QR
- Barra superior: Filtros, Ver inactivas, Imprimir QR, Nueva Sala

**Formulario de nueva sala (modal):**
- Código*, Nombre*, Edificio* (select), Piso*
- Tipo de Sala* (Aula, Lab, etc.), Capacidad*
- Tipo de Mobiliario, Equipamiento (checkboxes: Pizarra, Proyector, +)
- Sección "Gestión y Administración": Nivel de gestión (Central por defecto)
- Fotos de la Sala

### 3.7 Mapa del Campus (Admin)
**Captura:** `07_mapa_admin.png`

Mapa interactivo completo con:
- Marcadores de edificios (100, 400, 500, etc.)
- Botón "Herramientas" (funciones de administración del mapa)
- Control de capas del mapa
- Leyenda de estado de salas (Disponible verde, Ocupada rojo)
- Zoom y controles de navegación

### 3.8 Carreras
**Captura:** `08_carreras.png`

Layout master-detail:
- Panel izquierdo: lista de carreras con búsqueda y botón "+"
- Panel derecho: detalle de la carrera seleccionada (niveles, asignaturas)
- Datos de prueba: 1 carrera "Ped" (IEPE)
- Estado vacío: "Seleccione una carrera — Gestione el personal académico, niveles y asignaturas por carrera"

### 3.9 Unidades Académicas
**Captura:** `09_unidades.png`

Layout master-detail similar a Carreras:
- Búsqueda + botón "+"
- **Vacío:** "No se encontraron unidades"
- Estado vacío: "Seleccione una unidad académica para gestionar su personal y directiva"

### 3.10 Docentes
**Captura:** `10_docentes.png`

Layout master-detail:
- Panel izquierdo: lista de docentes con búsqueda y botón "+"
- Agrupación "ACTIVOS INACTIVOS"
- 1 docente de prueba: "Brígida Urrutia Rubilar" (RUT 123456778)
- Estado vacío derecho: "Gestión de Docentes — Seleccione un docente de la lista para gestionar su perfil, disponibilidad y carga académica"

### 3.11 Bloques Horarios
**Captura:** `11_bloques_horarios.png`

Gestión de sistemas de bloques horarios:
- Panel izquierdo: lista de sistemas ("Vespertino", "otro regimen") con botón "+"
- Grilla principal: Lun-Vie con todos los bloques definidos
- **Sistema Vespertino:** 9+ bloques diarios, desde 08:10 hasta 16:20+
- Cada bloque muestra hora inicio — hora fin (ej: Bloque 1: 08:10-08:55)
- Botones superiores: Temporadas, Generador Masivo

### 3.12 Solicitudes
**Captura:** `12_solicitudes.png`

Gestión de solicitudes de sala:
- Título: "Gestión de Solicitudes — Revisa, aprueba o rechaza solicitudes de sala"
- Contador: "0 solicitudes"
- Filtro dropdown: "Todas"
- Botón "+ Nueva Solicitud"
- Estado: "No hay solicitudes"

### 3.13 Observaciones
**Captura:** `13_observaciones.png`

Página con solo el título "Observaciones". **Sin contenido implementado.** Se espera que aquí se gestionen los tickets de observación creados vía QR desde el portal público.

### 3.14 Reportes
**Captura:** `14_reportes.png`

Generación de reportes con:
- Botones de exportación: PDF, Excel
- Tipos de reporte: Por Sala | Por Docente | Por Nivel | Por Asignatura
- Selector según tipo (ej: "Seleccionar sala...")
- Vista Previa: "Seleccione un filtro para ver la vista previa"

### 3.15 Configuración
**Captura:** `15_configuracion.png`, `16_configuracion_scroll.png`

Tabs: General | Notificaciones | Área Pública | QR

**Tab General:**
- **Identidad del Sitio:** Nombre del sistema ("Sistema OWEN"), Subtítulo ("Sistema de Horarios - Sede Puerto Montt"), Título de pestaña del navegador
- **Mapa y Navegación:** Trazado automático de rutas peatonales con OpenRouteService. Enlace a consola de desarrolladores de OpenRouteService. API Key configurable
- **Módulos del Sistema:** Toggle para "Generador de Horarios (Solver)" con descripción de funcionalidad
- **Base de Datos:** Botón "Ejecutar Migraciones" para actualizar la estructura de la BD

---

## 4. Datos de Prueba Actuales

| Entidad | Cantidad | Detalle |
|---------|----------|---------|
| Edificios | 3 | Códigos 100, 400, 500 |
| Salas | 4-5 | 501, 508, 507, 101, 161 (todas Aula, cap. 30) |
| Carreras | 1 | "Ped" (IEPE) |
| Docentes | 1 | Brígida Urrutia Rubilar |
| Horarios | 0 | Ninguno creado |
| Solicitudes | 0 | Ninguna |
| Unidades | 0 | Ninguna |
| Sistemas de bloques | 2 | "Vespertino", "otro regimen" |

---

## 5. Funcionalidades Implementadas vs. Pendientes

### Implementadas (funcionales)
- Login/Logout con sesiones PHP
- Dashboard con contadores y widgets
- CRUD Edificios (crear, editar, eliminar, con fotos y ubicación en mapa)
- CRUD Salas (crear con equipamiento, tipo, gestión, QR, vista pública)
- Gestión de Carreras (master-detail)
- Gestión de Docentes (master-detail)
- Gestión de Unidades Académicas (master-detail, sin datos)
- Grilla de horarios semanal (por sala, docente, nivel, asignatura)
- Asistente de horarios paso a paso (wizard)
- Bloques horarios con múltiples sistemas y generador masivo
- Mapa interactivo del campus con marcadores, capas, herramientas admin
- Reportes con exportación PDF/Excel
- Configuración del sistema (identidad, mapa, módulos, migraciones)
- Portal público con búsqueda de salas y mapa
- Soporte i18n (ES/EN)
- Generación de QR para salas

### Parcialmente implementadas
- Solicitudes de sala (UI existe, sin datos ni flujo LLM)
- Vista pública de horarios por sala (enlace existe)

### Pendientes / No implementadas
- **Observaciones vía QR:** Página vacía tanto en admin como en público (`/report`)
- **Integración LLM:** Auto-gestión de solicitudes con Claude API
- **Versionado de horarios:** Modelo tipo Git (branches, commits, diff, merge)
- **Solver/Generador automático:** App Tauri con HiGHS (proyecto separado)
- **Liberación de clases** por dirección de carrera
- **Rol Dirección:** Vistas limitadas para direcciones de carrera
- **Detección de conflictos** al crear horarios
- **Calendario** con feriados
- **Links públicos compartibles**
- **Notificaciones** (tab en configuración sin contenido visible)
- **Fotos de edificios** (espacios vacíos en todos los edificios)

---

## 6. Observaciones de UX/UI

### Positivo
- Diseño limpio y moderno con Tailwind + Shadcn/ui
- Sidebar bien organizado por categorías (Gestión Física, Académica, Sistema)
- Formularios modales completos con validación
- Mapa interactivo bien integrado con OpenStreetMap
- Dashboard informativo con métricas relevantes
- Sistema responsive (viewport 1920x1080 revisado)

### A mejorar
- **Subtítulo genérico:** "Sistema de horarios tipo W para Escuela tipo N" debería ser personalizado
- **Fotos de edificios:** Todos vacíos, afecta la presentación visual
- **Página de reportar observación:** Completamente vacía, sin formulario
- **Observaciones admin:** Página vacía sin funcionalidad
- **Datos de prueba escasos:** Solo 1 docente, 1 carrera, 0 horarios — dificulta evaluar la experiencia real
- **Resultados de búsqueda pública:** Buscar "Laboratorio" no encuentra nada (no hay labs cargados)

---

## 7. Arquitectura de URLs

### Público
| Ruta | Descripción |
|------|-------------|
| `/owen/` | Portal público (búsqueda + mapa) |
| `/owen/login` | Formulario de login |
| `/owen/report` | Reportar observación (pendiente) |

### Admin (requiere autenticación)
| Ruta | Descripción |
|------|-------------|
| `/owen/admin/dashboard` | Panel principal |
| `/owen/admin/schedules` | Grilla de horarios |
| `/owen/admin/schedule-wizard` | Asistente paso a paso |
| `/owen/admin/buildings` | Gestión de edificios |
| `/owen/admin/rooms` | Gestión de salas |
| `/owen/admin/map` | Mapa del campus |
| `/owen/admin/academic/carreras` | Carreras |
| `/owen/admin/academic/unidades` | Unidades académicas |
| `/owen/admin/academic/docentes` | Docentes |
| `/owen/admin/system/bloques` | Bloques horarios |
| `/owen/admin/requests` | Solicitudes |
| `/owen/admin/observations` | Observaciones |
| `/owen/admin/reports` | Reportes |
| `/owen/admin/settings` | Configuración |

---

## 8. Capturas de Referencia

Las capturas se encuentran en la carpeta `screenshots/` del proyecto:

| # | Archivo | Descripción |
|---|---------|-------------|
| — | `01_public_home.png` | Portal público completo |
| — | `02_busqueda_aula.png` | Búsqueda por sala |
| — | `03_resultados_laboratorio.png` | Resultados vacíos |
| — | `04_tab_por_carrera.png` | Búsqueda por carrera/nivel |
| — | `05_explorar_campus.png` | Vista mapa expandido |
| — | `07_login_page.png` | Formulario de login |
| — | `01_dashboard.png` | Dashboard admin |
| — | `02_horarios.png` | Grilla de horarios |
| — | `04_asistente_horarios.png` | Wizard de horarios |
| — | `05_edificios.png` | Cards de edificios |
| — | `06_salas.png` | Cards de salas |
| — | `07_mapa_admin.png` | Mapa admin |
| — | `08_carreras.png` | Gestión de carreras |
| — | `09_unidades.png` | Unidades académicas |
| — | `10_docentes.png` | Gestión de docentes |
| — | `11_bloques_horarios.png` | Bloques horarios |
| — | `12_solicitudes.png` | Solicitudes |
| — | `13_observaciones.png` | Observaciones |
| — | `14_reportes.png` | Reportes |
| — | `15_configuracion.png` | Configuración |
| — | `17_edificio_crear_form.png` | Formulario crear edificio |
| — | `18_sala_crear_form.png` | Formulario crear sala |
