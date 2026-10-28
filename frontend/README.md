"# el-perfumista-frontend" 

## Producción en Vercel

`vercel.json` reenvía `/api/*` y `/media/*` al servicio de Render antes de
aplicar el fallback de la aplicación (`/index.html`). Así, las llamadas del
navegador pueden seguir mostrando el dominio de Vercel en Network, pero sus
respuestas provienen del backend; las imágenes también se sirven desde Render.
Después de cambiar estas reglas, despliega de nuevo el proyecto en Vercel."
