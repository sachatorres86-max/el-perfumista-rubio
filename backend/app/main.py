from contextlib import asynccontextmanager
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
    admin_reports,
    admin_settings,
    auth,
    public,
)
from app.seed import seed_all


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.auto_init_db:
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            seed_all(db)
    yield


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
app.include_router(admin_products.router)
app.include_router(admin_catalog.router)
app.include_router(admin_inventory.router)
app.include_router(admin_reports.router)
app.include_router(admin_settings.router)
app.include_router(admin_dashboard.router)

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
