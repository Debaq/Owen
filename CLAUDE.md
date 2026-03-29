# SISTEMA OWEN - Sistema de Horarios Institucional

Sistema de gestión de horarios de salas, docentes, asignaturas y niveles con mapa interactivo del campus, solicitudes inteligentes y reportes de observaciones vía QR.

**Usuarios:** Gestores, Direcciones de Carrera, Público General
**Ubicación Campus:** Puerto Montt, Chile (`-41.48780, -72.89699`)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Vite + React 19 + TypeScript |
| UI | Tailwind CSS + Shadcn/ui + Lucide React |
| Routing | React Router v6 |
| Formularios | React Hook Form + Zod |
| Mapas | React-Leaflet + OpenStreetMap |
| i18n | i18next (ES/EN) |
| Fechas | date-fns |
| QR | html5-qrcode |
| Backend | PHP 7.4+ vanilla (JSON REST API) |
| DB | SQLite3 con PDO (`backend/db/horarios.sqlite`) |
| Auth | Sesiones PHP con cookies seguras |
| LLM | Claude API para auto-gestión de solicitudes |

---

## Restricción PHP

El servidor corre PHP 7.4. Todo código backend **debe** ser compatible.

- **Prohibido:** `#[Attributes]`, `match`, Named Arguments, Constructor Property Promotion, Union Types, `readonly`, `enums`, `str_contains()`, `array_is_list()`
- **Permitido:** Tipado escalar, `??`, `fn()` (arrow functions), `[]`
- **No usar funciones deprecadas en PHP 8.2:** `utf8_encode`, `${var}` dinámico

---

## Esquema de Base de Datos

Referencia completa en `backend/schema.sql`. Tablas principales:

| Tabla | Propósito |
|-------|----------|
| `users` | Usuarios (gestor/direccion) |
| `unidades_academicas` | Centros, institutos, vicerrectorías |
| `carreras` | Carreras académicas |
| `niveles` | Años/semestres por carrera |
| `asignaturas` | Materias con horas teoría/práctica/autónomas |
| `docentes` | Profesores con RUT, unidad, carreras (JSON) |
| `docente_asignaturas` | Relación docente-asignatura con rol |
| `docente_disponibilidad` | Bloques disponibles por docente |
| `edificios` | Edificios con coordenadas y fotos |
| `salas` | Salas con tipo, capacidad, equipamiento, gestión |
| `areas_comunes` | Baños, pasillos, patios con QR |
| `temporadas` | Semestres par/impar |
| `sistemas_bloques` | Agrupaciones de bloques horarios |
| `bloques_horarios` | Franjas horarias por día y sistema |
| `feriados` | Días no lectivos |
| `horarios` | Tabla central: asigna asignatura+docente+sala+bloque |
| `solicitudes` | Peticiones de sala por direcciones |
| `pois` | Puntos de interés del mapa |

Campos clave de `salas`: `tipo_gestion` (`central`/`carrera`/`unidad`), `gestion_carrera_id`, `gestion_unidad_id`.

Campos clave de `horarios`: `recurrencia` (`semanal`/`quincenal`/`mensual`/`unica`/`anual`), `semana_par_impar`.

---

## Roles y Permisos

### Gestor (`role: 'gestor'`)
CRUD completo de horarios, salas, docentes, asignaturas. Aprueba/rechaza solicitudes. Gestiona observaciones y bloqueos. Si es gestor de carrera, solo ve sus salas.

### Dirección (`role: 'direccion'`)
Ve horarios de su carrera (solo lectura). Crea solicitudes de sala. Libera clases. No edita horarios ni gestiona observaciones.

### Público (sin cuenta)
Ve horarios vía URLs públicas (`/public/room/:id`). Ve mapa. Escanea QR y envía observaciones anónimas.

---

## Endpoints Backend (`backend/api/`)

| Archivo | Métodos | Descripción |
|---------|---------|-------------|
| `auth.php` | POST login/logout, GET me | Autenticación |
| `carreras.php` | GET | Listar carreras |
| `niveles.php` | GET `?carrera_id=X` | Niveles por carrera |
| `asignaturas.php` | GET `?nivel_id=X` | Asignaturas por nivel |
| `docentes.php` | GET `?activo=1` | Docentes activos |
| `docente_asignaturas.php` | GET/POST/DELETE | Relación docente-asignatura |
| `docente_disponibilidad.php` | GET/POST | Disponibilidad docente |
| `edificios.php` | GET | Listar edificios |
| `salas.php` | GET/POST | Salas con filtros |
| `horarios.php` | GET | Horarios enriquecidos |
| `bloques.php` | GET | Bloques horarios |
| `sistemas_bloques.php` | GET | Sistemas de bloques |
| `temporadas.php` | GET `?activa=true` | Temporadas |
| `unidades.php` | GET | Unidades académicas |
| `users.php` | GET/POST | Gestión de usuarios |
| `pois.php` | GET/POST | Puntos de interés del mapa |
| `map-areas.php` | GET | Áreas del mapa |
| `routes.php` | GET | Rutas del campus |
| `upload.php` | POST | Subida de archivos |
| `config.php` | - | Conexión SQLite + CORS + Helpers |

**Pendiente:** PUT/DELETE en la mayoría de endpoints, CRUD solicitudes/observaciones, bloqueos, liberaciones, integración LLM, QR, reportes.

---

## Estructura Frontend

```
src/
├── features/
│   ├── academic/      (9 archivos) — Gestión académica
│   ├── auth/          (6 archivos) — Login, sesión, rutas protegidas
│   ├── buildings/     (7 archivos) — CRUD edificios
│   ├── map/           (14 archivos) — Mapa interactivo Leaflet
│   ├── rooms/         (5 archivos) — CRUD salas
│   ├── schedules/     (5 archivos) — Horarios y grilla
│   ├── settings/      (6 archivos) — Panel configuración
│   ├── public/        (1 archivo) — Vista pública
│   ├── blocks/        — Bloques horarios (vacío)
│   ├── calendar/      — Calendario (vacío)
│   ├── observations/  — Observaciones QR (vacío)
│   ├── public-links/  — Links compartibles (vacío)
│   ├── reports/       — Reportes (vacío)
│   └── requests/      — Solicitudes (vacío)
├── shared/
│   ├── components/ui/ — Componentes Shadcn/ui
│   ├── lib/           — api.ts, i18n.ts, utils.ts
│   ├── types/         — Tipos TypeScript
│   └── hooks/         — Hooks compartidos
├── App.tsx
├── main.tsx
└── router.tsx
```

---

## Flujos Principales

1. **Crear Horario (Gestor):** Temporada → Carrera → Nivel → Asignatura → Docente → Sala disponible → Día + Bloque → Recurrencia → Detectar conflictos → Guardar
2. **Solicitud de Sala (Dirección):** Formulario → LLM analiza disponibilidad → Auto-aprueba (confianza >=80%) o envía a gestor → Gestor aprueba/rechaza/sugiere alternativa
3. **Liberar Sala (Dirección):** Selecciona clase → Cancelar fecha específica o definitivo → Sala queda disponible
4. **Observación vía QR:** Escanea QR → Formulario anónimo → Ticket creado → Gestor gestiona (nuevo → revisión → en_proceso → resuelto → cerrado)
5. **Horario Público:** `/public/room/:id`, `/public/teacher/:id` — Grilla semanal sin login

## Detección de Conflictos

Al crear un horario, verificar: (1) sala ocupada en mismo día+bloque, (2) docente con clase simultánea, (3) nivel con clase simultánea, (4) sala bloqueada por mantenimiento, (5) feriado en la fecha.

---

## Credenciales de Desarrollo

- **Admin:** admin@admin.cl / admin123
- **Vite dev:** `localhost:5173`
- **Backend:** Requiere servidor PHP apuntando a `backend/api/`
