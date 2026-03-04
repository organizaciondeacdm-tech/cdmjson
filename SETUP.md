# ACDM - Sistema de Gestión de Asistentes de Clase
## Guía de Configuración y Deployment

### 📋 Requisitos
- Node.js v16 o superior
- npm o yarn
- MongoDB (local o Atlas)
- Cuenta en Vercel (para deployment)

### 🚀 Desarrollo Local

#### 1. Instalación de dependencias
```bash
npm install
```

#### 2. Configurar variables de entorno
Copia el archivo `.env.example`:
```bash
cp .env .env.local
```

Actualiza las variables necesarias:
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/acdm_db
JWT_SECRET=tu_secreto_super_seguro
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
```

#### 3. Iniciar el servidor backend
```bash
npm run dev
# Escuchará en http://localhost:5000
```

#### 4. En otra terminal, iniciar el frontend con Vite
```bash
npm run dev:frontend
# Escuchará en http://localhost:3000
# Automáticamente redirige `/api/*` a http://localhost:5000
```

#### 5. Acceder a la aplicación
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

**Usuario demo:**
- Usuario: `admin`
- Contraseña: `admin2025`

### 🔗 Integración Backend-Frontend

#### La capa de API (`acdm-api.js`)
Proporciona métodos para comunicarse con el backend:

```javascript
import apiService from './acdm-api.js';

// Login
const result = await apiService.login(email, password);

// Cargar datos
const escuelas = await apiService.getEscuelas();
const docentes = await apiService.getDocentes();
const alumnos = await apiService.getAlumnos();

// Crear/Actualizar/Eliminar
await apiService.createEscuela(data);
await apiService.updateAlumno(id, data);
await apiService.deleteDocente(id);
```

#### Características de la integración:
- ✅ **Fallback offline**: Si el backend no está disponible, usa localStorage como fallback
- ✅ **Autenticación**: Maneja tokens JWT automáticamente
- ✅ **CORS configurado**: Permite requests desde el frontend
- ✅ **Rate limiting**: Protege el servidor de abuso

### 📦 Deployment en Vercel

#### 1. Preparar el proyecto para Vercel

**Los siguientes cambios ya están realizados:**
- ✅ Vite configurado para build
- ✅ vercel.json actualizado
- ✅ Backend como Serverless Functions
- ✅ Frontend compilado a carpeta `dist`

#### 2. Conectar tu repositorio a Vercel

```bash
# Subirlosmcambios a GitHub
git add .
git commit -m "Integración frontend-backend con Vercel"
git push origin main
```

Luego:
1. Ir a https://vercel.com/new
2. Importar tu repositorio
3. Vercel detectará automáticamente:
   - Build command: `npm run build`
   - Output directory: `dist`

#### 3. Configurar variables de entorno en Vercel

En el dashboard de Vercel, agregar:

**Environment Variables:**
```
NODE_ENV=production
MONGODB_URI=tu_mongodb_uri_produccion
JWT_SECRET=tu_secreto_muy_seguro_de_produccion
CORS_ORIGIN=https://tu-proyecto.vercel.app
```

**MongoDB Atlas (recomendado para producción):**
```
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/acdm_db
```

#### 4. Deployment

```bash
# Vercel desplegará automáticamente en cada push a main
git push origin main
# O manualmente:
vercel --prod
```

### 🏗️ Estructura del Proyecto
```
/workspaces/cdm
├── api/
│   └── index.js                 # Handler serverless de Vercel
├── src/
│   ├── app.js                   # Express app principal
│   ├── config/
│   │   ├── database.js          # Conexión MongoDB
│   │   └── auth.js              # Configuración JWT
│   ├── controllers/             # Lógica de negocio
│   ├── models/                  # Esquemas Mongoose
│   ├── routes/                  # Definición de rutas
│   └── middleware/              # Middlewares Express
├── public/
│   └── index.html               # HTML base del frontend
├── acdm-system.jsx              # Componente React principal
├── acdm-api.js                  # Capa de API cliente
├── index.jsx                    # Entry point Vite
├── vite.config.js               # Configuración Vite
├── vercel.json                  # Configuración Vercel
└── package.json
```

### 📡 Endpoints de la API

#### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/change-password` - Cambiar contraseña

#### Escuelas
- `GET /api/escuelas` - Listar todas
- `GET /api/escuelas/:id` - Obtener una
- `POST /api/escuelas` - Crear (requiere admin)
- `PUT /api/escuelas/:id` - Actualizar
- `DELETE /api/escuelas/:id` - Eliminar
- `GET /api/escuelas/buscar` - Buscar
- `GET /api/escuelas/estadisticas` - Estadísticas

#### Docentes
- `GET /api/docentes` - Listar
- `POST /api/docentes` - Crear
- `PUT /api/docentes/:id` - Actualizar
- `DELETE /api/docentes/:id` - Eliminar

#### Alumnos
- `GET /api/alumnos` - Listar
- `POST /api/alumnos` - Crear
- `PUT /api/alumnos/:id` - Actualizar
- `DELETE /api/alumnos/:id` - Eliminar

#### Reportes
- `GET /api/reportes` - Listar reportes
- `POST /api/reportes` - Generar reporte
- `GET /api/reportes/:id/export` - Exportar

### 🔐 Seguridad

El proyecto incluye:
- ✅ JWT para autenticación
- ✅ Bcrypt para contraseñas
- ✅ Helmet para headers seguros
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Sanitización de inputs
- ✅ XSS protection

### 🧪 Testing

```bash
# Probar que el backend está funcionando
curl http://localhost:5000/health

# Probar login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin2025"}'
```

### 📝 Variables de Entorno (Referencia)

| Variable | Descripción | Ejemplo |
|----------|------------|---------|
| `NODE_ENV` | Ambiente | `development` o `production` |
| `PORT` | Puerto del servidor | `5000` |
| `MONGODB_URI` | Conexión MongoDB | `mongodb://localhost:27017/acdm_db` |
| `JWT_SECRET` | Secreto JWT | `tu_secreto_super_seguro` |
| `CORS_ORIGIN` | Orígenes permitidos | `http://localhost:3000` |
| `BCRYPT_ROUNDS` | Rondas de hash | `12` |

### 🐛 Troubleshooting

**"Cannot find module 'acdm-api.js'"**
- Verifica que los archivos estén en la raíz del proyecto
- Revisa las rutas de import

**"CORS error cuando conecto desde el frontend"**
- Verifica que `CORS_ORIGIN` en `.env` incluya tu URL del frontend
- En desarrollo local: `http://localhost:3000`
- En producción: `https://tu-proyecto.vercel.app`

**"MongoDB connection failed"**
- Verifica que MongoDB está corriendo localmente o que tienes acceso a Atlas
- Revisa las credenciales en `MONGODB_URI`

**"401 Unauthorized"**
- El token JWT expiró, necesitas hacer login de nuevo
- Verifica que `JWT_SECRET` es el mismo en frontend y backend

### 📞 Soporte
Para reportar problemas o sugerencias, abre un issue en el repositorio.

---

**Última actualización:** Febrero 2026
**Versión:** 1.0.0
**Responsable:** PAPIWEB Desarrollos Informáticos
