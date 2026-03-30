# Owen - Sistema de Información de Salas

Owen es una plataforma web que muestra la información de las salas de un campus universitario. Permite consultar los horarios de cada sala, buscar horarios de docentes y asignaturas, explorar el campus en un mapa interactivo con puntos de interés y reportar observaciones mediante códigos QR.

Es accesible desde cualquier navegador sin necesidad de instalar aplicaciones.

---

## El problema que resuelve

En un campus universitario, la información sobre las salas esta dispersa: que clase se dicta en cada sala, donde queda cada edificio, quien tiene una sala asignada en un momento dado, como reportar un problema en una dependencia. Esta fragmentación obliga a estudiantes, docentes y administrativos a depender de planillas, carteles físicos y consultas informales.

Owen centraliza toda esta información en un solo lugar accesible por internet: cualquier persona puede ver que esta pasando en cada sala, encontrar espacios en el mapa y reportar problemas con un escaneo de QR.

---

## Quienes lo usan

El sistema contempla tres tipos de usuarios con distintos niveles de acceso:

### Gestores
Son los administradores del sistema. Crean y modifican horarios, gestionan salas, docentes y asignaturas. Aprueban o rechazan solicitudes de espacios. Atienden los reportes de observaciones que llegan desde los códigos QR.

Un gestor de carrera solo puede administrar las salas y horarios que le corresponden.

### Direcciones de Carrera
Pueden consultar los horarios de su carrera en modo lectura. Tienen la capacidad de solicitar salas para actividades especiales y de liberar clases cuando no se van a realizar (por ejemplo, por suspensión o feriado), dejando la sala disponible para otros.

### Publico general
Cualquier persona puede consultar horarios de salas y docentes sin necesidad de crear una cuenta. Tambien pueden ver el mapa del campus y reportar observaciones escaneando codigos QR instalados en las dependencias.

---

## Funcionalidades principales

### Consulta de horarios
Cualquier persona puede consultar el horario semanal de una sala o de un docente sin necesidad de iniciar sesion. Existen enlaces publicos que pueden compartirse libremente o vincularse desde otras paginas institucionales. Tambien es posible buscar horarios por asignatura, carrera o nivel.

### Mapa interactivo del campus
Un mapa visual del campus que muestra edificios, puntos de interes y rutas. Permite ubicar rapidamente donde queda cada sala o dependencia. Funciona con cartografia abierta (OpenStreetMap) y no requiere servicios de pago.

### Administracion de salas
Los gestores registran y mantienen la información de las salas del campus: tipo, capacidad, equipamiento, edificio y tipo de gestion (central, por carrera o por unidad). Las salas de carrera solo son visibles para el gestor correspondiente.

### Reportes por codigo QR
Las salas y areas comunes del campus (banos, pasillos, patios) tienen codigos QR fisicos. Cualquier persona puede escanearlos con su celular para enviar una observacion anonima: un desperfecto, una sugerencia, un problema de limpieza o seguridad.

Cada observacion genera un ticket que sigue un flujo de atencion: nuevo, en revision, en proceso, resuelto y cerrado. Los gestores administran estos tickets desde el sistema.

### Soporte bilingue
La interfaz esta disponible en espanol e ingles, lo que permite su uso por parte de usuarios de distintos idiomas.

### Funcionalidades planificadas a futuro
Las siguientes funcionalidades estan contempladas pero no forman parte del sistema actual:

- **Gestion de horarios:** Creacion y edicion de horarios directamente desde el sistema, con deteccion automatica de conflictos (sala ocupada, docente con clase simultanea, feriados, etc.) y soporte para distintos tipos de recurrencia (semanal, quincenal, mensual, unica, anual).
- **Solicitudes inteligentes de sala:** Formulario para que Direcciones de Carrera soliciten salas, con analisis de disponibilidad asistido por inteligencia artificial y aprobacion automatica o derivacion a gestor.
- **Liberacion de clases:** Posibilidad de que Direcciones de Carrera liberen salas cuando una clase no se va a realizar.

---

## Seguridad y manejo de datos

### Autenticacion y sesiones
El acceso al sistema requiere credenciales (correo y contrasena). Las contrasenas nunca se almacenan en texto plano; se guardan cifradas mediante algoritmos de hash seguros. Al iniciar sesion, el sistema genera una sesion unica que se invalida automaticamente tras 30 minutos de inactividad.

Para prevenir ataques de fuerza bruta, el inicio de sesion esta limitado a 5 intentos por minuto. Si se supera ese limite, los intentos adicionales son rechazados temporalmente.

### Cookies seguras
La sesion del usuario se mantiene mediante cookies configuradas con multiples capas de proteccion:
- **Solo HTTPS:** La cookie solo se transmite por conexiones cifradas, impidiendo su interceptacion en redes no seguras.
- **HttpOnly:** La cookie no es accesible desde codigo JavaScript en el navegador, lo que previene su robo mediante ataques de inyeccion de scripts (XSS).
- **SameSite estricto:** La cookie solo se envia en solicitudes que se originan desde el propio sitio, previniendo ataques de falsificacion de solicitudes (CSRF).

### Control de acceso por roles
Cada usuario tiene un rol asignado (gestor o direccion) que determina exactamente que puede ver y que puede hacer. Las rutas y funciones del sistema verifican el rol antes de permitir cualquier operacion. Un usuario de direccion no puede modificar horarios, y un gestor de carrera no puede ver las salas de otra carrera.

### Proteccion contra ataques comunes
El sistema implementa defensas contra las vulnerabilidades web mas frecuentes:
- **Inyeccion SQL:** Todas las consultas a la base de datos usan sentencias preparadas con parametros, impidiendo que datos maliciosos alteren las consultas.
- **Cross-Site Scripting (XSS):** Los datos ingresados por usuarios se sanitizan antes de mostrarse, evitando la ejecucion de codigo no autorizado.
- **Clickjacking:** Se impide que el sitio sea incrustado en marcos de otras paginas mediante cabeceras de seguridad.
- **CORS restringido:** Solo los origenes autorizados (el dominio de produccion y los entornos de desarrollo) pueden comunicarse con el servidor. Solicitudes desde otros sitios son rechazadas.

### Cabeceras de seguridad HTTP
Cada respuesta del servidor incluye cabeceras que refuerzan la seguridad del navegador:
- Prevencion de interpretacion incorrecta de tipos de archivo
- Bloqueo de incrustacion en iframes externos
- Activacion de filtros anti-XSS del navegador
- Politica de referencia restrictiva que limita la informacion compartida al navegar entre sitios

### Registro de eventos de seguridad
El sistema mantiene un registro mensual de eventos relevantes para la seguridad: inicios de sesion exitosos y fallidos, cierres de sesion y acciones sensibles. Esto permite auditar el uso del sistema y detectar comportamientos anomalos.

### Almacenamiento de datos
Todos los datos se almacenan en una base de datos local dentro del propio servidor, sin depender de servicios externos de almacenamiento. La base de datos tiene habilitadas las restricciones de integridad referencial, lo que garantiza la consistencia de las relaciones entre los datos (por ejemplo, no es posible asignar un horario a una sala que no existe).

### Datos personales
El sistema maneja datos de docentes (nombre, RUT, correo, telefono) y de usuarios administrativos (nombre, correo). Las observaciones enviadas por QR son anonimas y no requieren identificacion. No se recopilan datos personales del publico general que consulta horarios.

---

## Estado del proyecto

Owen es un sistema en desarrollo activo. La consulta publica de horarios, el mapa interactivo, la administracion de salas y la autenticacion estan operativas. Las funcionalidades de reportes por QR, gestion de horarios, solicitudes inteligentes, calendario y generacion de reportes se encuentran en fase de planificacion o construccion.

---

## Owen Solver — Generacion automatica de horarios (beta)

Owen incluye un motor de asignacion automatica de salas y horarios. El problema de asignar sesiones academicas a salas, docentes y bloques horarios respetando multiples restricciones simultaneas es conocido formalmente como **University Course Timetabling Problem (UCTP)**, clasificado como NP-hard en la teoria de complejidad computacional. Esto significa que no existe un algoritmo que garantice encontrar la solucion optima en tiempo razonable para todas las instancias; la cantidad de combinaciones crece exponencialmente con cada variable agregada.

La investigacion academica lleva decadas estudiando este problema. Las International Timetabling Competitions (ITC 2002, 2007, 2011, 2019), organizadas por universidades europeas con instancias de datos reales, han servido como referencia para evaluar algoritmos. Owen basa sus decisiones de diseno en los hallazgos de estas competiciones y en la literatura de optimizacion combinatoria.

### Por que no basta con asignar a mano

Un campus mediano tiene entre 200 y 800 asignaturas, cada una con sesiones teoricas y practicas, docentes con disponibilidad variable, salas con distintos tipos y capacidades, y restricciones que interactuan entre si. Una sola asignatura de 60 alumnos con horas teoricas y de laboratorio puede generar 9 sesiones independientes que deben ubicarse sin conflictos. El espacio total de combinaciones posibles para un semestre tipico supera las 10^15 posibilidades, lo que hace inviable la enumeracion manual o por fuerza bruta.

Los sistemas existentes como Darwin (en uso en la institucion) terminan requiriendo que la asignacion se haga manualmente porque no modelan la complejidad real del problema. UniTime (Purdue University, usado con ~30,000 estudiantes y ~8,000 secciones) documenta que el mayor desafio de implementacion no fue el algoritmo sino la calidad de los datos y la resistencia organizacional. Owen aborda ambos problemas: valida datos antes de optimizar y proporciona explicaciones detalladas de cada decision.

### Arquitectura del solver

Owen Solver es una aplicacion de escritorio separada del servidor web. El gestor la descarga, la ejecuta en su maquina local y se conecta a Owen via API. Esta separacion tiene una razon tecnica: los algoritmos de optimizacion requieren computo intensivo que no corresponde al servidor web, y la ejecucion se realiza pocas veces por semestre (inicio de cada temporada academica).

La aplicacion esta construida con Tauri (framework de aplicaciones de escritorio basado en Rust) y funciona principalmente como un servicio local que Owen web consume desde el navegador. El gestor no necesita salir de Owen para configurar, ejecutar o revisar resultados; la aplicacion de escritorio proporciona unicamente un panel minimo de conexion y estado.

**Stack del solver:**

| Componente | Tecnologia | Justificacion |
|-----------|-----------|---------------|
| Motor de optimizacion | Rust | Rendimiento comparable a C++ (lenguaje dominante en solvers academicos ganadores de ITC), seguridad de memoria sin garbage collector, compilacion a binario unico sin dependencias externas (~15 MB) |
| Solver ILP para asignacion de salas | HiGHS (via crate `highs`) | Solver de programacion lineal entera open source (licencia MIT). Competitivo con solvers comerciales como CPLEX y Gurobi en benchmarks del Hans Mittelmann (Arizona State University). Bindings nativos para Rust, compila junto con la aplicacion sin sidecars |
| Framework de escritorio | Tauri | Binario ~15 MB vs ~150 MB de Electron. Usa webview nativo del sistema operativo. Backend en Rust donde reside el solver |
| Interfaz web (Owen) | React + Tailwind CSS | La configuracion, ejecucion, revision de resultados y confirmacion se realizan en Owen web. El solver no duplica la interfaz |

**Alternativas evaluadas y descartadas:**

| Alternativa | Razon de descarte |
|------------|-------------------|
| Python + Google OR-Tools empaquetado con PyInstaller | Binarios de 200-300 MB, problemas documentados de empaquetado con dependencias C++, antivirus que marcan ejecutables PyInstaller como sospechosos, usuarios finales no pueden tener Python instalado |
| Solver embebido en PHP (servidor) | PHP 7.4 es 50-100x mas lento que Rust para computo intensivo. El solver correria en el servidor compartido afectando a otros usuarios |
| OR-Tools como sidecar en Tauri | OR-Tools no tiene bindings oficiales para Rust. Como binario externo pesaria ~50 MB adicionales y requeriria compilacion separada por sistema operativo |
| Algoritmos geneticos puros | Consistentemente peor rendimiento que Simulated Annealing en todas las ITC. El cruce de soluciones de timetabling produce soluciones infactibles que requieren operadores de reparacion costosos (Burke & Kendall, 2005) |

### Algoritmo de resolucion

El motor utiliza un enfoque hibrido en tres fases, basado en los hallazgos de las competiciones ITC:

**Fase 1a — Construccion greedy con MRV**

Genera una solucion factible inicial asignando sesiones a bloques horarios y dias. Las sesiones se ordenan por la heuristica de Minimum Remaining Values (MRV): la sesion con menos opciones validas se asigna primero. Esta heuristica, proveniente de la investigacion en Constraint Satisfaction Problems (Russell & Norvig, "Artificial Intelligence: A Modern Approach"), reduce drasticamente el backtracking al atacar primero los puntos de mayor restriccion.

**Fase 1b — Simulated Annealing para optimizacion de horarios**

Refina la solucion inicial mediante Simulated Annealing (SA), el algoritmo que gano la ITC 2019 (Ceschia, Di Gaspero & Schaerf, Universidad de Udine). SA explora el espacio de soluciones aceptando movimientos que empeoran temporalmente el resultado con una probabilidad que decrece gradualmente (analogia con el enfriamiento de metales en metalurgia). Esto le permite escapar de optimos locales donde otros algoritmos se atascan.

Los movimientos del vecindario incluyen:
- Intercambio de bloques entre dos sesiones del mismo dia
- Reubicacion de una sesion a otro bloque o dia libre
- Intercambio de dias completos entre sesiones
- Movimientos en cadena: mover sesion A al lugar de B, B al de C, C al de A

El enfriamiento es adaptativo: si no encuentra mejoras en N iteraciones, incrementa la temperatura (reheating) para explorar regiones nuevas del espacio de soluciones. El tiempo de ejecucion es configurable (30 segundos a 5 minutos).

**Fase 2 — Asignacion de salas via programacion lineal entera (ILP)**

Con los horarios ya fijados, la asignacion de salas se formula como un problema de programacion lineal entera y se resuelve con HiGHS. Este sub-problema (Room Assignment Problem) es significativamente mas tratable que el timetabling completo: mientras el problema general tiene complejidad O((B x S)^n) donde B es bloques, S es salas y n es sesiones, el RAP con horarios fijos tiene complejidad O(S^n), reduciendo el espacio de busqueda en ordenes de magnitud.

La descomposicion en dos fases (horarios primero, salas despues) es una tecnica estandar en la literatura conocida como "matheuristic" (Boschetti et al., 2009). La fase de salas puede resolverse de forma optima (no aproximada) mediante ILP para instancias del tamano de Owen.

La funcion objetivo del ILP maximiza:
- Estabilidad de sala (que un curso mantenga la misma sala toda la semana)
- Proximidad de capacidad (no asignar auditorios de 200 a clases de 15)
- Coincidencia de equipamiento (labs para practicas, computadores si se requieren)
- Proximidad geografica entre sesiones consecutivas del mismo nivel y docente

**Fase 3 — Verificacion y explicabilidad**

Toda solucion pasa por verificacion exhaustiva de restricciones duras y calculo de score de calidad (0-100) global y por sesion. Cada asignacion incluye una explicacion en texto: por que esa sala, por que ese horario, que penalizaciones tiene.

La explicabilidad no es accesoria. La experiencia documentada de implementaciones reales (UniTime en Purdue, solver de la Universidad de Udine) muestra que los gestores rechazan sistemas de "caja negra". Si el solver dice "sala X para tu clase" sin explicar por que, la confianza es baja y se vuelve a la asignacion manual.

### Variables del problema

La unidad minima de asignacion no es la asignatura sino la **sesion**. Una asignatura se descompone en sesiones teoricas (grupo completo) y sesiones practicas (subgrupos o secciones), porque los laboratorios tienen menor capacidad que las aulas. Esta division en secciones, que la escuela o el docente define, es el caso mas comun en universidades y Owen la soporta nativamente.

Para cada sesion, el solver debe decidir: en que sala, en que bloque horario y en que dia. Las restricciones que gobiernan esas decisiones se dividen en duras (inviolables) y blandas (optimizables):

**Restricciones duras (la solucion es invalida si se viola cualquiera):**

- Una sala en un bloque y dia solo puede tener una sesion
- Un docente en un bloque y dia solo puede tener una sesion
- Un nivel o seccion en un bloque y dia solo puede tener una sesion (excepto secciones de practica simultaneas en distintas salas)
- La capacidad de la sala debe ser mayor o igual a los alumnos de la sesion
- El tipo de sala debe ser compatible (laboratorio para practicas, aula para teoria)
- La gestion de la sala debe permitirlo (salas de carrera solo para esa carrera, salas centrales para cualquiera)
- El docente debe estar disponible en ese bloque y dia (restriccion especialmente critica para docentes part-time e investigadores)
- No asignar en feriados, eventos institucionales (elecciones, evaluaciones nacionales de ingreso) ni semanas sin clases
- Respetar bloqueos de nivel definidos por la direccion de carrera (dias o bloques reservados para todo el semestre)
- Respetar la temporada activa y el semestre de la asignatura

**Restricciones blandas (ponderadas, el solver maximiza su cumplimiento):**

| Restriccion | Peso | Fundamentacion |
|------------|------|----------------|
| Edificios a mas de 15 minutos en bloques consecutivos del mismo nivel | 5000 | En el campus de Puerto Montt hay edificios separados hasta 40 minutos a pie. Con 10 minutos entre bloques, el traslado es fisicamente imposible. El clima lluvioso de la zona agrava el problema al obligar a los estudiantes a usar transporte publico |
| Respetar preferencias fuertes de disponibilidad docente | 1000 | Docentes part-time e investigadores tienen horarios fragmentados que no son negociables en la practica |
| Sesiones consecutivas del mismo nivel en el mismo edificio o adyacente | 800 | Misma razon de distancias. En la practica funciona como restriccion dura |
| Calidad pedagogica: distribucion equilibrada, sin huecos, teoria antes que practica | 500 | Evitar dias sobrecargados alternando con dias vacios; los huecos entre clases son tiempo muerto para estudiantes |
| Sesiones consecutivas del mismo docente en el mismo edificio | 400 | El docente tambien necesita llegar a tiempo |
| Concentrar el dia de un nivel en maximo dos edificios | 300 | Reducir traslados totales en el dia |
| Secciones de practica equilibradas y coordinadas | 200 | Grupos de tamano similar, idealmente en bloques paralelos o cercanos |
| Preferencias suaves de docente (manana, tarde) | 200 | Diferencia entre "puede" y "prefiere" |
| Eficiencia de sala: capacidad justa, equipamiento adecuado | 150 | No desperdiciar infraestructura ni usar salas sin el equipamiento necesario |
| Minimizar huecos entre clases del mismo nivel | 100 | Huecos de 1-2 bloques sin clase obligan a los estudiantes a esperar |
| Pisos bajos para grupos grandes | 50 | Accesibilidad y evacuacion |

Los pesos son configurables por el gestor antes de cada ejecucion, con presets predefinidos ("Priorizar alumnos", "Priorizar docentes", "Equilibrado"). La configurabilidad de pesos es una recomendacion directa de la literatura: una suma ponderada fija produce resultados no intuitivos cuando las prioridades institucionales cambian entre semestres.

### Versionado de horarios

El proceso de construir un horario no es lineal. El solver genera una propuesta inicial, los directores de carrera solicitan ajustes, los docentes piden cambios, se re-ejecuta el solver parcialmente, se compara con alternativas. Owen implementa un sistema de versionado inspirado en Git para gestionar este proceso:

**Branch** — Cada propuesta de horario es un branch independiente. El gestor puede crear branches alternativos para explorar escenarios ("que pasa si Enfermeria no tiene clases los viernes") sin afectar la propuesta principal. Si la alternativa es mejor, se fusiona; si no, se descarta.

**Commit** — Cada cambio en un horario genera un commit con metadatos: que cambio, quien lo cambio, cuando, por que y de que tipo (generacion del solver, ajuste manual, solicitud aprobada). Esto crea una trazabilidad completa del proceso.

**Diff** — Se pueden comparar dos estados cualesquiera del horario para ver exactamente que sesiones se agregaron, eliminaron o movieron, y como afecto el puntaje de calidad global.

**Merge** — Para aplicar una propuesta al horario oficial, el sistema detecta conflictos (si otra propuesta ya modifico las mismas sesiones) y permite resolverlos antes de publicar.

**Tag** — Un commit marcado como version oficial es el horario que ven los usuarios publicos. Si se necesita un cambio posterior (por ejemplo, una sala cerrada por emergencia), se genera un nuevo commit y se actualiza el tag.

**Rollback** — Cualquier cambio puede revertirse volviendo a un commit anterior, sin perder el historial. "El horario de ayer era mejor" deja de ser un problema.

Este sistema resuelve problemas documentados en implementaciones reales: la falta de trazabilidad ("quien movio esa clase"), la imposibilidad de comparar alternativas, la perdida de estados anteriores y los conflictos silenciosos cuando multiples personas ajustan el horario simultaneamente.

### Datos que alimentan al solver

El solver necesita datos completos y correctos para producir resultados utiles. Owen valida los datos antes de ejecutar el solver e informa que falta:

| Dato | Fuente en Owen | Uso en el solver |
|------|---------------|-----------------|
| Asignaturas con horas de teoria y practica | Gestion academica | Generar sesiones (la unidad minima de asignacion) |
| Docentes asignados a cada asignatura (responsable, colaboradores) | Relacion docente-asignatura | Determinar quien dicta cada sesion |
| Disponibilidad docente por bloque y dia, con nivel de preferencia | Configuracion de disponibilidad | Restriccion dura (no puede) y blanda (prefiere) |
| Salas con tipo, capacidad, equipamiento, mobiliario y tipo de gestion | Gestion de salas | Filtrar salas compatibles por sesion |
| Alumnos estimados por nivel | Gestion academica | Calcular secciones necesarias y validar capacidad |
| Bloques horarios del sistema activo | Configuracion de bloques | Definir franjas disponibles |
| Feriados, eventos institucionales, semanas sin clases | Configuracion del semestre | Excluir fechas no lectivas |
| Bloqueos de nivel (dias o bloques reservados por la direccion) | Configuracion por carrera | Restriccion dura |
| Distancias entre edificios (tiempo real de traslado) | Configuracion del campus | Penalizar o prohibir traslados imposibles |
| Horarios ya confirmados (para re-ejecucion parcial) | Versionado de horarios | Fijar asignaciones y resolver solo lo que cambio |

### Escala esperada

| Concepto | Rango tipico |
|----------|-------------|
| Carreras | 10-30 |
| Niveles por carrera | 4-5 |
| Asignaturas por nivel | 5-8 |
| Total asignaturas | 200-800 |
| Sesiones por asignatura (con secciones) | 2-9 |
| Total sesiones a asignar por semestre | 1,000-5,000 |
| Bloques por dia | 8-12 |
| Dias lectivos | 5-6 |
| Salas | 50-150 |
| Docentes | 100-400 |
| Tiempo de ejecucion estimado | 30-120 segundos |

### Documentacion tecnica detallada

El documento completo con todas las restricciones, el modelo de datos del versionado, el formato JSON de intercambio, los endpoints de API, la estructura del proyecto Tauri y las referencias academicas se encuentra en [`docs/algoritmo-asignacion-salas.md`](docs/algoritmo-asignacion-salas.md).
