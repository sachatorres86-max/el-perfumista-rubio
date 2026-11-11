import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.routers import (
    admin_catalog,
    admin_dashboard,
    admin_inventory,
    admin_products,
    admin_quotes,
    admin_reports,
    admin_settings,
    admin_users,
    auth,
    client_cart,
    public,
)
from app.seed import seed_all
from app.services.quotes import expire_pending_orders

logger = logging.getLogger(__name__)
ORDER_EXPIRY_CHECK_SECONDS = 300


async def _expire_orders_periodically() -> None:
    while True:
        await asyncio.sleep(ORDER_EXPIRY_CHECK_SECONDS)
        try:
            with SessionLocal() as db:
                expire_pending_orders(db)
        except Exception:
            logger.exception("No se pudieron cancelar los pedidos vencidos")


@asynccontextmanager
async def lifespan(_: FastAPI):
    expiry_task: asyncio.Task | None = None
    if settings.auto_init_db:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_all(db)
        expiry_task = asyncio.create_task(_expire_orders_periodically())
    yield
    if expiry_task is not None:
        expiry_task.cancel()
        with suppress(asyncio.CancelledError):
            await expiry_task


app = FastAPI(
    title="El Perfumista Rubio · API",
    description="Catálogo virtual y panel de inventario para El Perfumista Rubio.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(client_cart.router)
app.include_router(admin_products.router)
app.include_router(admin_catalog.router)
app.include_router(admin_inventory.router)
app.include_router(admin_reports.router)
app.include_router(admin_settings.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_quotes.router)
app.include_router(admin_users.router)

media_root = Path(settings.media_dir).resolve()
media_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_root), name="media")

dist_dir = Path(settings.frontend_dist).resolve()
if dist_dir.is_dir():
    assets_dir = dist_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        if full_path.startswith(("api/", "media/")) or full_path in {
            "docs",
            "redoc",
            "openapi.json",
        }:
            raise HTTPException(status_code=404, detail="No encontrado")

        candidate = (dist_dir / full_path).resolve()
        if candidate.is_file() and candidate.is_relative_to(dist_dir):
            return FileResponse(candidate)
        return FileResponse(dist_dir / "index.html")

else:

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "message": "API de El Perfumista Rubio",
            "docs": "/docs",
            "frontend": "Ejecuta `npm run build` en frontend/ para servir la interfaz.",
        }
