# Owen - Sistema de Horarios Institucional

Owen es una plataforma web diseñada para organizar y consultar los horarios de un campus universitario. Permite coordinar salas, docentes y asignaturas en un solo lugar, con un mapa interactivo del campus y un sistema de reportes mediante códigos QR.

El sistema está en uso en el campus de Puerto Montt, Chile, y es accesible desde cualquier navegador sin necesidad de instalar aplicaciones.

---

## El problema que resuelve

Coordinar horarios en una institución educativa es un proceso complejo. Hay que asignar salas a asignaturas, evitar que dos clases coincidan en el mismo espacio o que un docente tenga dos compromisos simultáneos, gestionar solicitudes de espacios entre distintas unidades académicas y mantener informada a toda la comunidad.

Owen centraliza toda esta gestión en una herramienta accesible por internet, eliminando la dependencia de planillas, correos y coordinación manual.

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

### Gestion de horarios
El corazon del sistema. Permite asignar asignaturas a salas en bloques horarios especificos, asociando un docente responsable. Soporta distintos tipos de recurrencia: semanal, quincenal (semanas pares o impares), mensual, una fecha unica o anual.

Antes de confirmar un horario, el sistema verifica automaticamente que no existan conflictos:
- Que la sala no este ocupada en ese mismo bloque
- Que el docente no tenga otra clase al mismo tiempo
- Que el nivel academico no tenga dos clases simultaneas
- Que la sala no este bloqueada por mantenimiento
- Que la fecha no coincida con un feriado registrado

### Solicitudes inteligentes de sala
Las Direcciones de Carrera pueden solicitar salas a traves de un formulario. El sistema incorpora inteligencia artificial que analiza la disponibilidad y, cuando tiene alta confianza en que la solicitud es viable (80% o mas), puede aprobarla automaticamente. Si no, la deriva a un gestor para revision manual, quien puede aprobarla, rechazarla o sugerir una alternativa.

### Mapa interactivo del campus
Un mapa visual del campus que muestra edificios, puntos de interes y rutas. Permite ubicar rapidamente donde queda cada sala o dependencia. Funciona con cartografia abierta (OpenStreetMap) y no requiere servicios de pago.

### Reportes por codigo QR
Las salas y areas comunes del campus (banos, pasillos, patios) tienen codigos QR fisicos. Cualquier persona puede escanearlos con su celular para enviar una observacion anonima: un desperfecto, una sugerencia, un problema de limpieza o seguridad.

Cada observacion genera un ticket que sigue un flujo de atencion: nuevo, en revision, en proceso, resuelto y cerrado. Los gestores administran estos tickets desde el sistema.

### Horarios publicos
Existen enlaces publicos que permiten consultar el horario semanal de una sala o de un docente sin necesidad de iniciar sesion. Estos enlaces pueden compartirse libremente o vincularse desde otras paginas institucionales.

### Soporte bilingue
La interfaz esta disponible en espanol e ingles, lo que permite su uso por parte de usuarios de distintos idiomas.

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

Owen es un sistema en desarrollo activo. Las funcionalidades de gestion de horarios, mapa interactivo, autenticacion y consulta publica estan operativas. Las funcionalidades de solicitudes con inteligencia artificial, reportes QR, calendario y generacion de reportes se encuentran en fase de construccion.
