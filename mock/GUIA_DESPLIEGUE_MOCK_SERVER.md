# Guía de Despliegue del Mock Server

## Sistema de Registro Metodológico de Métricas Lingüísticas

---

## 1. Introducción

Esta guía describe los métodos disponibles para desplegar el Mock Server del Sistema de Registro Metodológico de Métricas Lingüísticas. El Mock Server es un servidor HTTP completamente funcional que simula el comportamiento del backend real, permitiendo el desarrollo frontend y pruebas de integración sin depender de la infraestructura de producción.

El servidor expone una API RESTful en el endpoint base `/api/v1` e incluye autenticación JWT, gestión de usuarios, instrumentos, métricas y registro operativo de sujetos y aplicaciones.

**Versión del documento:** 1.0  
**Fecha de creación:** Marzo 2026

---

## 2. Requisitos Previos

### 2.1 Requisitos del Sistema

Antes de desplegar el Mock Server, asegúrese de contar con:

| Requisito | Versión mínima | Notas |
|-----------|----------------|-------|
| Node.js   | 18.x o superior | Necesario para ejecución nativa |
| Docker    | 20.x o superior | Necesario para ejecución en contenedor |
| Docker Compose | 2.x | Opcional, para orquestación |
| git       | Cualquiera | Para clonar el repositorio si es necesario |

### 2.2 Puertos Requeridos

El Mock Server utiliza el puerto **3000** por defecto. Asegúrese de que este puerto esté disponible o configúrelo para usar otro puerto según sea necesario.

---

## 3. Método 1: Despliegue Local con Node.js

Este método es ideal para desarrollo rápido o pruebas jednostanas sin necesidad de Docker.

### 3.1 Pasos de Instalación

**Paso 1: Navegar al directorio del Mock Server**

```bash
cd metodologia-core/mock
```

**Paso 2: Instalar dependencias**

```bash
npm install
```

Este comando descarga e instala todas las dependencias definidas en `package.json`, incluyendo Express, bcryptjs, jsonwebtoken y uuid.

**Paso 3: (Opcional) Configurar variables de entorno**

Si desea personalizar la configuración, cree un archivo `.env` basado en el ejemplo proporcionado:

```bash
cp .env.example .env
```

Edite el archivo `.env` según sus necesidades:

```env
# Puerto en el que escucha el servidor
PORT=3000

# Secreto para firma de tokens JWT
# En producción, use un valor más complejo
JWT_SECRET=mi-secreto-seguro
```

**Paso 4: Iniciar el servidor**

Para producción:
```bash
npm start
```

Para desarrollo (con recarga automática):
```bash
npm run dev
```

### 3.2 Verificación del Despliegue

Una vez iniciado, el servidor mostrará un mensaje de confirmación en la consola:

```
╔══════════════════════════════════════════════════╗
║           Mock Server – Métricas Lingüísticas    ║
╚══════════════════════════════════════════════════╝
  API:    http://localhost:3000/api/v1
  Health: http://localhost:3000/health
  Admin:  admin@mock.local  /  Admin123!
  Todos los datos son en memoria (se pierden al reiniciar).
```

Verifique que el servidor esté funcionando correctamente:

```bash
curl http://localhost:3000/health
```

Debería obtener una respuesta similar a:

```json
{
  "status": "ok",
  "service": "mock-server",
  "timestamp": "2026-03-17T12:00:00.000Z"
}
```

---

## 4. Método 2: Despliegue con Docker

Docker proporciona un entorno aislado y reproducible, ideal para presentaciones y demos donde se desea evitar dependencias del sistema host.

### 4.1 Construcción de la Imagen

**Paso 1: Navegar al directorio del Mock Server**

```bash
cd metodologia-core/mock
```

**Paso 2: Construir la imagen Docker**

```bash
docker build -t methodology-mock .
```

El proceso de construcción:
- Descarga la imagen base de Node.js 20 Alpine
- Instala las dependencias de producción
- Copia el código fuente
- Expone el puerto 3000

**Paso 3: Verificar la imagen construida**

```bash
docker images | grep methodology-mock
```

Debería mostrar la imagen recientemente creada.

### 4.2 Ejecución del Contenedor

**Paso 1: Ejecutar el contenedor**

```bash
docker run -d -p 3000:3000 --name mock-server methodology-mock
```

Opciones utilizadas:
- `-d`: Ejecuta el contenedor en modo daemon (background)
- `-p 3000:3000`: Mapea el puerto 3000 del contenedor al puerto 3000 del host
- `--name mock-server`: Asigna un nombre descriptivo al contenedor

**Paso 2: Verificar que el contenedor está ejecutándose**

```bash
docker ps | grep mock-server
```

### 4.3 Configuración con Variables de Entorno

Para personalizar la configuración durante la ejecución:

```bash
docker run -d \
  -p 3000:3000 \
  -e PORT=3000 \
  -e JWT_SECRET=mi-secreto-produccion \
  --name mock-server \
  methodology-mock
```

### 4.4 Detener y Eliminar el Contenedor

```bash
# Detener el contenedor
docker stop mock-server

# Eliminar el contenedor
docker rm mock-server
```

---

## 5. Método 3: Despliegue con Docker Compose

Docker Compose permite definir y ejecutar aplicaciones multi-contenedor de manera declarativa. Aunque el Mock Server funciona como un componente único, Docker Compose facilita la gestión del ciclo de vida.

### 5.1 Archivo Docker Compose

El proyecto incluye un archivo `docker-compose.yml` en el directorio raíz que puede ser utilizado para orquestar el Mock Server junto con otros componentes si fuera necesario.

### 5.2 Ejecución con Docker Compose

**Paso 1: Navegar al directorio del proyecto**

```bash
cd metodologia-core
```

**Paso 2: Ejecutar el servicio**

```bash
docker-compose up -d
```

**Paso 3: Verificar el estado**

```bash
docker-compose ps
```

**Paso 4: Ver logs**

```bash
docker-compose logs -f mock
```

**Paso 5: Detener servicios**

```bash
docker-compose down
```

---

## 6. Configuración Avanzada

### 6.1 Variables de Entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|--------------|
| `PORT` | 3000 | Puerto HTTP donde escucha el servidor |
| `JWT_SECRET` | mock-jwt-secret-development-only | Secreto para firmar tokens JWT |

### 6.2 Credenciales de Acceso

El Mock Server se inicializa con un usuario administrador por defecto:

| Campo | Valor |
|-------|-------|
| Correo electrónico | admin@mock.local |
| Contraseña | Admin123! |
| Rol | administrator |

**Nota de seguridad:** Estas credenciales son para entorno de desarrollo y pruebas. En un despliegue de producción, deben cambiarse inmediatamente después del primer acceso.

### 6.3 Personalización del Puerto

**Método Node.js:**

Establezca la variable de entorno antes de iniciar:

```bash
# Linux/macOS
export PORT=8080
npm start

# Windows (CMD)
set PORT=8080
npm start

# Windows (PowerShell)
$env:PORT=8080
npm start
```

**Método Docker:**

```bash
docker run -d -p 8080:3000 methodology-mock
```

---

## 7. Verificación del Despliegue

### 7.1 Pruebas de Funcionalidad

Una vez desplegado, verifique los siguientes endpoints:

**Health Check:**

```bash
curl http://localhost:3000/health
```

**Login (obtener token):**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mock.local","password":"Admin123!"}'
```

Debería obtener una respuesta con el token de acceso:

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 21600
  }
}
```

### 7.2 Prueba de Creación de Instrumento

```bash
# Reemplace TOKEN con el token obtenido en el paso anterior
curl -X POST http://localhost:3000/api/v1/instruments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Instrumento Demo","start_date":"2026-01-01","end_date":"2026-12-31"}'
```

---

## 8. Integración con Frontend

### 8.1 Configuración del Frontend

Para que el frontend se conecte al Mock Server, configure la URL base:

```
http://localhost:3000/api/v1
```

### 8.2 Flujo de Autenticación

1. El usuario ingresa sus credenciales en el frontend
2. El frontend envía POST a `/api/v1/auth/login`
3. El Mock Server retorna el access_token
4. El frontend incluye el token en el header Authorization: Bearer {token}
5. El frontend puede acceder a los endpoints protegidos

---

## 9. Mantenimiento y Operaciones

### 9.1 Reinicio del Servidor

**Node.js:**
Presione Ctrl+C para detener y ejecute nuevamente `npm start`.

**Docker:**
```bash
docker restart mock-server
```

### 9.2 Visualización de Logs

**Node.js:**
Los logs se muestran en la terminal donde se ejecutó el comando.

**Docker:**
```bash
docker logs mock-server
```

Para logs en tiempo real:
```bash
docker logs -f mock-server
```

### 9.3 Consideraciones sobre Datos

**Importante:** El Mock Server almacena todos los datos en memoria. Esto significa que:

- Los datos se pierden al reiniciar el servidor
- No hay persistencia entre despliegues
- Es adecuado para desarrollo y pruebas, NO para producción

Para un entorno de producción, se requiere la implementación del backend completo con base de datos PostgreSQL.

---

## 10. Solución de Problemas

### 10.1 Problemas Comunes

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| Puerto en uso | Otro proceso usa el puerto 3000 | Cambie el puerto con la variable PORT |
| Error de conexión | Servidor no iniciado | Verifique que el servidor esté ejecutándose |
| Token inválido | Secreto JWT diferente | Asegúrese de usar el mismo JWT_SECRET |
| Contenedor no inicia | Puerto mapeado incorrecto | Verifique el mapeo de puertos |

### 10.2 Verificación de Estado

```bash
# Verificar proceso Node.js
ps aux | grep "node src/index.js"

# Verificar contenedor Docker
docker ps -a | grep mock-server

# Verificar puertos en uso
netstat -tlnp | grep 3000  # Linux
netstat -ano | findstr 3000  # Windows
```

---

## 11. Recomendaciones para Presentación al Cliente

### 11.1 Preparación Previa

1. **Verificar funcionamiento:** Antes de la presentación, ejecute todos los comandos de verificación para asegurar que todo funciona
2. **Credenciales de demo:** Tenga credenciales de prueba listas
3. **Escenarios preparados:** Prepare ejemplos de flujo (login, crear instrumento, registrar sujeto)
4. **Captura de pantalla:** Documente los pasos con capturas de pantalla como respaldo

### 11.2 Durante la Presentación

1. **Conexión local recomendada:** Use el despliegue local o Docker en la máquina de presentación
2. **Explique las limitaciones:** Haga énfasis en que es un mock y los datos no persisten
3. **Muestre la arquitectura:** Utilice la estructura de archivos para explicar el diseño
4. **Demonstre el flujo completo:** From login hasta captura de valores de métricas

### 11.3 Puntos Clave para Destacar

- **Funcionalidad completa:** La API implementa todos los módulos del sistema
- **Seguridad real:** JWT, RBAC, rate limiting, protección contra ataques
- **Fácil despliegue:** Docker permite comenzar en minutos
- **Listo para integración:** El frontend puede conectarse inmediatamente
- **Validaciones completas:** Tipos de datos, rangos, campos requeridos

---

## 12. Información de Contacto y Soporte

Para consultas técnicas o problemas con el despliegue:

1. Verifique esta guía de despliegue completamente
2. Revise los logs del servidor para mensajes de error
3. Consulte la documentación en `mock/README.md`
4. Verifique los contratos XML en `mock/responses/`

---

## 13. Resumen de Comandos Rápidos

### Despliegue Local

```bash
cd mock
npm install
npm start
```

### Despliegue Docker

```bash
# Construir
docker build -t methodology-mock ./mock

# Ejecutar
docker run -d -p 3000:3000 --name mock-server methodology-mock

# Verificar
curl http://localhost:3000/health
```

### Credenciales por Defecto

- **Usuario:** admin@mock.local
- **Contraseña:** Admin123!

---

*Documento creado para el despliegue del Mock Server del Sistema de Registro Metodológico de Métricas Lingüísticas*
