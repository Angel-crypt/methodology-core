# Guía de Implementación del Mock Server

## Sistema de Registro Metodológico de Métricas Lingüísticas

---

## 1. Introducción y Propósito

El Mock Server constituye una implementación completa y funcional del sistema de backend para el registro metodológico de métricas lingüísticas. Su propósito principal es simular el comportamiento de un servidor real, permitiendo el desarrollo y pruebas frontend sin depender de servicios externos o bases de datos persistentes. El servidor opera completamente en memoria, lo que significa que todos los datos se pierden al reiniciar el proceso, comportamiento esperado y deseado para un entorno de mock.

Esta implementación abarca cuatro módulos fundamentales que conforman el sistema completo: autenticación y control de acceso, gestión de instrumentos de medición, administración de métricas y registro operativo de sujetos y aplicaciones. Cada módulo ha sido desarrollado siguiendo los contratos definidos en los archivos XML ubicados en la carpeta `mock/responses/`, los cuales especifican los requisitos funcionales, reglas de negocio y estructura de datos esperada.

El servidor está construido sobre Node.js utilizando Express como framework web, y emplea JWT para la autenticación stateless. La arquitectura sigue principios de diseño quepriorizan la seguridad, como la validación exhaustiva de entradas, el control de acceso basado en roles y la protección contra ataques comunes como el fingerprinting de respuestas.

---

## 2. Arquitectura General del Sistema

### 2.1 Estructura de Archivos

La organización del proyecto sigue una estructura modular que facilita el mantenimiento y la escalabilidad. El directorio principal `mock/` contiene los siguientes componentes esenciales:

El archivo `package.json` define las dependencias del proyecto, incluyendo Express para el servidor HTTP, bcryptjs para el hasheo de contraseñas, jsonwebtoken para la gestión de tokens JWT y uuid para la generación de identificadores únicos. El script de inicio permite ejecutar el servidor en modo producción con `npm start` o en modo desarrollo con recarga automática mediante `npm run dev`.

El archivo `src/index.js` representa el punto de entrada del servidor, donde se configuran las rutas principales, el middleware global y el proceso de limpieza periódica de tokens revocados. Este archivo establece el prefijo de API `/api/v1` y monta los cuatro módulos de rutas, además de implementar un endpoint de salud pública para verificación del servicio.

La carpeta `src/store/` contiene el almacenamiento en memoria del sistema, implementado como un objeto JavaScript que mantiene arrays y Maps para cada entidad del sistema. Este diseño permite simular operaciones de base de datos sin la complejidad de una instalación PostgreSQL, aunque con la limitación de que los datos no persisten entre reinicios.

El directorio `src/middleware/` alberga el módulo de autenticación y autorización, el cual implementa la lógica de validación de tokens JWT y el control de acceso basado en roles. Este componente es utilizado por todas las rutas que requieren protección.

Finalmente, la carpeta `src/routes/` contiene los cuatro archivos correspondientes a cada módulo del sistema: `m1.js` para autenticación, `m2.js` para instrumentos, `m3.js` para métricas y `m4.js` para el registro operativo.

### 2.2 Tecnologías y Dependencias

El stack tecnológico del mock server ha sido seleccionado cuidadosamente para equilibrar simplicidad y realismo. Express proporciona un marco de trabajo minimalista pero potente para construir APIs REST, maneja el parseo de JSON automáticamente y permite organizar las rutas de manera modular. La biblioteca jsonwebtoken implementa el estándar JWT con soporte para el algoritmo HS256, permitiendo签名 y verificación de tokens de manera stateless.

Bcryptjs ofrece compatibilidad con la biblioteca bcrypt de Node.js para el hasheo de contraseñas, utilizando un factor de costo mínimo de 12 para garantizar seguridad incluso en un entorno de desarrollo. UUID genera identificadores únicos para cada entidad, utilizando la versión 4 que randomiza completamente los identificadores.

---

## 3. Almacenamiento en Memoria

### 3.1 Diseño del Store

El módulo `src/store/index.js` implementa un almacén de datos en memoria que simula las tablas de una base de datos relacional. El diseño utiliza estructuras de datos nativas de JavaScript optimizadas para las operaciones requeridas por cada entidad.

El objeto `store` contiene las siguientes colecciones principales: `users` es un array que almacena todos los usuarios registrados, inicializado con un superadmin cuyas credenciales se leen de las variables de entorno `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`. Si no están definidas se usan valores de desarrollo por defecto y `must_change_password` queda en `true`. El password hash se genera con bcrypt factor 12 durante la carga del módulo.

La colección `revokedTokens` es un Map que asocia identificadores JWT con su fecha de expiración. Esta estructura permite búsquedas O(1) para verificar rápidamente si un token ha sido revocado, operación crítica que se ejecuta en cada solicitud protegida. El Map se limpia periódicamente para eliminar entradas expiradas, evitando crecimiento ilimitado de la memoria.

La colección `loginAttempts` implementa el sistema de rate limiting, utilizando como clave la combinación de dirección IP y correo electrónico del usuario. Cada entrada registra el número de intentos fallidos, el momento del primer intento y el momento hasta el cual permanece bloqueada la cuenta.

Las colecciones `instruments`, `metrics`, `subjects`, `applications` y `metricValues` almacenan las entidades correspondientes a los módulos M2, M3 y M4 respectivamente. Cada una mantiene un array con los objetos completos, permitiendo consultas lineales para filtering y búsqueda.

### 3.2 Semillas Iniciales

El store se inicializa automáticamente con un usuario administrador, lo que permite comenzar a utilizar el sistema inmediatamente después de iniciar el servidor. Este usuario tiene el rol de `administrator`, que es el único rol con permisos para crear nuevos usuarios, gestionar instrumentos y administrar métricas.

La ausencia de datos iniciales en las demás colecciones es intencional, ya que el flujo operativo del sistema предполагает que los administradores creen instrumentos y métricas antes de que los aplicadores puedan registrar sujetos y capturar valores. Este diseño refleja el flujo de trabajo real donde la configuración precede a la operación.

---

## 4. Middleware de Autenticación y Autorización

### 4.1 Implementación del Middleware JWT

El archivo `src/middleware/auth.js` contiene la lógica central de seguridad del sistema, implementando el requisito funcional RF-M1-05 y las historias de usuario HU5. El middleware funciona como un guardián que intercepta cada solicitud antes de que llegue a los handlers de ruta, verificando la identidad del solicitante y sus permisos.

La función `authMiddleware` recibe como parámetro un array de roles permitidos, permitiendo especificar qué roles pueden acceder a cada ruta. Si el array está vacío, cualquier usuario autenticado puede acceder. La firma del token utiliza el algoritmo HS256 con un secreto configurable mediante variable de entorno, siendo `mock-jwt-secret-development-only` el valor por defecto.

El proceso de verificación del token sigue una secuencia de cinco pasos críticos. Primero, se valida la firma del JWT utilizando el secreto compartido; si la firma no coincide, se rechaza inmediatamente con 401. Segundo, se verifica que el identificador JWT no figure en la lista de tokens revocados; esta verificación permite invalidar sesiones antes de su expiración natural, funcionalidad requerida para el cierre de sesión. Tercero, se confirma que el usuario exista y tenga el estado activo en true; un usuario desactivado no puede utilizar ningún endpoint protegido. Cuarto, se valida que el token no haya sido emitido antes del último cambio de contraseña; si el usuario modificó su contraseña, todos los tokens anteriores quedan invalidados automáticamente. Quinto, se verifica que el rol del token esté incluido en la lista de roles permitidos para el endpoint solicitado.

### 4.2 Control de Acceso Basado en Roles

El sistema implementa tres roles distintos que determinan las capacidades de cada usuario. El rol `administrator` tiene acceso completo a todas las funcionalidades del sistema, incluyendo gestión de usuarios, creación y modificación de instrumentos, administración de métricas y registro operativo. El rol `researcher` puede acceder a la información de métricas y operativos para análisis, pero no puede crear ni modificar configuraciones del sistema. El rol `applicator` está limitado al registro operativo, siendo el rol típico para quienes capturan datos en campo.

La implementación del RBAC se realiza en el propio middleware, donde después de validar el token se compara el rol del usuario contra la lista de roles permitidos para el endpoint. Si el rol no está autorizado, se retorna un error 403 Forbidden con un mensaje que indica falta de permisos. Este diseñocentralizado facilita la auditoría de permisos y reduce la posibilidad de inconsistencias.

---

## 5. Módulo M1: Autenticación y Control de Acceso

### 5.1 Endpoints de Autenticación

El módulo M1, implementado en `src/routes/m1.js`, proporciona todas las funcionalidades relacionadas con la gestión de identidad y acceso. El endpoint de login (`POST /auth/login`) constituye el punto de entrada al sistema, validando las credenciales del usuario y emitiendo un token JWT válido por seis horas.

La implementación del login incorpora múltiples capas de seguridad. El sistema de rate limiting registra cada intento fallido, bloqueando la cuenta después de cinco intentos fallidos en un período de sesenta segundos por un duración de cinco minutos. El diseño anti-fingerprinting garantiza que todas las fallas de autenticación retornen el mismo mensaje de error genérico, evitando que un atacante pueda distinguir entre credenciales incorrectas, usuario inexistente o cuenta bloqueada.

El endpoint de logout (`POST /auth/logout`) recibe el token del usuario y añade su identificador jti a la colección de tokens revocados. A partir de ese momento, cualquier solicitud que presente ese token será rechazada, independientemente de si el token ha expirado naturalmente. Esta implementación satisface el requisito de poder cerrar sesiones antes de que expire el token.

### 5.2 Gestión de Usuarios

Los endpoints de gestión de usuarios permiten a los administradores crear nuevas cuentas, listar usuarios existentes con filtros opcionales y activar o desactivar cuentas de usuarios. La creación de usuarios requiere especificar nombre completo, correo electrónico, contraseña y rol, validando que el correo sea único en el sistema y que el rol pertenezca a la lista de roles válidos.

La modificación del estado de usuario permite activar o desactivar cuentas, con una protección especial que impide desactivar al último administrador activo del sistema. Esta salvaguarda evita que el sistema quede sin usuarios con privilegios administrativos, una situación que requeriría intervención manual en la base de datos para resolver.

El cambio de contraseña permite a cualquier usuario autenticado modificar su propia contraseña, proporcionando la contraseña actual como verificación. El sistema valida que la nueva contraseña sea diferente de la actual y actualiza el campo `password_changed_at`, lo que automáticamente invalida todos los tokens anteriores al haber un desajuste entre el momento de emisión del token y el momento del último cambio de contraseña.

---

## 6. Módulo M2: Gestión de Instrumentos

### 6.1 Concepto de Instrumentos

Un instrumento representa un conjunto de métricas asociadas a un período de validez temporal. Los instrumentos son creados por administradores y definen el contexto metodológico bajo el cual se capturan las métricas. Cada instrumento tiene un nombre único, descripción metodológica opcional, fecha de inicio y fecha de fin que definen su período de vigencia.

La gestión de instrumentos permite crear nuevos instrumentos, listar instrumentos existentes con filtro por estado, actualizar información de instrumentos y activar o desactivar instrumentos. Los instrumentos desactivados no pueden recibir nuevas aplicaciones, garantizando la integridad de los datos capturados bajo una configuración metodológica específica.

### 6.2 Implementación de Endpoints

El endpoint de creación de instrumentos (`POST /instruments`) valida que el nombre sea único en el sistema y que las fechas de vigencia sean consistentes, es decir, que la fecha de fin sea posterior a la fecha de inicio. El instrumento se crea con estado activo por defecto.

La actualización de instrumentos permite modificar la descripción metodológica y las fechas de vigencia, con la restricción de que al cambiar fechas se mantiene la validación de coherencia temporal. No es posible cambiar el nombre de un instrumento una vez creado para mantener la trazabilidad de los datos.

El cambio de estado permite activar o desactivar instrumentos. Cuando un instrumento se desactiva, el sistema rechaza cualquier nueva aplicación que intente utilizar ese instrumento, aunque las aplicaciones previamente registradas permanecen accesibles. Esta funcionalidad permite cerrar un período de recolección de datos sin eliminar el historial.

---

## 7. Módulo M3: Métricas

### 7.1 Definición y Tipos de Métricas

Las métricas representan las variables específicas que se capturan durante la aplicación de un instrumento. Cada métrica pertenece a un instrumento específico, tiene un nombre único dentro de ese instrumento, y define un tipo que determina el tipo de datos que puede almacenar y las validaciones aplicadas.

El sistema soporta cuatro tipos de métricas diseñados para cubrir diferentes necesidades de recolección de datos. Las métricas numéricas (`numeric`) permiten valores dentro de un rango especificado mediante valores mínimos y máximos, siendo ideales para escalas cuantitativas. Las métricas categóricas (`categorical`) restringen los valores a un conjunto predefinido de opciones, útiles para variables cualitativas con categorías fijas. Las métricas booleanas (`boolean`) aceptan únicamente valores true o false, apropiadas para preguntas de sí o no. Las métricas de texto corto (`short_text`) permiten texto libre de longitud breve, útiles para observaciones o comentarios.

Cada métrica puede ser marcada como requerida o opcional, lo que determina si su valor debe ser proporcionado obligatoriamente al momento de capturar datos. Las métricas requeridas sin valor generan error en la validación, garantizando la integridad de los datos recolectados.

### 7.2 Validación de Tipos

El sistema implementa una validación estricta de tipos que verifica la coherencia entre el tipo de métrica y los campos dependientes. Por ejemplo, los campos min_value y max_value solo aplican a métricas numéricas; attemptar crear una métrica numérica sin estos campos es válido, pero incluirlos en otros tipos genera error. Similarmente, el campo options es exclusivo de métricas categóricas y debe ser un array no vacío.

La modificación de métricas existentes permite cambiar el tipo, pero al hacerlo se reinician los campos dependientes del tipo anterior. Por ejemplo, cambiar una métrica de numérica a categórica elimina los valores de min_value y max_value, requiriendo que se proporcionen las opciones válidas para el nuevo tipo.

---

## 8. Módulo M4: Registro Operativo

### 8.1 Flujo de Registro

El módulo M4 implementa el flujo operativo completo de captura de datos, comenzando con el registro de sujetos y culminando con la captura de valores de métricas. Este módulo está diseñado para soportar operaciones de campo donde los aplicadores registran información de participantes y recolectan datos utilizando instrumentos predefinidos.

El registro de sujetos implementa el principio de privacidad por diseño establecido en los requisitos AD-09, donde el cuerpo de la solicitud debe estar vacío. Esta decisión arquitectónica garantiza que no se capture información personal identificable durante el registro inicial, siendo el contexto demográfico registrado posteriormente de manera opcional y separada.

### 8.2 Contexto de Sujetos

Después de registrar un sujeto, el aplicador puede opcionalmente agregar información contextual que incluye características demográficas del participante. Los atributos de contexto incluyen tipo de escuela, nivel educativo, cohorte de edad, género, nivel socioeconómico y atributos adicionales flexibles. Cada atributo tiene un conjunto de valores válidos definidos en el contrato, garantizando consistencia en los datos recolectados.

El sistema valida que cada atributo pertenezca a su enum correspondiente, rechazando valores inválidos con mensajes de error descriptivos que indican los valores aceptados. Esta validación happening en el servidor complementa cualquier validación frontend, proporcionando defense in depth.

### 8.3 Aplicaciones y Captura de Valores

Una aplicación representa la aplicación de un instrumento a un sujeto específico en una fecha determinada. El sistema valida que el instrumento esté activo, que el sujeto exista y que la fecha de aplicación esté dentro del período de vigencia del instrumento. Estas validaciones garantizan que los datos se capturen únicamente bajo las condiciones metodológicas establecidas.

La captura de valores de métricas permite enviar múltiples valores en una única solicitud, asociándolos a una aplicación específica. El sistema verifica que todas las métricas requeridas estén presentes, que los valores cumplan con las restricciones de tipo y rango, y que cada métrica pertenezca al instrumento de la aplicación. La validación es atómica, recolectando todos los errores antes de rechazar la solicitud, lo que permite al cliente corregir todos los problemas en lugar de recibir errores uno por uno.

---

## 9. Seguridad e Implementación de Controles

### 9.1 Protección contra Ataques

El mock server implementa múltiples capas de protección para mitigar vector de ataques comunes. La validación de entradas se realiza en cada endpoint, verificando tipos, rangos, formatos y valores permitidos antes de procesar cualquier dato. El sistema rechaza solicitudes con datos faltantes o inválidos con mensajes de error claros que indican exactamente qué campos faltan o son incorrectos.

El sistema de rate limiting protege el endpoint de login contra ataques de fuerza bruta, limitando el número de intentos fallidos y bloqueando temporalmente cuentas que superan el umbral. Durante el bloqueo, el sistema retorna el mismo error de autenticación que para credenciales incorrectas, evitando que un atacante pueda detectar qué cuentas existen en el sistema.

### 9.2 Gestión de Tokens

La gestión de tokens JWT sigue las mejores prácticas de seguridad. Los tokens tienen una vida útil de seis horas, balanceando conveniencia con seguridad. El identificador único jti permite revocar tokens individualmente sin afectar otras sesiones del mismo usuario. La fecha de emisión iat se compara con el momento del último cambio de contraseña para invalidar sesiones anteriores automáticamente.

El proceso de limpieza periódica elimina tokens revocados expirados de la memoria, evitando acumulación de datos innecesarios. Esta limpieza se ejecuta cada diez minutos, revisando cada entrada en la colección de tokens revocados y eliminando aquellas cuya fecha de expiración ya pasó.

---

## 10. Ejecución y Configuración

### 10.1 Inicio del Servidor

El servidor se inicia ejecutando `npm install` seguido de `npm start` desde el directorio mock/. Por defecto, el servidor escucha en el puerto 3000, configurable mediante la variable de entorno PORT. La variable JWT_SECRET permite personalizar el secreto de firma de los tokens, útil para entornos de producción donde se recomienda utilizar secretos más complejos.

Al iniciar, el servidor muestra en consola la URL de la API, la URL del endpoint de salud y las credenciales del usuario administrador inicial. El endpoint de salud `/health` está disponible públicamente sin autenticación, diseñado para ser utilizado por balanceadores de carga y sistemas de monitoreo.

### 10.2 Docker

El proyecto incluye un Dockerfile que permite ejecutar el servidor en un contenedor Docker. La construcción de la imagen se realiza con `docker build -t methodology-mock .` y la ejecución con `docker run -p 3000:3000 methodology-mock`. Esta opción es particularmente útil para entornos de integración continua o cuando se requiere aislar el servidor del entorno local.

---

## 11. Contratos XML de Referencia

### 11.1 Propósito de los Contratos

Los archivos XML en la carpeta `mock/responses/` documentan los requisitos completos del sistema en un formato estructurado y versionado. Cada contrato corresponde a un módulo específico y define endpoints, estructuras de datos, reglas de negocio y criterios de aceptación. Estos contratos sirvieron como especificación durante el desarrollo y continúan sirviendo como referencia para futuras modificaciones.

### 11.2 Versionado

Los contratos siguen un esquema de versionado que permite rastrear evolución del sistema. La versión se indica en el nombre del archivo y dentro del contenido XML. Cuando se implementan cambios que alteran el comportamiento definido en el contrato, se crea una nueva versión del archivo, manteniendo las versiones anteriores para referencia histórica.

---

## 12. Resumen de Implementación

El mock server constituye una implementación robusta y completa del sistema de registro metodológico de métricas lingüísticas. A través de sus cuatro módulos, proporciona todas las funcionalidades necesarias para el flujo completo de operación del sistema, desde la gestión de usuarios y configuración de instrumentos hasta la captura de datos en campo.

La arquitectura basada en Express y JWT ofrece un balance entre simplicidad de implementación y realismo funcional. El almacenamiento en memoria permite desarrollo y pruebas rápidas sin configuración de base de datos, mientras que la implementación completa de autenticación, autorización y validaciones refleja fielmente el comportamiento esperado del sistema de producción.

Los contratos XML proporcionan documentación autoritativa del comportamiento esperado, sirviendo como especificación durante el desarrollo y como referencia para pruebas de verificación. La separación clara de responsabilidades entre módulos facilita el mantenimiento y la evolución independiente de cada componente del sistema.
