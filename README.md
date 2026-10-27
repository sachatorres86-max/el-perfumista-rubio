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

### Cuentas iniciales

En el primer arranque se crean las cuentas configuradas en `backend\.env`:
`ADMIN_EMAIL` / `ADMIN_PASSWORD` para el administrador y
`vendedor@elperfumistarubio.com` / `SELLER_PASSWORD` para el vendedor. Define
claves propias antes de iniciar la aplicación. La semilla no cambia la clave de
una cuenta que ya exista.

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
│  ├─ .env.example           Plantilla de configuración (versionada)
│  ├─ .env                   Configuración local (ignorada por Git)
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
│  ├─ package-lock.json
│  └─ dist/                  Compilación local (ignorada por Git)
```

---

## 4. Requisitos del equipo

- Windows 10/11
- PostgreSQL 16 (el ejemplo usa `127.0.0.1:5433`; ajusta el puerto si tu
  instalación usa otro)
- Python 3.12
- Node.js 20+ y npm (necesarios para instalar y compilar el frontend)

---

## 5. Instalación desde cero

Estos pasos aplican a un clon nuevo o a una instalación en otro computador.
Los entornos virtuales, `node_modules`, `dist` y `.env` se excluyen del
repositorio mediante `.gitignore`, así que deben prepararse localmente.

```powershell
# 1. Inicia PostgreSQL y crea un usuario y una base vacía.
# Ejecuta estos comandos con una cuenta administradora de PostgreSQL.
# Reemplaza la contraseña de ejemplo por una propia.
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -c "CREATE ROLE perfumista LOGIN PASSWORD 'CAMBIA_ESTA_CLAVE';"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -p 5433 -c "CREATE DATABASE perfumista OWNER perfumista;"

# 2. Configura el backend. El archivo real .env no se versiona.
Copy-Item backend\.env.example backend\.env
notepad backend\.env
# En backend\.env configura DATABASE_URL con la misma clave del usuario
# de PostgreSQL y define SECRET_KEY, ADMIN_PASSWORD y SELLER_PASSWORD propios.

# 3. Instala las dependencias del backend
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# 4. Instala y compila el frontend (dist no está incluido en Git)
Set-Location ..\frontend
npm.cmd install
npm.cmd run build

# 5. Vuelve a la raíz y arranca la aplicación
Set-Location ..
.\start.bat
```

Con `AUTO_INIT_DB=true`, en el primer arranque el backend crea las tablas que
faltan y carga los datos de demostración definidos en `backend\app\seed.py`
(catálogo, insumos, configuración y cuentas iniciales). La base y el usuario de
PostgreSQL deben existir y ser accesibles con `DATABASE_URL`; la aplicación no
crea el servidor, el usuario ni la base de datos. La inicialización no reemplaza
datos existentes. `create_all` crea tablas ausentes, pero no migra ni modifica
tablas existentes cuando cambia el modelo; para esos cambios se requiere una
migración planificada.

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
| `SELLER_PASSWORD` | Clave de la cuenta vendedora creada en el primer arranque |
| `AUTO_INIT_DB` | Crea tablas y datos demo al iniciar |

`backend\.env.example` contiene valores de ejemplo, no credenciales listas para
usar. Copia el archivo a `backend\.env`, cambia las claves y no compartas ni
versiones el `.env`. Si una contraseña de PostgreSQL contiene caracteres
reservados en una URL, codifícalos para URL en `DATABASE_URL`.

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
| No recuerdo la contraseña de una cuenta | `ADMIN_PASSWORD` y `SELLER_PASSWORD` solo se aplican al crear las cuentas. La semilla no restablece claves de usuarios existentes; no hay recuperación de contraseña desde la interfaz. |

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
