# Algoritmo de Asignacion de Salas — Sistema Owen

## Contexto

El problema de asignar salas a clases es el **University Course Timetabling Problem (UCTP)**, un problema NP-hard muy estudiado en investigacion operativa. Este documento mapea todas las variables, restricciones y la arquitectura propuesta para resolverlo en PHP puro.

Owen reemplaza a **Darwin**, sistema actual donde la asignacion termina haciendose a mano por deficiencias del software. El objetivo es que Owen resuelva de verdad el problema.

---

## Viabilidad en PHP

La asignacion se ejecuta pocas veces por semestre (inicio de cada temporada). Un solver CP implementado en PHP con backtracking inteligente + poda puede resolver ~500-2000 sesiones en segundos. El cuello de botella nunca sera el computo sino la calidad del modelo.

---

## Niveles de Algoritmos (de menor a mayor sofisticacion)

### Nivel 1: Heuristica Greedy

Ordena las clases por dificultad (las mas restrictivas primero) y asigna la primera sala valida.

- **Ventaja:** Simple, rapido
- **Desventaja:** Se atasca facil, no encuentra solucion optima, no retrocede si se equivoca
- **Calidad:** ~60-70% de ocupacion optima

### Nivel 2: Backtracking con CSP (Constraint Satisfaction Problem)

Modela todo como variables, dominios y restricciones:

| Elemento | Modelado |
|----------|----------|
| **Variable** | Cada sesion a asignar (asignatura + docente + grupo) |
| **Dominio** | Combinaciones posibles de (sala, bloque, dia) |
| **Restricciones** | Conflictos de sala, docente, nivel, bloqueos, feriados |

Usa **propagacion de restricciones** (Arc Consistency) + **backtracking** para podar el espacio de busqueda.

- **Ventaja:** Garantiza encontrar solucion si existe
- **Desventaja:** Puede ser lento con muchas variables, no optimiza (solo satisface)

### Nivel 3: Programacion Lineal Entera (ILP)

Modela con variables binarias:

```
x[sesion, sala, bloque, dia] = {0, 1}
```

**Funcion objetivo** (maximizar):
```
SUM(peso_preferencia * x) - SUM(penalizacion * violaciones_blandas)
```

- **Ventaja:** Encuentra el **optimo matematico demostrable**
- **Desventaja:** Escala mal con miles de variables

### Nivel 4: CP-SAT Solver (recomendado)

Solver hibrido que combina Constraint Programming + SAT solving + busqueda local.

**Ventajas clave:**
1. Maneja restricciones duras y blandas naturalmente
2. Escala bien para campus universitario (~500-2000 sesiones)
3. Multiobjetivo con ponderacion de criterios
4. Soluciones parciales (dice que quedo sin asignar y por que)
5. Tiempo acotado ("mejor solucion en N segundos")
6. Incremental (fija asignaciones existentes, resuelve solo las nuevas)

### Nivel 5: Metaheuristicas (refinamiento)

Para mejorar una solucion existente o espacios demasiado grandes:

| Algoritmo | Uso |
|-----------|-----|
| **Simulated Annealing** | Refinar solucion intercambiando pares de asignaciones |
| **Algoritmo Genetico** | Evolucionar poblaciones de horarios completos |
| **Tabu Search** | Explorar vecindarios prohibiendo movimientos recientes |

Se usan como **complemento** del solver principal, no como reemplazo.

---

## Conceptos Clave del Dominio

Antes de las variables, es fundamental entender como funciona la realidad academica:

### Asignatura vs Sesion

Una **asignatura** (ej: "Fisica I") no es una sola clase. Se descompone en **sesiones**:

- **Sesion teorica:** Clase magistral, todo el nivel junto (ej: 60 alumnos en aula)
- **Sesion practica/laboratorio:** Grupo reducido (ej: 20 alumnos en lab)

Una asignatura con 60 alumnos podria generar:
- 2 sesiones teoricas semanales (60 alumnos, aula grande)
- 3 sesiones practicas semanales (3 grupos de 20, laboratorio)
- = **5 sesiones** a asignar, no 1

### Seccionamiento de grupos

Es lo mas comun: el grupo completo del nivel se **divide en secciones** para las practicas porque los laboratorios son mas pequenos. Quien define los grupos:
- La escuela/direccion de carrera
- O el docente responsable

Owen deberia soportar esto nativamente: dado un nivel de N alumnos y un lab de capacidad M, sugerir automaticamente dividir en ceil(N/M) secciones.

### Docentes multiples por asignatura

Una asignatura puede tener:
- Un **responsable** que dicta la teoria
- Uno o varios **colaboradores** que dictan las practicas/labs
- Cada uno con su propia disponibilidad

### Disponibilidad docente (concepto Darwin)

Los docentes no estan disponibles todo el dia:
- **Parttime:** Horarios acotados, a veces irregulares (lunes si, martes no, miercoles solo manana)
- **Investigadores:** Tienen bloques reservados para investigacion que no se pueden tocar
- **Planta completa:** Mas flexibles pero igualmente con preferencias

La disponibilidad es una **restriccion dura** (no puede = no puede), pero dentro de lo que puede hay **preferencias** (prefiere manana, evita viernes).

### Bloqueos a nivel de carrera/nivel

Los directores/directoras pueden definir:
- "1er ano de Enfermeria no tiene clases los viernes" (dia bloqueado)
- "3er ano de Informatica tiene el bloque 1 del lunes bloqueado todo el semestre" (bloque bloqueado)
- Estos bloqueos son previos a la asignacion y el solver debe respetarlos

### Eventos institucionales que bloquean todo

Hay fechas donde **todas las salas del campus** se usan para otra cosa:
- Elecciones nacionales/regionales
- Evaluacion Nacional de Ingreso Universitario (ex-PSU/PAES)
- Ceremonias institucionales
- Semana de receso

Estas no son feriados — son bloqueos masivos de infraestructura.

### Flujo real post-asignacion

Despues de que el gestor arma los horarios:
1. Los directores/directoras ven el resultado y **solicitan ajustes** de sala
2. Los profesores revisan y **piden cambios** porque no les sirve la sala/horario
3. Esto genera un ciclo de re-asignacion parcial

Owen debe soportar re-ejecucion incremental: fijar lo confirmado y re-resolver solo lo que cambio.

---

## 1. Variables de Decision

La unidad minima ya no es "clase" sino **sesion**:

| Variable | Fuente | Descripcion |
|----------|--------|-------------|
| `asignatura_id` | `asignaturas` | Que se ensena |
| `tipo_sesion` | derivado | Teorica o practica |
| `docente_id` | `docente_asignaturas` | Quien dicta esta sesion (responsable o colaborador) |
| `nivel_id` | `asignaturas.nivel_id` | A que nivel pertenece |
| `seccion` | nuevo | Si es practica, a que subgrupo (A, B, C...) |
| `alumnos_sesion` | derivado | Cantidad de alumnos en esta sesion especifica |
| `bloques_requeridos` | derivado | Cuantos bloques semanales necesita esta sesion |

**Lo que el solver decide para cada sesion:**
- `sala_id` — En que sala
- `bloque_id` — En que franja horaria
- `dia_semana` — Que dia

---

## 2. Restricciones Duras (inviolables)

Si se rompe cualquiera de estas, la solucion es invalida.

### 2.1 Conflictos de espacio

| Restriccion | Tablas involucradas |
|-------------|-------------------|
| **Una sala, un bloque, un dia** -> maximo 1 sesion | `horarios.sala_id + bloque_id + dia_semana` |
| **Sala activa** | `salas.activo = 1` |
| **Sala no bloqueada** por mantenimiento/observacion | `observaciones` con estado `en_proceso` + tipo `mantenimiento` |
| **Sala no bloqueada** por evento institucional | Bloqueos masivos (elecciones, PAES, etc.) |

### 2.2 Conflictos de docente

| Restriccion | Tablas involucradas |
|-------------|-------------------|
| **Un docente, un bloque, un dia** -> maximo 1 sesion | `horarios.docente_id + bloque_id + dia_semana` |
| **Docente activo** | `docentes.activo = 1` |
| **Docente disponible** en ese bloque+dia | `docente_disponibilidad.dia_semana + bloque_id` |
| **Parttime/Investigador:** respetar bloques NO disponibles estrictamente | Es restriccion dura, no blanda |

### 2.3 Conflictos de nivel/seccion (grupo de alumnos)

| Restriccion | Detalle |
|-------------|---------|
| **Un nivel, un bloque, un dia** -> maximo 1 sesion teorica | Todo el nivel esta junto |
| **Una seccion, un bloque, un dia** -> maximo 1 sesion | Los alumnos de seccion A no pueden tener 2 labs a la vez |
| Sesiones practicas de distintas secciones del mismo nivel **si** pueden ser simultaneas | Seccion A en Lab-1 y Seccion B en Lab-2 al mismo tiempo, es valido |
| Sesion practica de seccion A **no** puede chocar con teorica del nivel completo | Los de seccion A tambien van a la teorica |

### 2.4 Capacidad y tipo de sala

| Restriccion | Detalle |
|-------------|---------|
| `sala.capacidad >= alumnos_sesion` | No los del nivel completo sino los de esta sesion |
| Sesion practica -> sala tipo `laboratorio` o `taller` | `salas.tipo` |
| Sesion teorica -> sala tipo `aula` o `auditorio` | |
| Sala con equipamiento requerido | Si la asignatura necesita computadores, solo salas con computadores |
| Tipo de mobiliario adecuado | `salas.tipo_mobiliario` vs necesidades |

### 2.5 Gestion de sala

| Restriccion | Tablas involucradas |
|-------------|-------------------|
| Sala `tipo_gestion = 'carrera'` -> solo asignaturas de esa carrera | `salas.gestion_carrera_id` vs `asignaturas.carrera_id` |
| Sala `tipo_gestion = 'unidad'` -> solo docentes de esa unidad | `salas.gestion_unidad_id` vs `docentes.unidad_id` |
| Sala `tipo_gestion = 'central'` -> cualquiera puede usarla | |

### 2.6 Temporalidad

| Restriccion | Detalle |
|-------------|---------|
| No asignar en **feriados** | `feriados.fecha` (nacionales, regionales, institucionales) |
| No asignar en **eventos institucionales** | Elecciones, PAES, ceremonias — bloquean todas las salas |
| No asignar en **semanas sin clases** | Recesos, semanas de examenes si aplica |
| Respetar **temporada activa** | `temporadas.fecha_inicio/fecha_fin` |
| Asignatura solo en semestre correspondiente | `niveles.semestre` vs `temporadas.tipo` |
| **Semana inicio/duracion** de la asignatura | `asignaturas.semana_inicio + duracion_semanas` |

### 2.7 Bloqueos de nivel/carrera

| Restriccion | Detalle |
|-------------|---------|
| **Dia bloqueado por nivel** | "1er ano Enfermeria no tiene clases los viernes" |
| **Bloque bloqueado por nivel** | "3er ano Informatica: bloque 1 lunes bloqueado todo el semestre" |
| Estos los define la direccion de carrera **antes** de la asignacion | |

### 2.8 Recurrencia

| Restriccion | Detalle |
|-------------|---------|
| `semanal` -> mismo bloque todas las semanas | |
| `quincenal` -> respetar par/impar | `horarios.semana_par_impar` |
| Quincenal: misma sala+bloque -> 2 sesiones distintas pueden alternar | |

### 2.9 Bloques horarios

| Restriccion | Detalle |
|-------------|---------|
| Solo bloques **activos** del sistema seleccionado | `bloques_horarios.activo + sistema_bloque_id` |
| Bloque pertenece al dia correcto | `bloques_horarios.dia_semana` |

---

## 3. Restricciones Blandas (deseables)

Penalizan si se violan pero no invalidan la solucion. El solver intenta maximizar el cumplimiento.

### 3.1 Calidad pedagogica (peso alto ~500)

| Restriccion | Razon |
|-------------|-------|
| No mas de 2 bloques consecutivos de la misma asignatura | Fatiga cognitiva |
| Horas teoricas preferiblemente en la manana | Mejor atencion |
| Horas practicas pueden ser tarde | Menos dependencia de atencion |
| Distribucion pareja de clases en la semana por nivel | Evitar lunes con 8 horas y viernes vacio |
| No dejar "huecos" entre clases del mismo nivel | Los alumnos esperan sin hacer nada |
| Sesion teorica antes que la practica en la semana | Logica pedagogica |

### 3.2 Preferencias de docente (peso medio ~200)

| Restriccion | Detalle |
|-------------|---------|
| Asignar en bloques donde el docente **prefiere** (no solo puede) | Diferenciar "puede" de "prefiere" |
| Minimizar cambios de edificio entre sesiones consecutivas del docente | Distancia entre edificios |
| Carga diaria equilibrada del docente | No 6 bloques seguidos |
| Parttime: concentrar sesiones en pocos dias si es posible | Reducir desplazamientos |

### 3.3 Eficiencia de infraestructura (peso medio ~150)

| Restriccion | Razon |
|-------------|-------|
| No asignar auditorio de 200 para sesion de 15 | Desperdicio de capacidad |
| Preferir sala con **equipamiento adecuado** | `salas.equipamiento` vs necesidades |
| Preferir sala con **mobiliario adecuado** | `salas.tipo_mobiliario` |
| Minimizar salas vacias en horarios punta | Maximizar uso |

### 3.4 Logistica de campus y distancias (peso ALTO ~800)

**Contexto critico:** El campus de Puerto Montt tiene edificios hasta 40 minutos de distancia entre si. Los bloques tienen ~10 minutos de margen entre ellos. Ademas llueve constantemente, lo que obliga a estudiantes a tomar transporte publico (gasto extra) y llegan mojados a la clase siguiente. Esto no es un "nice to have", es una restriccion casi dura.

| Restriccion | Razon | Peso sugerido |
|-------------|-------|---------------|
| Sesiones consecutivas del mismo nivel -> **mismo edificio** | Imposible llegar a otro en 10 min | 800 |
| Si no es mismo edificio -> que sea adyacente (< 5 min caminando) | Margen minimo realista | 600 |
| **PROHIBIR** edificios a > 15 min en bloques consecutivos del mismo nivel | Fisicamente imposible, deberia ser DURA | Infinito |
| Sesiones consecutivas del mismo docente -> mismo edificio | El docente tambien se moja | 400 |
| Concentrar el dia completo de un nivel en maximo 2 edificios | Reducir traslados totales | 300 |
| Preferir pisos bajos para grupos grandes | Evacuacion, accesibilidad | 50 |

**Nota sobre distancias:** Las coordenadas ya existen en `edificios.lat/lng`. Se puede calcular la distancia real caminando o usar una matriz de tiempos predefinida por el gestor (mas precisa porque considera rutas reales, pendientes, techado vs intemperie).

### 3.5 Seccionamiento optimo (peso medio ~200)

| Restriccion | Razon |
|-------------|-------|
| Secciones de practica del mismo nivel en bloques cercanos o paralelos | Facilita coordinacion |
| Equilibrar tamano de secciones | No 30 en una y 10 en otra |
| Misma sala para todas las secciones de una asignatura si es posible | Consistencia de equipamiento |

---

## 4. Generacion Automatica de Sesiones (feature nueva)

Owen deberia poder tomar una asignatura y generar automaticamente las sesiones necesarias:

### Entrada

```
Asignatura: Fisica I
Nivel: 2do Ingenieria Civil (58 alumnos)
Horas teoria: 3 bloques/semana
Horas practica: 2 bloques/semana
Docente responsable (teoria): Dr. Perez
Docentes lab: Prof. Lopez, Prof. Soto
```

### Logica de seccionamiento

```
1. Sesiones teoricas:
   - 3 bloques/semana con 58 alumnos
   - Necesita sala tipo aula con capacidad >= 58
   - Docente: Dr. Perez

2. Sesiones practicas:
   - Labs disponibles: capacidad 20-25
   - 58 alumnos / 20 capacidad = 3 secciones (A, B, C)
   - 2 bloques/semana POR SECCION
   - = 6 sesiones practicas a asignar
   - Docentes: distribuir entre Lopez y Soto

3. Total sesiones a asignar: 3 + 6 = 9
```

### Salida

| Sesion | Tipo | Alumnos | Docente | Sala requerida |
|--------|------|---------|---------|----------------|
| FIS1-T1 | teorica | 58 | Perez | aula >= 58 |
| FIS1-T2 | teorica | 58 | Perez | aula >= 58 |
| FIS1-T3 | teorica | 58 | Perez | aula >= 58 |
| FIS1-PA1 | practica | 20 | Lopez | lab >= 20 |
| FIS1-PA2 | practica | 20 | Lopez | lab >= 20 |
| FIS1-PB1 | practica | 19 | Soto | lab >= 19 |
| FIS1-PB2 | practica | 19 | Soto | lab >= 19 |
| FIS1-PC1 | practica | 19 | Lopez | lab >= 19 |
| FIS1-PC2 | practica | 19 | Lopez | lab >= 19 |

---

## 5. Datos Faltantes en el Esquema Actual

Para soportar todo lo anterior, el esquema necesita:

### Nuevas tablas

| Tabla | Proposito |
|-------|----------|
| `sesiones` | Descompone asignatura en sesiones (tipo, seccion, docente, alumnos) |
| `secciones` | Define subgrupos de un nivel (A, B, C) con alumnos asignados |
| `bloqueos_nivel` | Dias/bloques bloqueados por nivel para todo el semestre |
| `bloqueos_institucionales` | Eventos que bloquean todas las salas (elecciones, PAES) |
| `bloqueos_sala` | Bloqueos temporales por mantenimiento con fecha inicio/fin |
| `distancias_edificios` | Tiempo real de traslado entre pares de edificios (minutos). Definida por gestor o calculada por lat/lng. Debe considerar rutas reales, pendientes, y si hay techo o no (Puerto Montt llueve mucho). |

### Campos nuevos en tablas existentes

| Tabla | Campo | Proposito |
|-------|-------|----------|
| `niveles` | `alumnos_estimados` | Cantidad de alumnos para calcular secciones |
| `asignaturas` | `equipamiento_requerido` (JSON) | Que necesita la asignatura (proyector, computadores, etc.) |
| `asignaturas` | `requiere_laboratorio` (boolean) | Si las practicas necesitan lab especifico |
| `docente_disponibilidad` | `preferencia` (1-5) | Diferenciar "puede" de "prefiere" |
| `docente_disponibilidad` | `temporada_id` | La disponibilidad cambia por semestre |

---

## 6. Flujo Completo de Asignacion

```
FASE 0: CONFIGURACION PREVIA
  |-- Direcciones definen bloqueos de nivel (dias, bloques)
  |-- Gestor registra eventos institucionales (elecciones, PAES)
  |-- Gestor registra bloqueos de sala (mantenimiento)
  |-- Gestor configura feriados del semestre
  |
FASE 1: RECOLECCION DE DATOS
  |-- Gestor activa temporada, asigna carreras/niveles/asignaturas
  |-- Docentes ingresan disponibilidad con preferencias
  |-- Direcciones confirman alumnos estimados por nivel
  |-- Direcciones o docentes definen seccionamiento de practicas
  |   (o el sistema lo sugiere automaticamente)
  |
FASE 2: GENERACION DE SESIONES
  |-- Por cada asignatura:
  |   |-- Generar sesiones teoricas (nivel completo)
  |   |-- Calcular secciones necesarias para practicas
  |   |-- Generar sesiones practicas por seccion
  |   |-- Asignar docentes a cada sesion
  |-- Resultado: lista completa de sesiones a asignar
  |
FASE 3: PREPROCESAMIENTO
  |-- Calcular dominio posible por sesion (salas x bloques x dias validos)
  |-- Aplicar restricciones duras para podar combinaciones imposibles
  |-- Ordenar por dificultad (MRV: la sesion con menos opciones primero)
  |-- Identificar sesiones imposibles antes de ejecutar el solver
  |
FASE 4: SOLVER CP (PHP)
  |-- Backtracking + Arc Consistency
  |-- Restricciones duras como filtros absolutos
  |-- Restricciones blandas como score a maximizar
  |-- Busqueda con poda (Branch & Bound)
  |-- Tiempo limite configurable
  |
FASE 5: POST-SOLVER
  |-- Verificar solucion (doble check de conflictos)
  |-- Calcular score de calidad global
  |-- Listar sesiones no asignadas + razon especifica
  |-- Sugerir alternativas para las no asignadas
  |
FASE 6: REVISION HUMANA
  |-- Gestor ve propuesta completa en grilla visual
  |-- Puede ajustar manualmente (drag & drop)
  |-- Confirma -> se escriben en tabla `horarios`
  |-- Rechaza -> ajusta parametros -> re-run
  |
FASE 7: AJUSTES POST-PUBLICACION
  |-- Directores/directoras revisan y solicitan cambios de sala
  |-- Profesores revisan y piden cambios de horario/sala
  |-- Sistema re-ejecuta solver INCREMENTAL:
  |   |-- Fija sesiones confirmadas
  |   |-- Re-resuelve solo las que cambiaron
  |   |-- Muestra impacto del cambio en otras sesiones
```

---

## 7. ML con Datos Historicos

Con los datos acumulados en `horarios` de temporadas pasadas se pueden extraer patrones:

| Patron | Uso |
|--------|-----|
| "Fisica I siempre quedo en Lab-301 los lunes" | Preferencia implicita |
| "El docente X funciono mejor con clases en la manana" | Si se integran evaluaciones |
| "Lab-1 siempre se solicita para Quimica" | Prioridad historica |
| "1er ano siempre tuvo huecos los miercoles" | Problema recurrente a evitar |
| "Los profesores parttime del area X siempre pidieron cambio" | Patron de conflicto |

**ML es un refinamiento del peso de las restricciones blandas**, no reemplaza al solver:

```
Datos historicos --> ML ajusta pesos de restricciones blandas
                 --> Solver usa esos pesos para optimizar
                 --> Resultado mejor que con pesos fijos
```

---

## 8. Ponderacion de Criterios para el Solver

```
RESTRICCIONES DURAS (inviolables, peso infinito):
  - Conflicto de sala (1 sala, 1 bloque = 1 sesion)
  - Conflicto de docente
  - Conflicto de nivel/seccion
  - Disponibilidad docente (no puede = no puede)
  - Capacidad de sala
  - Tipo de sala
  - Gestion de sala
  - Feriados y eventos institucionales
  - Bloqueos de nivel/carrera
  - Bloqueos de sala

RESTRICCIONES SEMI-DURAS (violar solo como ultimo recurso):
  Peso 5000: Edificios a >15 min en bloques consecutivos del mismo nivel
             (fisicamente imposible llegar, deberia ser dura en la practica)

RESTRICCIONES BLANDAS (ponderadas):
  Peso 1000: Respetar preferencias fuertes de disponibilidad docente
  Peso 800:  Sesiones consecutivas mismo nivel -> mismo edificio o adyacente
  Peso 500:  Calidad pedagogica (distribucion, sin huecos)
  Peso 400:  Sesiones consecutivas mismo docente -> mismo edificio
  Peso 300:  Concentrar dia completo de nivel en max 2 edificios
  Peso 200:  Seccionamiento optimo (secciones equilibradas, paralelas)
  Peso 200:  Preferencias suaves de docente (manana/tarde)
  Peso 150:  Eficiencia de sala (capacidad justa, equipamiento match)
  Peso 100:  Minimizar huecos entre clases del mismo nivel
  Peso 50:   Pisos bajos para grupos grandes
  Peso 10:   Preferencias esteticas (horarios "bonitos")
```

---

## 9. Magnitudes Estimadas

| Concepto | Cantidad tipica (campus mediano) |
|----------|--------------------------------|
| Carreras | 10-30 |
| Niveles por carrera | 4-5 |
| Asignaturas por nivel | 5-8 |
| Total asignaturas | 200-800 |
| **Sesiones por asignatura** | **2-9 (con secciones)** |
| **Total sesiones a asignar** | **1000-5000** |
| Bloques por dia | 8-12 |
| Dias lectivos | 5-6 |
| Salas | 50-150 |
| Docentes | 100-400 |
| Dominio por sesion | ~50-500 combinaciones |
| Espacio total | Enorme, pero la poda lo hace manejable |

---

## 10. Estado del Arte y Lecciones del Mundo Real

### Competiciones Internacionales de Timetabling (ITC)

Las ITC son competiciones academicas donde investigadores resuelven instancias reales de timetabling. Definen que restricciones importan y que algoritmos funcionan de verdad.

**ITC 2007** — Tres tracks:
- Exam timetabling, Post-Enrollment CTT, Curriculum-Based CTT
- **Ganador:** Tomas Muller (creador de UniTime) con busqueda local + constraint programming
- Tambien destacaron Di Gaspero y Schaerf con busqueda por vecindario variable

**ITC 2019** — La mas realista hasta la fecha:
- 30 instancias de datos reales de universidades
- Incluyo restricciones de viaje entre edificios (como nuestro caso)
- **1er lugar:** Simulated Annealing + vecindarios multiples (Schaerf/Di Gaspero, Udine)
- **2do lugar:** ILP con CPLEX
- **3er lugar:** CP-SAT de Google OR-Tools
- **Hallazgo clave:** Metaheuristicas bien afinadas siguen siendo competitivas con metodos exactos en instancias grandes

### Que algoritmo funciona mejor segun tamano

| Enfoque | <100 sesiones | 100-500 | >500 | Implementar en PHP |
|---------|---------------|---------|------|-------------------|
| ILP (CPLEX/Gurobi) | Optimo | Bueno | Malo | No (requiere solver externo) |
| CP-SAT (OR-Tools) | Optimo | Muy bueno | Bueno | No (Python/Java/C++) |
| Simulated Annealing | Muy bueno | Muy bueno | Muy bueno | **Si, viable** |
| Tabu Search | Bueno | Muy bueno | Bueno | **Si, viable** |
| Greedy + busqueda local | Aceptable | Aceptable | Mediocre | **Si, simple** |
| Algoritmo Genetico puro | Mediocre | Mediocre | Malo | Si pero no recomendable |
| Hibrido (Greedy + SA + Branch&Bound) | Muy bueno | Excelente | Bueno | **Si, recomendado para Owen** |

### Sistemas reales desplegados en universidades

**UniTime (el estandar de facto)**
- Usado en Purdue (~30,000 estudiantes, ~8,000 secciones, ~1,200 salas)
- Java + MySQL, open source (LGPL)
- Algoritmo: Iterative Forward Search + busqueda local
- La leccion mas importante de Purdue: **el mayor problema no fue el algoritmo sino la calidad de los datos y la resistencia organizacional**

**FET (Free Evolutionary Timetabling)**
- Muy popular en escuelas y universidades pequenas, especialmente en Latinoamerica
- C++ con Qt (desktop), gratuito
- Algoritmo: heuristica recursiva con swapping + backtracking
- Limitacion: no tiene API web, no maneja bien asignacion optimizada de salas

**Soluciones comerciales:** Scientia/Syllabus Plus (UK/Australia, >200 universidades), CELCAT (Francia), Untis (Alemania), TimeEdit (Suecia)

### Los 10 problemas mas comunes en implementaciones reales

Estos errores se repiten en CADA implementacion documentada:

1. **Datos basura, resultado basura:** El problema #1 siempre. Datos incompletos, incorrectos o desactualizados. Un solver perfecto con datos malos produce basura. Owen debe validar datos antes de ejecutar el solver.

2. **Restricciones fantasma:** "El profesor Garcia no quiere clases los viernes" o "Esa sala se usa para reuniones informales los jueves" — restricciones que nadie documento pero todos conocen. Owen debe dar forma facil de registrar TODAS las restricciones.

3. **Expectativa de perfeccion:** Los usuarios esperan 100% de satisfaccion de preferencias. En un NP-hard siempre hay trade-offs. Owen debe mostrar un **score de calidad** y explicar POR QUE cada sesion quedo donde quedo.

4. **Resistencia organizacional:** Departamentos que no quieren ceder control de "sus" salas. Docentes que exigen horarios especificos. El sistema de gestion de salas (central/carrera/unidad) de Owen ya aborda esto parcialmente.

5. **El horario "final" nunca es final:** Docentes se enferman, salas se inundan, cursos se cancelan. Se necesita re-optimizacion parcial, no resolver todo desde cero. Owen necesita modo incremental.

6. **Caja negra = rechazo:** Si el solver dice "sala X para tu clase" sin explicar por que, los gestores no confian. Owen debe explicar cada decision: "Se asigno Lab-301 porque: capacidad OK (20/25), equipamiento match, mismo edificio que la teorica, docente disponible".

7. **No separar factibilidad de optimizacion:** Muchos sistemas luchan por encontrar ALGUNA solucion valida antes de poder optimizar. El solver debe tener dos fases: primero factible, luego mejorar.

8. **Student sectioning ignorado:** Si una asignatura tiene multiples secciones, asignar estudiantes a secciones para minimizar conflictos es un sub-problema que casi todos ignoran. Owen lo aborda con la generacion automatica de secciones.

9. **Integracion dolorosa:** Conectar con SIS (sistema de informacion estudiantil), ERP, etc. Owen al ser standalone con SQLite evita esto, pero debe tener import/export limpio.

10. **Multi-objetivo mal resuelto:** Usar una suma ponderada de restricciones blandas es simple pero produce resultados no intuitivos. Que vale mas: que un docente no tenga huecos o que los estudiantes no cambien de edificio? Los pesos deben ser configurables por el gestor.

### Asignacion de salas como sub-problema separado

Un hallazgo importante de la literatura: el **Room Assignment Problem (RAP)** es mucho mas tratable que el timetabling completo.

| Aspecto | Timetabling completo | Solo asignacion de salas |
|---------|---------------------|--------------------------|
| Variables | Bloque + Dia + Sala | Solo Sala |
| Complejidad | NP-hard (muy duro) | NP-hard pero mucho mas tratable |
| Tiempo tipico | Minutos a horas | Segundos a minutos |

**Descomposicion en dos fases (enfoque recomendado):**
1. **Fase 1:** Asignar bloques y dias a las sesiones (el problema duro)
2. **Fase 2:** Asignar salas a las sesiones ya ubicadas en tiempo (mucho mas facil)

Esto simplifica enormemente el solver. La fase 2 incluso puede resolverse de forma optima con ILP simple en PHP para instancias medianas.

**Advertencia:** La descomposicion puede perder optimalidad global — una asignacion de horarios que parece buena puede no tener buena asignacion de salas. Pero en la practica funciona bien si en fase 1 se consideran las restricciones de sala como filtro.

### Herramientas open source actuales

| Herramienta | Tipo | Licencia | Lenguaje |
|------------|------|----------|----------|
| UniTime | Sistema completo | LGPL | Java |
| FET | App desktop | GPL | C++ |
| Timefold (ex-OptaPlanner) | Solver con REST API | Apache 2.0 | Java |
| Google OR-Tools CP-SAT | Solver | Apache 2.0 | C++/Python/Java |
| MiniZinc | Lenguaje de modelado | MPL 2.0 | C++ |
| HiGHS | Solver LP/MIP | MIT | C++ |

### ML en timetabling (estado real 2025)

Lo que funciona:
- ML para **ajustar parametros** del solver (pesos de restricciones blandas)
- ML para **predecir patrones** de conflicto basados en historico
- ML para **clasificar solicitudes** (la integracion con Claude API que Owen ya planea)

Lo que NO funciona (aun):
- ML para **resolver** el problema directamente (no reemplaza al solver)
- Reinforcement Learning para timetabling (prometedor en papers, no en produccion)
- Quantum computing (completamente impracticable para tamanos reales)

### Arquitectura: Owen Solver — App Tauri (Rust + React)

**Decision final: Aplicacion de escritorio Tauri con solver Rust + HiGHS**

El solver es una app de escritorio que el gestor descarga e instala. Tiene interfaz grafica profesional (React + Tailwind, misma tecnologia que Owen web) y se conecta a Owen via API.

No se usa OR-Tools. En su lugar se usa **HiGHS** (solver MIP/LP, MIT, con bindings nativos para Rust via crate `highs`). Competitivo con CPLEX/Gurobi en benchmarks recientes, compila junto con la app, sin sidecars ni binarios externos.

**Por que Tauri y no Electron:**
- Tauri: binario ~15MB, usa webview nativo del OS
- Electron: binario ~150MB, empaqueta Chromium entero
- Tauri: backend en Rust (donde vive el solver)
- Electron: backend en Node.js (tendria que llamar a otro proceso)

**Por que HiGHS y no OR-Tools:**
- OR-Tools no tiene bindings Rust oficiales
- Como sidecar pesaria ~50MB y habria que compilar para cada OS
- HiGHS tiene crate Rust nativo (`highs`), compila junto con la app
- Para la fase de asignacion de salas (ILP), HiGHS es optimo
- Licencia MIT vs OR-Tools Apache 2.0 (ambas permisivas)

**Por que Simulated Annealing propio y no todo ILP:**
- SA gano ITC 2019 (la competicion mas realista) para timetabling completo
- ILP escala mal para >500 sesiones en fase 1 (asignacion de horarios)
- SA escala linealmente y produce muy buenos resultados en segundos
- HiGHS se reserva para fase 2 (asignacion de salas) donde ILP brilla

---

### Estructura del proyecto Owen Solver

El solver es un **servicio local headless**. No tiene UI propia — toda la interaccion
es desde Owen web en el navegador. Tauri solo levanta un servidor HTTP local que
Owen web consume.

```
owen-solver/
├── src-tauri/                    # Servicio Rust (headless)
│   ├── src/
│   │   ├── main.rs              # Entry point Tauri (system tray, sin ventana)
│   │   ├── server.rs            # HTTP server local (localhost:9377)
│   │   ├── api/                 # Conexion con Owen remoto
│   │   │   ├── client.rs        # HTTP client (reqwest)
│   │   │   ├── auth.rs          # Login, tokens
│   │   │   └── sync.rs          # Descargar datos, subir resultados
│   │   ├── model/               # Modelo del problema
│   │   │   ├── session.rs       # Sesion (unidad minima)
│   │   │   ├── room.rs          # Sala con tipo, capacidad, gestion
│   │   │   ├── teacher.rs       # Docente con disponibilidad
│   │   │   ├── block.rs         # Bloque horario
│   │   │   ├── constraint.rs    # Restricciones duras y blandas
│   │   │   └── solution.rs      # Solucion (asignaciones + score)
│   │   ├── solver/              # Motor de resolucion
│   │   │   ├── preprocess.rs    # Poda de dominios, MRV
│   │   │   ├── greedy.rs        # Fase 1a: solucion inicial
│   │   │   ├── sa.rs            # Fase 1b: Simulated Annealing
│   │   │   ├── room_assign.rs   # Fase 2: ILP con HiGHS
│   │   │   ├── verify.rs        # Fase 3: verificacion
│   │   │   └── explain.rs       # Fase 3: explicabilidad
│   │   └── routes.rs            # Endpoints HTTP locales
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                          # UI minima Tauri (solo system tray)
│   └── main.tsx                  # Solo muestra estado en tray icon
│
└── package.json
```

### Motor del solver (detalle tecnico)

```
FASE 1a — Greedy constructivo (Rust puro)
  ├── Cargar datos del problema (sesiones, salas, docentes, bloques, restricciones)
  ├── Preprocesamiento:
  │   ├── Calcular dominio posible por sesion (combinaciones sala x bloque x dia)
  │   ├── Podar combinaciones que violan restricciones duras
  │   ├── Calcular matriz de distancias entre edificios (lat/lng o tabla manual)
  │   └── Ordenar sesiones por MRV (Minimum Remaining Values: menos opciones primero)
  ├── Asignar iterativamente:
  │   ├── Tomar sesion con menor dominio
  │   ├── Elegir mejor combinacion (bloque, dia) segun score de blandas
  │   ├── Marcar conflictos en sesiones relacionadas (mismo docente, nivel, seccion)
  │   └── Si no hay opcion valida → marcar como "no asignable" con razon
  └── Resultado: solucion factible inicial (sin salas, solo horarios)

FASE 1b — Simulated Annealing (Rust puro)
  ├── Partir de solucion greedy
  ├── Vecindarios de movimiento:
  │   ├── SWAP_BLOCK: intercambiar bloques de 2 sesiones del mismo dia
  │   ├── MOVE_SESSION: mover sesion a otro bloque/dia libre
  │   ├── SWAP_DAY: intercambiar dias completos de 2 sesiones
  │   └── CHAIN_SWAP: mover sesion A al lugar de B, B al de C, C al de A
  ├── Funcion de costo:
  │   ├── Suma ponderada de violaciones de restricciones blandas
  │   ├── Pesos configurables desde la UI
  │   └── Penalizacion infinita si se viola restriccion dura (rechazo automatico)
  ├── Temperatura:
  │   ├── Inicial: calibrada automaticamente en los primeros 1000 movimientos
  │   ├── Enfriamiento: geometrico (alpha = 0.9995) o adaptativo
  │   └── Reheating: si no mejora en N iteraciones, subir temperatura
  ├── Criterio de parada:
  │   ├── Tiempo limite (configurable, default 30 seg)
  │   ├── Score objetivo alcanzado
  │   └── Temperatura minima sin mejora
  ├── Paralelismo (rayon):
  │   └── Evaluar multiples vecinos en paralelo en cada iteracion
  └── Resultado: solucion mejorada (horarios optimizados, sin salas aun)

FASE 2 — Asignacion de salas via ILP (Rust + HiGHS)
  ├── Para cada sesion ya ubicada en (bloque, dia):
  │   ├── Variable binaria: y[sesion, sala] = {0, 1}
  │   ├── Restriccion: exactamente 1 sala por sesion
  │   ├── Restriccion: max 1 sesion por sala en cada (bloque, dia)
  │   ├── Restriccion: capacidad sala >= alumnos sesion
  │   ├── Restriccion: tipo sala compatible (lab para practica, aula para teoria)
  │   ├── Restriccion: gestion sala (central/carrera/unidad)
  │   └── Restriccion: sala no bloqueada
  ├── Funcion objetivo (maximizar):
  │   ├── + peso por estabilidad de sala (mismo curso = misma sala toda la semana)
  │   ├── + peso por proximidad de capacidad (no desperdiciar)
  │   ├── + peso por equipamiento match
  │   ├── + peso por mismo edificio que sesiones consecutivas del nivel
  │   ├── + peso por mismo edificio que sesiones consecutivas del docente
  │   └── - penalizacion por distancia entre edificios en bloques consecutivos
  ├── HiGHS resuelve el ILP → solucion optima en segundos
  └── Resultado: solucion completa (horarios + salas)

FASE 3 — Verificacion + explicabilidad (Rust puro)
  ├── Doble check de TODAS las restricciones duras sobre solucion final
  ├── Score de calidad:
  │   ├── Global: 0-100 (promedio ponderado)
  │   ├── Por sesion: 0-100
  │   ├── Por docente: satisfaccion de preferencias
  │   ├── Por nivel: huecos, cambios de edificio, distribucion
  │   └── Por sala: tasa de ocupacion, match de capacidad
  ├── Explicacion por sesion:
  │   ├── "Fisica I - Teoria → Aula A-201 (Lunes B3)"
  │   ├── "  Razon sala: capacidad 60/65, mismo edificio que lab del nivel"
  │   ├── "  Razon horario: docente disponible, nivel sin conflicto, sin huecos"
  │   └── "  Score: 94/100 (penalizacion: -6 por horario tarde)"
  ├── Sesiones no asignadas:
  │   ├── "Quimica II - Lab Seccion C: no hay lab disponible los viernes"
  │   └── "  Sugerencia: mover a jueves B4 (Lab-102 libre, docente disponible)"
  └── Resultado: JSON con solucion + scores + explicaciones
```

### Filosofia: Tauri es servicio, Owen web es la UI

Tauri NO tiene interfaz propia. Es un servicio local que:
- Vive en el system tray (icono de bandeja)
- Levanta un servidor HTTP en `localhost:9377`
- Owen web detecta si el solver esta corriendo y habilita las funciones

Toda la configuracion, ejecucion, revision de resultados y confirmacion
se hace **en Owen web en el navegador**. El gestor nunca sale de Owen.

### Como se comunican Owen web y el solver local

```
Owen web (navegador)                    Owen Solver (Tauri, localhost:9377)
┌────────────────────┐                  ┌────────────────────────┐
│                    │                  │                        │
│  GET /solver/ping  │ ──────────────> │  { status: "ready" }   │
│  (detectar solver) │ <────────────── │                        │
│                    │                  │                        │
│  POST /solver/run  │ ──────────────> │  1. Descarga datos de  │
│  { server_url,     │                  │     Owen API remoto    │
│    token,          │                  │  2. Ejecuta Greedy     │
│    temporada_id,   │                  │  3. Ejecuta SA         │
│    config }        │                  │  4. Ejecuta HiGHS      │
│                    │                  │  5. Verifica            │
│                    │                  │                        │
│  GET /solver/      │ ──────────────> │  { fase: "sa",         │
│     progress       │ <────────────── │    score: 85.1,        │
│  (polling o SSE)   │                  │    progress: 0.72 }    │
│                    │                  │                        │
│  GET /solver/      │ ──────────────> │  { resultado completo  │
│     result         │ <────────────── │    con asignaciones,   │
│                    │                  │    scores,             │
│                    │                  │    explicaciones }     │
│                    │                  │                        │
│  POST /solver/     │ ──────────────> │  Sube resultado a      │
│     push           │ <────────────── │  Owen API remoto       │
│                    │                  │                        │
└────────────────────┘                  └────────────────────────┘
```

### Endpoints del solver local (localhost:9377)

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/ping` | GET | Devuelve status. Owen web lo usa para detectar si el solver esta instalado |
| `/run` | POST | Inicia ejecucion. Recibe: server_url, token, temporada_id, config de pesos |
| `/progress` | GET/SSE | Progreso en tiempo real (fase actual, score, % completado) |
| `/result` | GET | Resultado completo del ultimo run |
| `/push` | POST | El solver sube el resultado a Owen remoto via API |
| `/cancel` | POST | Cancela ejecucion en curso |
| `/history` | GET | Historial de ejecuciones anteriores |

### Flujo del usuario (todo en Owen web)

```
1. INSTALAR (una vez)
   ├── Gestor va a Owen web → Configuracion → "Herramientas"
   ├── Ve boton "Descargar Owen Solver" con instrucciones
   ├── Descarga instalador (~15MB): .msi (Win), .dmg (Mac), .AppImage (Linux)
   ├── Instala → aparece icono en system tray
   └── El solver queda corriendo como servicio en localhost:9377

2. OWEN WEB DETECTA EL SOLVER
   ├── Owen web hace ping a localhost:9377/ping al cargar
   ├── Si responde → muestra indicador verde "Solver conectado"
   │   y habilita el boton "Generar horarios" en la seccion de horarios
   ├── Si no responde → muestra "Solver no detectado"
   │   con link a descarga y ayuda
   └── El ping se repite cada 30 segundos

3. CONFIGURAR (en Owen web)
   ├── Gestor va a Horarios → "Generacion automatica"
   ├── Ve panel de configuracion:
   │   ├── Sliders para pesos de restricciones blandas
   │   ├── Presets: "Priorizar docentes" / "Priorizar alumnos" / "Equilibrado"
   │   ├── Tiempo maximo (30s / 1min / 5min)
   │   └── Opciones: fijar sesiones existentes, excluir carreras
   └── Todo se guarda en Owen web (no en el solver)

4. EJECUTAR (desde Owen web)
   ├── Gestor presiona "Generar horarios"
   ├── Owen web envia POST a localhost:9377/run con:
   │   ├── URL del servidor Owen + token de autenticacion
   │   ├── temporada_id
   │   └── Configuracion de pesos y opciones
   ├── El solver:
   │   ├── Descarga datos del servidor Owen via API
   │   ├── Ejecuta el motor (Greedy → SA → HiGHS → Verificacion)
   │   └── Reporta progreso via SSE o polling
   ├── Owen web muestra progreso en tiempo real:
   │   ├── Barra de progreso animada
   │   ├── "Preprocesando... 1,247 sesiones"
   │   ├── "Construyendo solucion inicial... 94.6% asignadas"
   │   ├── "Optimizando... Score: 72 → 85 → 91"
   │   ├── "Asignando salas... optimo encontrado"
   │   └── "Verificando... 0 conflictos"
   └── Tiempo total: ~30-60 segundos

5. REVISAR (en Owen web)
   ├── Owen web obtiene resultado de localhost:9377/result
   ├── Muestra en la grilla de horarios existente de Owen:
   │   ├── Asignaciones propuestas con colores por score
   │   ├── Verde (>85), amarillo (70-85), rojo (<70)
   │   ├── Click en sesion → panel con explicacion detallada
   │   ├── Panel de sesiones no asignadas + sugerencias
   │   └── Estadisticas: ocupacion, huecos, cambios edificio
   └── El gestor puede ajustar manualmente en la grilla

6. CONFIRMAR (en Owen web)
   ├── Gestor revisa y presiona "Aplicar propuesta"
   ├── Owen web puede:
   │   ├── Opcion A: pedir al solver que suba via POST /solver/push
   │   └── Opcion B: tomar el resultado y escribir directamente en BD
   ├── Se escriben los horarios en la tabla `horarios`
   └── El gestor ve el horario final publicado

MODO OFFLINE:
   ├── Owen web ofrece "Exportar datos para solver" (descarga JSON)
   ├── Gestor ejecuta solver con: owen-solver --import datos.json
   │   (el solver tambien funciona como CLI sin Tauri)
   ├── Genera resultado.json
   └── Gestor sube resultado.json en Owen web → "Importar propuesta"
```

### Ventajas de este enfoque

1. **Cero duplicacion de UI** — No hay que mantener 2 interfaces
2. **El gestor no sale del navegador** — Flujo natural
3. **Reutiliza componentes Owen** — La grilla, filtros, paneles ya existen
4. **El solver es reemplazable** — Si manana sale un solver mejor, solo cambia el binario
5. **Funciona offline** — Modo CLI como fallback
6. **CORS simple** — localhost:9377 con headers Access-Control para el dominio de Owen

### Endpoints API que Owen web necesita agregar

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/solver-export.php` | GET | Exporta todos los datos de una temporada como JSON estructurado |
| `/api/solver-import.php` | POST | Recibe resultado del solver y lo almacena como propuesta |
| `/api/solver-status.php` | GET | Estado de la ultima propuesta (pendiente/confirmada/rechazada) |
| `/api/solver-confirm.php` | POST | Gestor confirma propuesta → escribe en tabla `horarios` |
| `/api/distancias.php` | GET/POST | CRUD de distancias entre edificios |
| `/api/bloqueos-nivel.php` | GET/POST | CRUD de bloqueos de nivel (dias/bloques) |
| `/api/bloqueos-institucionales.php` | GET/POST | CRUD de eventos que bloquean todo el campus |

### Formato JSON de intercambio solver <-> Owen

```json
{
  "version": "1.0",
  "temporada_id": "2026-1",
  "generated_at": "2026-03-29T14:30:00Z",
  "solver_config": {
    "tiempo_max_seg": 30,
    "pesos": {
      "disponibilidad_docente": 1000,
      "distancia_edificios": 800,
      "calidad_pedagogica": 500,
      "eficiencia_sala": 150
    }
  },
  "resultado": {
    "score_global": 89.4,
    "sesiones_asignadas": 1180,
    "sesiones_total": 1247,
    "asignaciones": [
      {
        "sesion_id": "FIS1-T1",
        "asignatura_id": "fis1",
        "tipo_sesion": "teorica",
        "docente_id": "doc-perez",
        "nivel_id": "ing-civil-2",
        "seccion": null,
        "sala_id": "aula-a201",
        "bloque_id": "b3",
        "dia_semana": 1,
        "score": 94,
        "explicacion": "Capacidad 60/65, mismo edificio que lab, docente disponible",
        "penalizaciones": [
          {"tipo": "horario_tarde", "peso": -6, "detalle": "Bloque 3 es despues de almuerzo"}
        ]
      }
    ],
    "no_asignadas": [
      {
        "sesion_id": "QUI2-PC3",
        "razon": "No hay laboratorio disponible los viernes B4-B5",
        "sugerencias": [
          {"bloque_id": "b4", "dia_semana": 4, "sala_id": "lab-102", "score": 82}
        ]
      }
    ],
    "estadisticas": {
      "ocupacion_salas_promedio": 0.73,
      "huecos_por_nivel_promedio": 0.4,
      "cambios_edificio_nivel": 12,
      "satisfaccion_docente_promedio": 0.88
    }
  }
}
```

### UI minima en Tauri

Tauri es principalmente un servicio headless, pero tiene una **ventana minima** para:
- Login bonito (conectar con servidor Owen, guardar credenciales)
- Vista resumen de resultados (score global, sesiones asignadas/fallidas)
- Boton aceptar/rechazar propuesta
- Boton enviar al servidor

NO replica la grilla de horarios ni los paneles de detalle — eso es Owen web.
Es una ventana de control tipo "panel de mision", no una app completa.

### Dependencias del proyecto Tauri

**Rust (Cargo.toml):**
- `tauri` — framework (system tray + ventana minima + servidor local)
- `axum` o `actix-web` — HTTP server local (localhost:9377)
- `serde` + `serde_json` — serializacion
- `reqwest` — HTTP client para API de Owen remoto
- `highs` — solver ILP para asignacion de salas
- `rand` — generador aleatorio para SA
- `rayon` — paralelismo multi-core
- `chrono` — manejo de fechas (feriados, temporadas)
- `tokio` — async runtime (requerido por tauri + reqwest + axum)
- `tower-http` — CORS middleware para el servidor local

---

## 11. Sistema de Versionado de Horarios (concepto Git)

El proceso de crear un horario no es lineal: se genera una propuesta, los directores
piden cambios, los profes piden cambios, se re-ejecuta el solver parcialmente, se
ajusta a mano, se compara con alternativas. Esto es exactamente el problema que
Git resuelve para codigo.

Owen implementa un sistema de versionado inspirado en Git para horarios.

### Conceptos

```
BRANCH = una linea de trabajo sobre el horario de una temporada
  Cada branch es una propuesta independiente que puede evolucionar
  sin afectar a las demas.

COMMIT = un snapshot del estado del horario en un momento dado
  Cada cambio (manual, del solver, de una solicitud aprobada) genera
  un commit con: que cambio, quien lo cambio, por que, cuando.

DIFF = la diferencia entre dos commits o entre dos branches
  Muestra sesiones agregadas, eliminadas, movidas. Permite ver
  el impacto exacto de un cambio antes de aplicarlo.

MERGE = aplicar los cambios de un branch al horario oficial
  Equivale a "publicar" una propuesta. Detecta conflictos si
  otra propuesta ya modifico las mismas sesiones.

TAG = marcar un commit como version oficial
  "horario-publicado-2026-1-v3" — el que esta vigente ahora.
```

### Modelo de datos

```sql
-- Un branch es una linea de trabajo
CREATE TABLE horario_branches (
  id TEXT PRIMARY KEY,
  temporada_id TEXT NOT NULL,
  nombre TEXT NOT NULL,              -- "propuesta-inicial", "ajuste-enfermeria"
  descripcion TEXT,
  es_principal INTEGER DEFAULT 0,    -- el branch "main" del horario
  branch_padre_id TEXT,              -- de que branch se creo (fork)
  commit_padre_id TEXT,              -- de que commit se bifurco
  estado TEXT DEFAULT 'borrador'
    CHECK(estado IN ('borrador', 'revision', 'aprobado', 'publicado', 'descartado')),
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (temporada_id) REFERENCES temporadas(id),
  FOREIGN KEY (branch_padre_id) REFERENCES horario_branches(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Un commit es un snapshot con metadatos
CREATE TABLE horario_commits (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  commit_padre_id TEXT,              -- commit anterior (cadena)
  mensaje TEXT NOT NULL,             -- "Generacion solver: 1,180 sesiones, score 89.4"
  tipo TEXT NOT NULL
    CHECK(tipo IN ('solver', 'manual', 'solicitud', 'import', 'merge')),
  autor_id TEXT NOT NULL,
  metadata TEXT,                     -- JSON: config solver, solicitud_id, etc.
  score_global REAL,                 -- score al momento del commit
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES horario_branches(id),
  FOREIGN KEY (commit_padre_id) REFERENCES horario_commits(id),
  FOREIGN KEY (autor_id) REFERENCES users(id)
);

-- Cada commit contiene asignaciones (el snapshot completo)
CREATE TABLE horario_asignaciones (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL,
  sesion_id TEXT NOT NULL,           -- referencia a la sesion
  sala_id TEXT,
  bloque_id TEXT,
  dia_semana INTEGER,
  docente_id TEXT,
  score INTEGER,
  explicacion TEXT,
  FOREIGN KEY (commit_id) REFERENCES horario_commits(id) ON DELETE CASCADE
);

-- Tags marcan versiones oficiales
CREATE TABLE horario_tags (
  id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL,
  nombre TEXT NOT NULL UNIQUE,       -- "publicado-2026-1-v3"
  descripcion TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (commit_id) REFERENCES horario_commits(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Flujo real con versionado

```
SEMESTRE NUEVO
  │
  ├── Gestor crea branch "main" para temporada 2026-1
  │
  ├── Ejecuta solver
  │   └── COMMIT #1 (tipo: solver)
  │       "Generacion inicial: 1,180/1,247 sesiones, score 89.4"
  │       [snapshot completo de 1,180 asignaciones]
  │
  ├── Directora de Enfermeria pide mover Anatomia al martes
  │   └── COMMIT #2 (tipo: manual)
  │       "Mover Anatomia I Teoria de lunes B2 a martes B2 por solicitud Dir. Enfermeria"
  │       DIFF: 1 sesion movida, 0 conflictos nuevos, score 89.1 (bajo -0.3)
  │
  ├── Prof. Lopez dice que no puede los miercoles (no lo habia dicho antes)
  │   ├── Se actualiza disponibilidad docente
  │   ├── Re-ejecutar solver PARCIAL (solo sesiones de Lopez)
  │   └── COMMIT #3 (tipo: solver)
  │       "Re-asignacion parcial: 4 sesiones de Lopez reubicadas"
  │       DIFF: 4 sesiones movidas, score 88.7
  │
  ├── Gestor quiere explorar: "que pasa si Enfermeria no tiene viernes?"
  │   ├── Crea BRANCH "sin-viernes-enfermeria" (fork de commit #3)
  │   ├── Ejecuta solver con restriccion extra
  │   └── COMMIT #1 del branch nuevo (tipo: solver)
  │       "Simulacion: Enfermeria sin viernes, score 82.1"
  │   ├── Gestor compara: DIFF entre branches
  │   │   "23 sesiones movidas, score baja de 88.7 a 82.1, 3 no asignables"
  │   └── Gestor decide: DESCARTA el branch (no vale la pena)
  │
  ├── Todo listo, gestor marca como publicado
  │   └── TAG "publicado-2026-1-v1" en commit #3
  │
  ├── 3 semanas despues: sala Lab-301 cerrada por filtracion de agua
  │   ├── COMMIT #4 (tipo: manual)
  │   │   "Reubicar 6 sesiones de Lab-301 por cierre temporal"
  │   └── TAG "publicado-2026-1-v2" en commit #4
  │
  └── Fin del semestre: el historial completo queda como referencia
      para el proximo semestre y para ML
```

### Operaciones disponibles en Owen web

**Vista de branches:**
- Lista de branches activos de la temporada
- Estado de cada uno (borrador, revision, aprobado, publicado)
- Quien creo cada branch y cuando

**Vista de historial (log):**
- Timeline de commits del branch actual
- Cada commit muestra: mensaje, autor, fecha, score, tipo
- Click en commit → ver el estado del horario en ese punto

**Diff entre commits:**
- Seleccionar 2 commits (o 2 branches) → ver diferencias
- Tabla: sesiones agregadas (+), eliminadas (-), movidas (~)
- Impacto en score: como cambio el puntaje global
- Conflictos: si alguna sesion fue tocada por ambos lados

**Fork (crear branch):**
- Desde cualquier commit, crear un branch nuevo
- Para explorar alternativas sin afectar la propuesta principal
- "Que pasaria si..." sin riesgo

**Merge:**
- Traer cambios de un branch al main
- Detectar conflictos (misma sesion modificada en ambos)
- Resolver conflictos: elegir version A, B, o nueva
- Generar commit de merge con mensaje explicativo

**Rollback:**
- Volver a cualquier commit anterior
- Genera un nuevo commit (no borra historial)
- "Revertir a estado pre-cambio de Lopez"

**Tag (publicar):**
- Marcar un commit como version oficial
- Solo gestores pueden publicar
- El tag activo es el horario que ven los usuarios publicos

### Que se gana con esto

| Problema real | Sin versionado | Con versionado |
|--------------|----------------|----------------|
| "Quien movio Fisica al viernes?" | Nadie sabe | Commit #7: "Juan, 15/03, solicitud Dir. Civil" |
| "El horario de ayer era mejor" | Se perdio | Rollback a commit anterior |
| "Que pasa si sacamos clases el viernes?" | Hay que probar y rezar | Fork → simular → comparar → descartar si no sirve |
| "Cuantos cambios hubo desde que publicamos?" | Contar a mano | Diff entre tag publicado y estado actual |
| "La directora dice que no aprobo ese cambio" | Discusion | Log: commit #12, aprobado por directora@email, 10/03 14:22 |
| "El solver genero algo peor que antes" | No hay como comparar | Diff entre commit del solver nuevo y el anterior |
| Multiples personas ajustando a la vez | Conflictos silenciosos | Branches separados, merge con deteccion de conflictos |
