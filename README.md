# Owen - Sistema de Información de Salas

Owen es una plataforma web que muestra la información de las salas de un campus universitario. Permite consultar los horarios de cada sala, buscar horarios de docentes y asignaturas, explorar el campus en un mapa interactivo con puntos de interés y reportar observaciones mediante códigos QR.

Es accesible desde cualquier navegador sin necesidad de instalar aplicaciones.

---

## El problema que resuelve

En un campus universitario, la información sobre las salas está dispersa: qué clase se dicta en cada sala, dónde queda cada edificio, quién tiene una sala asignada en un momento dado, cómo reportar un problema en una dependencia. Esta fragmentación obliga a estudiantes, docentes y administrativos a depender de planillas, carteles físicos y consultas informales.

Owen centraliza toda esta información en un solo lugar accesible por internet: cualquier persona puede ver qué está pasando en cada sala, encontrar espacios en el mapa y reportar problemas con un escaneo de QR.

---

## Quiénes lo usan

El sistema contempla tres tipos de usuarios con distintos niveles de acceso:

### Gestores
Son los administradores del sistema. Crean y modifican horarios, gestionan salas, docentes y asignaturas. Aprueban o rechazan solicitudes de espacios. Atienden los reportes de observaciones que llegan desde los códigos QR.

Un gestor de carrera solo puede administrar las salas y horarios que le corresponden.

### Direcciones de Carrera
Pueden consultar los horarios de su carrera en modo lectura. Tienen la capacidad de solicitar salas para actividades especiales y de liberar clases cuando no se van a realizar (por ejemplo, por suspensión o feriado), dejando la sala disponible para otros.

### Público general
Cualquier persona puede consultar horarios de salas y docentes sin necesidad de crear una cuenta. También pueden ver el mapa del campus y reportar observaciones escaneando códigos QR instalados en las dependencias.

---

## Funcionalidades principales

### Consulta de horarios
Cualquier persona puede consultar el horario semanal de una sala o de un docente sin necesidad de iniciar sesión. Existen enlaces públicos que pueden compartirse libremente o vincularse desde otras páginas institucionales. También es posible buscar horarios por asignatura, carrera o nivel.

### Mapa interactivo del campus
Un mapa visual del campus que muestra edificios, puntos de interés y rutas. Permite ubicar rápidamente dónde queda cada sala o dependencia. Funciona con cartografía abierta (OpenStreetMap) y no requiere servicios de pago.

### Administración de salas
Los gestores registran y mantienen la información de las salas del campus: tipo, capacidad, equipamiento, edificio y tipo de gestión (central, por carrera o por unidad). Las salas de carrera solo son visibles para el gestor correspondiente.

### Reportes por código QR
Las salas y áreas comunes del campus (baños, pasillos, patios) tienen códigos QR físicos. Cualquier persona puede escanearlos con su celular para enviar una observación anónima: un desperfecto, una sugerencia, un problema de limpieza o seguridad.

Cada observación genera un ticket que sigue un flujo de atención: nuevo, en revisión, en proceso, resuelto y cerrado. Los gestores administran estos tickets desde el sistema.

### Soporte bilingüe
La interfaz está disponible en español e inglés, lo que permite su uso por parte de usuarios de distintos idiomas.

### Funcionalidades planificadas a futuro
Las siguientes funcionalidades están contempladas pero no forman parte del sistema actual:

- **Gestión de horarios:** Creación y edición de horarios directamente desde el sistema, con detección automática de conflictos (sala ocupada, docente con clase simultánea, feriados, etc.) y soporte para distintos tipos de recurrencia (semanal, quincenal, mensual, única, anual).
- **Solicitudes inteligentes de sala:** Formulario para que Direcciones de Carrera soliciten salas, con análisis de disponibilidad asistido por inteligencia artificial y aprobación automática o derivación a gestor.
- **Liberación de clases:** Posibilidad de que Direcciones de Carrera liberen salas cuando una clase no se va a realizar.

---

## Seguridad y manejo de datos

### Autenticación y sesiones
El acceso al sistema requiere credenciales (correo y contraseña). Las contraseñas nunca se almacenan en texto plano; se guardan cifradas mediante algoritmos de hash seguros. Al iniciar sesión, el sistema genera una sesión única que se invalida automáticamente tras 30 minutos de inactividad.

Para prevenir ataques de fuerza bruta, el inicio de sesión está limitado a 5 intentos por minuto. Si se supera ese límite, los intentos adicionales son rechazados temporalmente.

### Cookies seguras
La sesión del usuario se mantiene mediante cookies configuradas con múltiples capas de protección:
- **Solo HTTPS:** La cookie solo se transmite por conexiones cifradas, impidiendo su interceptación en redes no seguras.
- **HttpOnly:** La cookie no es accesible desde código JavaScript en el navegador, lo que previene su robo mediante ataques de inyección de scripts (XSS).
- **SameSite estricto:** La cookie solo se envía en solicitudes que se originan desde el propio sitio, previniendo ataques de falsificación de solicitudes (CSRF).

### Control de acceso por roles
Cada usuario tiene un rol asignado (gestor o dirección) que determina exactamente qué puede ver y qué puede hacer. Las rutas y funciones del sistema verifican el rol antes de permitir cualquier operación. Un usuario de dirección no puede modificar horarios, y un gestor de carrera no puede ver las salas de otra carrera.

### Protección contra ataques comunes
El sistema implementa defensas contra las vulnerabilidades web más frecuentes:
- **Inyección SQL:** Todas las consultas a la base de datos usan sentencias preparadas con parámetros, impidiendo que datos maliciosos alteren las consultas.
- **Cross-Site Scripting (XSS):** Los datos ingresados por usuarios se sanitizan antes de mostrarse, evitando la ejecución de código no autorizado.
- **Clickjacking:** Se impide que el sitio sea incrustado en marcos de otras páginas mediante cabeceras de seguridad.
- **CORS restringido:** Solo los orígenes autorizados (el dominio de producción y los entornos de desarrollo) pueden comunicarse con el servidor. Solicitudes desde otros sitios son rechazadas.

### Cabeceras de seguridad HTTP
Cada respuesta del servidor incluye cabeceras que refuerzan la seguridad del navegador:
- Prevención de interpretación incorrecta de tipos de archivo
- Bloqueo de incrustación en iframes externos
- Activación de filtros anti-XSS del navegador
- Política de referencia restrictiva que limita la información compartida al navegar entre sitios

### Registro de eventos de seguridad
El sistema mantiene un registro mensual de eventos relevantes para la seguridad: inicios de sesión exitosos y fallidos, cierres de sesión y acciones sensibles. Esto permite auditar el uso del sistema y detectar comportamientos anómalos.

### Almacenamiento de datos
Todos los datos se almacenan en una base de datos local dentro del propio servidor, sin depender de servicios externos de almacenamiento. La base de datos tiene habilitadas las restricciones de integridad referencial, lo que garantiza la consistencia de las relaciones entre los datos (por ejemplo, no es posible asignar un horario a una sala que no existe).

### Datos personales
El sistema maneja datos de docentes (nombre, RUT, correo, teléfono) y de usuarios administrativos (nombre, correo). Las observaciones enviadas por QR son anónimas y no requieren identificación. No se recopilan datos personales del público general que consulta horarios.

---

## Estado del proyecto

Owen es un sistema en desarrollo activo. La consulta pública de horarios, el mapa interactivo, la administración de salas y la autenticación están operativas. Las funcionalidades de reportes por QR, gestión de horarios, solicitudes inteligentes, calendario y generación de reportes se encuentran en fase de planificación o construcción.

---

## Owen Solver — Generación automática de horarios (beta)

Owen incluye un motor de asignación automática de salas y horarios. El problema de asignar sesiones académicas a salas, docentes y bloques horarios respetando múltiples restricciones simultáneas es conocido formalmente como **University Course Timetabling Problem (UCTP)**, clasificado como NP-hard en la teoría de complejidad computacional. Esto significa que no existe un algoritmo que garantice encontrar la solución óptima en tiempo razonable para todas las instancias; la cantidad de combinaciones crece exponencialmente con cada variable agregada.

La investigación académica lleva décadas estudiando este problema. Las International Timetabling Competitions (ITC 2002, 2007, 2011, 2019), organizadas por universidades europeas con instancias de datos reales, han servido como referencia para evaluar algoritmos. Owen basa sus decisiones de diseño en los hallazgos de estas competiciones y en la literatura de optimización combinatoria.

### Por qué no basta con asignar a mano

Un campus mediano tiene entre 200 y 800 asignaturas, cada una con sesiones teóricas y prácticas, docentes con disponibilidad variable, salas con distintos tipos y capacidades, y restricciones que interactúan entre sí. Una sola asignatura de 60 alumnos con horas teóricas y de laboratorio puede generar 9 sesiones independientes que deben ubicarse sin conflictos. El espacio total de combinaciones posibles para un semestre típico supera las 10^15 posibilidades, lo que hace inviable la enumeración manual o por fuerza bruta.

Los sistemas existentes como Darwin (en uso en la institución) terminan requiriendo que la asignación se haga manualmente porque no modelan la complejidad real del problema. UniTime (Purdue University, usado con ~30,000 estudiantes y ~8,000 secciones) documenta que el mayor desafío de implementación no fue el algoritmo sino la calidad de los datos y la resistencia organizacional. Owen aborda ambos problemas: valida datos antes de optimizar y proporciona explicaciones detalladas de cada decisión.

### Arquitectura del solver

Owen Solver es una aplicación de escritorio separada del servidor web. El gestor la descarga, la ejecuta en su máquina local y se conecta a Owen vía API. Esta separación tiene una razón técnica: los algoritmos de optimización requieren cómputo intensivo que no corresponde al servidor web, y la ejecución se realiza pocas veces por semestre (inicio de cada temporada académica).

La aplicación está construida con Tauri (framework de aplicaciones de escritorio basado en Rust) y funciona principalmente como un servicio local que Owen web consume desde el navegador. El gestor no necesita salir de Owen para configurar, ejecutar o revisar resultados; la aplicación de escritorio proporciona únicamente un panel mínimo de conexión y estado.

**Stack del solver:**

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Motor de optimización | Rust | Rendimiento comparable a C++ (lenguaje dominante en solvers académicos ganadores de ITC), seguridad de memoria sin garbage collector, compilación a binario único sin dependencias externas (~15 MB) |
| Solver ILP para asignación de salas | HiGHS (vía crate `highs`) | Solver de programación lineal entera open source (licencia MIT). Competitivo con solvers comerciales como CPLEX y Gurobi en benchmarks del Hans Mittelmann (Arizona State University). Bindings nativos para Rust, compila junto con la aplicación sin sidecars |
| Framework de escritorio | Tauri | Binario ~15 MB vs ~150 MB de Electron. Usa webview nativo del sistema operativo. Backend en Rust donde reside el solver |
| Interfaz web (Owen) | React + Tailwind CSS | La configuración, ejecución, revisión de resultados y confirmación se realizan en Owen web. El solver no duplica la interfaz |

**Alternativas evaluadas y descartadas:**

| Alternativa | Razón de descarte |
|------------|-------------------|
| Python + Google OR-Tools empaquetado con PyInstaller | Binarios de 200-300 MB, problemas documentados de empaquetado con dependencias C++, antivirus que marcan ejecutables PyInstaller como sospechosos, usuarios finales no pueden tener Python instalado |
| Solver embebido en PHP (servidor) | PHP 7.4 es 50-100x más lento que Rust para cómputo intensivo. El solver correría en el servidor compartido afectando a otros usuarios |
| OR-Tools como sidecar en Tauri | OR-Tools no tiene bindings oficiales para Rust. Como binario externo pesaría ~50 MB adicionales y requeriría compilación separada por sistema operativo |
| Algoritmos genéticos puros | Consistentemente peor rendimiento que Simulated Annealing en todas las ITC. El cruce de soluciones de timetabling produce soluciones infactibles que requieren operadores de reparación costosos (Burke & Kendall, 2005) |

### Algoritmo de resolución

El motor utiliza un enfoque híbrido en tres fases, basado en los hallazgos de las competiciones ITC:

**Fase 1a — Construcción greedy con MRV**

Genera una solución factible inicial asignando sesiones a bloques horarios y días. Las sesiones se ordenan por la heurística de Minimum Remaining Values (MRV): la sesión con menos opciones válidas se asigna primero. Esta heurística, proveniente de la investigación en Constraint Satisfaction Problems (Russell & Norvig, "Artificial Intelligence: A Modern Approach"), reduce drásticamente el backtracking al atacar primero los puntos de mayor restricción.

**Fase 1b — Simulated Annealing para optimización de horarios**

Refina la solución inicial mediante Simulated Annealing (SA), el algoritmo que ganó la ITC 2019 (Ceschia, Di Gaspero & Schaerf, Universidad de Udine). SA explora el espacio de soluciones aceptando movimientos que empeoran temporalmente el resultado con una probabilidad que decrece gradualmente (analogía con el enfriamiento de metales en metalurgia). Esto le permite escapar de óptimos locales donde otros algoritmos se atascan.

Los movimientos del vecindario incluyen:
- Intercambio de bloques entre dos sesiones del mismo día
- Reubicación de una sesión a otro bloque o día libre
- Intercambio de días completos entre sesiones
- Movimientos en cadena: mover sesión A al lugar de B, B al de C, C al de A

El enfriamiento es adaptativo: si no encuentra mejoras en N iteraciones, incrementa la temperatura (reheating) para explorar regiones nuevas del espacio de soluciones. El tiempo de ejecución es configurable (30 segundos a 5 minutos).

**Fase 2 — Asignación de salas vía programación lineal entera (ILP)**

Con los horarios ya fijados, la asignación de salas se formula como un problema de programación lineal entera y se resuelve con HiGHS. Este sub-problema (Room Assignment Problem) es significativamente más tratable que el timetabling completo: mientras el problema general tiene complejidad O((B x S)^n) donde B es bloques, S es salas y n es sesiones, el RAP con horarios fijos tiene complejidad O(S^n), reduciendo el espacio de búsqueda en órdenes de magnitud.

La descomposición en dos fases (horarios primero, salas después) es una técnica estándar en la literatura conocida como "matheuristic" (Boschetti et al., 2009). La fase de salas puede resolverse de forma óptima (no aproximada) mediante ILP para instancias del tamaño de Owen.

La función objetivo del ILP maximiza:
- Estabilidad de sala (que un curso mantenga la misma sala toda la semana)
- Proximidad de capacidad (no asignar auditorios de 200 a clases de 15)
- Coincidencia de equipamiento (labs para prácticas, computadores si se requieren)
- Proximidad geográfica entre sesiones consecutivas del mismo nivel y docente

**Fase 3 — Verificación y explicabilidad**

Toda solución pasa por verificación exhaustiva de restricciones duras y cálculo de score de calidad (0-100) global y por sesión. Cada asignación incluye una explicación en texto: por qué esa sala, por qué ese horario, qué penalizaciones tiene.

La explicabilidad no es accesoria. La experiencia documentada de implementaciones reales (UniTime en Purdue, solver de la Universidad de Udine) muestra que los gestores rechazan sistemas de "caja negra". Si el solver dice "sala X para tu clase" sin explicar por qué, la confianza es baja y se vuelve a la asignación manual.

### Variables del problema

La unidad mínima de asignación no es la asignatura sino la **sesión**. Una asignatura se descompone en sesiones teóricas (grupo completo) y sesiones prácticas (subgrupos o secciones), porque los laboratorios tienen menor capacidad que las aulas. Esta división en secciones, que la escuela o el docente define, es el caso más común en universidades y Owen la soporta nativamente.

Para cada sesión, el solver debe decidir: en qué sala, en qué bloque horario y en qué día. Las restricciones que gobiernan esas decisiones se dividen en duras (inviolables) y blandas (optimizables):

**Restricciones duras (la solución es inválida si se viola cualquiera):**

- Una sala en un bloque y día solo puede tener una sesión
- Un docente en un bloque y día solo puede tener una sesión
- Un nivel o sección en un bloque y día solo puede tener una sesión (excepto secciones de práctica simultáneas en distintas salas)
- La capacidad de la sala debe ser mayor o igual a los alumnos de la sesión
- El tipo de sala debe ser compatible (laboratorio para prácticas, aula para teoría)
- La gestión de la sala debe permitirlo (salas de carrera solo para esa carrera, salas centrales para cualquiera)
- El docente debe estar disponible en ese bloque y día (restricción especialmente crítica para docentes part-time e investigadores)
- No asignar en feriados, eventos institucionales (elecciones, evaluaciones nacionales de ingreso) ni semanas sin clases
- Respetar bloqueos de nivel definidos por la dirección de carrera (días o bloques reservados para todo el semestre)
- Respetar la temporada activa y el semestre de la asignatura

**Restricciones blandas (ponderadas, el solver maximiza su cumplimiento):**

| Restricción | Peso | Fundamentación |
|------------|------|----------------|
| Edificios a más de 15 minutos en bloques consecutivos del mismo nivel | 5000 | En el campus de Puerto Montt hay edificios separados hasta 40 minutos a pie. Con 10 minutos entre bloques, el traslado es físicamente imposible. El clima lluvioso de la zona agrava el problema al obligar a los estudiantes a usar transporte público |
| Respetar preferencias fuertes de disponibilidad docente | 1000 | Docentes part-time e investigadores tienen horarios fragmentados que no son negociables en la práctica |
| Sesiones consecutivas del mismo nivel en el mismo edificio o adyacente | 800 | Misma razón de distancias. En la práctica funciona como restricción dura |
| Calidad pedagógica: distribución equilibrada, sin huecos, teoría antes que práctica | 500 | Evitar días sobrecargados alternando con días vacíos; los huecos entre clases son tiempo muerto para estudiantes |
| Sesiones consecutivas del mismo docente en el mismo edificio | 400 | El docente también necesita llegar a tiempo |
| Concentrar el día de un nivel en máximo dos edificios | 300 | Reducir traslados totales en el día |
| Secciones de práctica equilibradas y coordinadas | 200 | Grupos de tamaño similar, idealmente en bloques paralelos o cercanos |
| Preferencias suaves de docente (mañana, tarde) | 200 | Diferencia entre "puede" y "prefiere" |
| Eficiencia de sala: capacidad justa, equipamiento adecuado | 150 | No desperdiciar infraestructura ni usar salas sin el equipamiento necesario |
| Minimizar huecos entre clases del mismo nivel | 100 | Huecos de 1-2 bloques sin clase obligan a los estudiantes a esperar |
| Pisos bajos para grupos grandes | 50 | Accesibilidad y evacuación |

Los pesos son configurables por el gestor antes de cada ejecución, con presets predefinidos ("Priorizar alumnos", "Priorizar docentes", "Equilibrado"). La configurabilidad de pesos es una recomendación directa de la literatura: una suma ponderada fija produce resultados no intuitivos cuando las prioridades institucionales cambian entre semestres.

### Versionado de horarios

El proceso de construir un horario no es lineal. El solver genera una propuesta inicial, los directores de carrera solicitan ajustes, los docentes piden cambios, se re-ejecuta el solver parcialmente, se compara con alternativas. Owen implementa un sistema de versionado inspirado en Git para gestionar este proceso:

**Branch** — Cada propuesta de horario es un branch independiente. El gestor puede crear branches alternativos para explorar escenarios ("qué pasa si Enfermería no tiene clases los viernes") sin afectar la propuesta principal. Si la alternativa es mejor, se fusiona; si no, se descarta.

**Commit** — Cada cambio en un horario genera un commit con metadatos: qué cambió, quién lo cambió, cuándo, por qué y de qué tipo (generación del solver, ajuste manual, solicitud aprobada). Esto crea una trazabilidad completa del proceso.

**Diff** — Se pueden comparar dos estados cualesquiera del horario para ver exactamente qué sesiones se agregaron, eliminaron o movieron, y cómo afectó el puntaje de calidad global.

**Merge** — Para aplicar una propuesta al horario oficial, el sistema detecta conflictos (si otra propuesta ya modificó las mismas sesiones) y permite resolverlos antes de publicar.

**Tag** — Un commit marcado como versión oficial es el horario que ven los usuarios públicos. Si se necesita un cambio posterior (por ejemplo, una sala cerrada por emergencia), se genera un nuevo commit y se actualiza el tag.

**Rollback** — Cualquier cambio puede revertirse volviendo a un commit anterior, sin perder el historial. "El horario de ayer era mejor" deja de ser un problema.

Este sistema resuelve problemas documentados en implementaciones reales: la falta de trazabilidad ("quién movió esa clase"), la imposibilidad de comparar alternativas, la pérdida de estados anteriores y los conflictos silenciosos cuando múltiples personas ajustan el horario simultáneamente.

### Datos que alimentan al solver

El solver necesita datos completos y correctos para producir resultados útiles. Owen valida los datos antes de ejecutar el solver e informa qué falta:

| Dato | Fuente en Owen | Uso en el solver |
|------|---------------|-----------------|
| Asignaturas con horas de teoría y práctica | Gestión académica | Generar sesiones (la unidad mínima de asignación) |
| Docentes asignados a cada asignatura (responsable, colaboradores) | Relación docente-asignatura | Determinar quién dicta cada sesión |
| Disponibilidad docente por bloque y día, con nivel de preferencia | Configuración de disponibilidad | Restricción dura (no puede) y blanda (prefiere) |
| Salas con tipo, capacidad, equipamiento, mobiliario y tipo de gestión | Gestión de salas | Filtrar salas compatibles por sesión |
| Alumnos estimados por nivel | Gestión académica | Calcular secciones necesarias y validar capacidad |
| Bloques horarios del sistema activo | Configuración de bloques | Definir franjas disponibles |
| Feriados, eventos institucionales, semanas sin clases | Configuración del semestre | Excluir fechas no lectivas |
| Bloqueos de nivel (días o bloques reservados por la dirección) | Configuración por carrera | Restricción dura |
| Distancias entre edificios (tiempo real de traslado) | Configuración del campus | Penalizar o prohibir traslados imposibles |
| Horarios ya confirmados (para re-ejecución parcial) | Versionado de horarios | Fijar asignaciones y resolver solo lo que cambió |

### Escala esperada

| Concepto | Rango típico |
|----------|-------------|
| Carreras | 10-30 |
| Niveles por carrera | 4-5 |
| Asignaturas por nivel | 5-8 |
| Total asignaturas | 200-800 |
| Sesiones por asignatura (con secciones) | 2-9 |
| Total sesiones a asignar por semestre | 1,000-5,000 |
| Bloques por día | 8-12 |
| Días lectivos | 5-6 |
| Salas | 50-150 |
| Docentes | 100-400 |
| Tiempo de ejecución estimado | 30-120 segundos |

### Documentación técnica detallada

El documento completo con todas las restricciones, el modelo de datos del versionado, el formato JSON de intercambio, los endpoints de API, la estructura del proyecto Tauri y las referencias académicas se encuentra en [`docs/algoritmo-asignacion-salas.md`](docs/algoritmo-asignacion-salas.md).
