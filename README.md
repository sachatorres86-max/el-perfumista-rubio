# El Perfumista Rubio · Catálogo virtual e inventario

Aplicación web local para **El Perfumista Rubio**: catálogo público de fragancias
(sin precios, solo disponibilidad) y panel interno para administrar productos,
presentaciones, insumos, stock y reportes.

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Moneda:** pesos colombianos (COP)
- **Idioma de la interfaz:** español

---

## 1. Inicio rápido

1. Haz doble clic en **`start.bat`** (en la raíz del proyecto).
2. El script comprueba PostgreSQL (puerto **5433**), inicia el servidor y abre
   el navegador en <http://127.0.0.1:8000>.
3. Para detenerlo, cierra la ventana negra o ejecuta **`stop.bat`**.

> Si PostgreSQL no arranca automáticamente, abre una consola como
> administrador y ejecuta `net start postgresql-x64-16`, o inicia el servicio
> **PostgreSQL 16** desde *Servicios* de Windows.

### Direcciones

| Uso | URL |
| --- | --- |
| Catálogo público | <http://127.0.0.1:8000/> |
| Panel interno | <http://127.0.0.1:8000/admin> |
| Documentación de la API | <http://127.0.0.1:8000/docs> |
| Salud del servicio | <http://127.0.0.1:8000/api/health> |

### Credenciales iniciales

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@elperfumistarubio.com` | `Perfumista2026!` |
| Vendedor | `vendedor@elperfumistarubio.com` | `Vendedor2026!` |

> Cambia estas contraseñas antes de publicar el sitio en internet.

---

## 2. Qué incluye

### Sitio público
- Inicio con fragancias destacadas, familias olfativas y datos del negocio.
- Catálogo con búsqueda, filtros por familia, tipo, nota y disponibilidad.
- Ficha de producto con notas de salida, corazón y fondo, presentaciones e
  imágenes.
- Página de contacto con WhatsApp, horario, Instagram y los dos locales.
- **Nunca muestra precios**: solo `Disponible` / `Agotado` y el botón de
  consulta por WhatsApp.
- Diseño adaptable (móvil, tableta y escritorio) e instalable como PWA.

### Panel interno
- **Panel:** resumen de productos, presentaciones, insumos, valor del
  inventario, alertas y últimos movimientos.
- **Productos:** alta, edición, imágenes, notas, presentaciones, precios y
  stock; activar/desactivar publicación.
- **Insumos:** esencias, fijadores, alcohol, frascos y accesorios, con costo
  unitario y stock mínimo.
- **Inventario:** historial de entradas, salidas y ajustes para productos
  terminados e insumos, con usuario y motivo.
- **Catálogo:** familias olfativas y notas.
- **Reportes:** alertas de stock, valor del inventario, actualización masiva de
  precios y exportación CSV (inventario, agotados, stock bajo).
- **Configuración:** datos de contacto, horarios, locales y textos de inicio
  (solo administradores).

### Roles
- **Administrador:** todo el sistema.
- **Vendedor:** catálogo, productos, insumos, inventario y reportes. No puede
  cambiar la configuración ni crear/eliminar familias y notas.

---

## 3. Estructura del proyecto

```
el-perfumista-rubio/
├─ start.bat                 Inicia PostgreSQL + servidor + navegador
├─ stop.bat                  Detiene el servidor
├─ scripts/
│  └─ rebuild-frontend.bat   Recompila la interfaz React
├─ backend/
│  ├─ .venv/                 Entorno virtual de Python
│  ├─ .env                   Configuración local (BD, secretos, admin)
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ main.py             Aplicación FastAPI y servido del frontend
│  │  ├─ models.py           Modelos SQLAlchemy
│  │  ├─ schemas.py          Esquemas Pydantic
│  │  ├─ seed.py             Datos demo idempotentes
│  │  ├─ core/               Configuración, BD, seguridad, utilidades
│  │  ├─ routers/            Endpoints públicos y de administración
│  │  └─ services/           Serializadores
│  ├─ media/products/        Imágenes de productos (WebP)
│  ├─ scripts/               Generador de imágenes de ejemplo
│  └─ tests/                 Pruebas automatizadas (pytest)
├─ frontend/
│  ├─ src/                   Código React + TypeScript
│  ├─ public/                Logo, iconos PWA y portada
│  └─ dist/                  Compilación servida por FastAPI
└─ docs/                     Documentación adicional
```

---

## 4. Requisitos del equipo

- Windows 10/11
- PostgreSQL 16 en el puerto **5433**
- Python 3.12 (entorno virtual ya creado en `backend\.venv`)
- Node.js 20+ (solo para recompilar la interfaz)

Base de datos creada:

- Servidor: `127.0.0.1:5433`
- Base de datos: `perfumista`
- Usuario: `perfumista`
- Contraseña: `Perfumista2026`

> El puerto **5432** pertenece a otra instalación de PostgreSQL en este equipo.
> No lo uses para este proyecto.

---

## 5. Instalación desde cero

Solo es necesario si se mueve el proyecto a otro computador.

```powershell
# 1. Base de datos (con PostgreSQL 16 instalado)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -c "CREATE ROLE perfumista LOGIN PASSWORD 'Perfumista2026';"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -c "CREATE DATABASE perfumista OWNER perfumista;"

# 2. Backend
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 3. Frontend
cd ..\frontend
npm.cmd install
npm.cmd run build
```

Al iniciar el backend, las tablas y los datos demo se crean automáticamente
(`AUTO_INIT_DB=true`). El proceso es idempotente: no duplica información.

---

## 6. Configuración

Archivo `backend\.env`:

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `SECRET_KEY` | Firma de las sesiones JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración de la sesión (480 = 8 h) |
| `COOKIE_SECURE` | `true` solo con HTTPS |
| `CORS_ORIGINS` | Orígenes permitidos en desarrollo |
| `MEDIA_DIR` | Carpeta de imágenes |
| `FRONTEND_DIST` | Compilación de React que sirve FastAPI |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Administrador creado en el primer arranque |
| `AUTO_INIT_DB` | Crea tablas y datos demo al iniciar |

Los datos de contacto, horarios y textos también se editan desde
**Panel → Configuración**, sin tocar archivos.

---

## 7. Tareas frecuentes

### Recompilar la interfaz después de cambiar el diseño
```powershell
.\scripts\rebuild-frontend.bat
```
Luego reinicia el servidor (`stop.bat` y `start.bat`).

### Ejecutar las pruebas del backend
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```
Las pruebas usan SQLite en memoria; no modifican la base real.

### Respaldo de la base de datos
```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U perfumista -p 5433 -F c -f "C:\respaldos\perfumista.backup" perfumista
```

### Restaurar un respaldo
```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_restore.exe" -U perfumista -p 5433 -d perfumista --clean --if-exists "C:\respaldos\perfumista.backup"
```

### Regenerar las imágenes de ejemplo
```powershell
cd backend
.\.venv\Scripts\python.exe scripts\generate_placeholders.py
```

### Modo desarrollo con recarga automática
```powershell
# Terminal 1
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend
npm.cmd run dev
```
La interfaz de desarrollo queda en <http://localhost:5173> y redirige `/api` y
`/media` al backend.

---

## 8. Problemas comunes

| Síntoma | Solución |
| --- | --- |
| “No se pudo conectar a PostgreSQL” | Inicia el servicio `postgresql-x64-16` o revisa el puerto 5433 en `backend\.env`. |
| La página carga sin estilos o en blanco | Falta `frontend\dist`: ejecuta `scripts\rebuild-frontend.bat`. |
| El puerto 8000 está ocupado | Ejecuta `stop.bat` o cierra el proceso con `Get-NetTCPConnection -LocalPort 8000`. |
| `npm` no se ejecuta en PowerShell | Usa `npm.cmd` o el script `scripts\rebuild-frontend.bat`. |
| Cambios en el diseño no aparecen | Recompila y reinicia; el navegador puede conservar la PWA en caché (recarga forzada con `Ctrl + F5`). |
| No recuerdo la contraseña del administrador | Restablécela desde Python con `hash_password` o vuelve a crear el usuario en la base. |

---

## 9. Notas de seguridad y alcance

- La aplicación está pensada para ejecutarse **solo en la red local**.
- Las sesiones usan una cookie `httpOnly` firmada; las contraseñas se guardan
  con Argon2.
- El inicio de sesión limita los intentos fallidos por dirección y correo.
- El catálogo público omite deliberadamente todos los precios y el stock exacto.
- Antes de publicar en internet: usa HTTPS, activa `COOKIE_SECURE=true`, cambia
  `SECRET_KEY` y las contraseñas iniciales, y restringe `CORS_ORIGINS`.
"# el-perfumista-rubio" 
