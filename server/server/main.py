"""FastAPI application: REST API, session WebSocket and (when built) the React app from app/web/dist."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import __version__, api, config, ws

log = logging.getLogger("uvicorn.error")


def create_app() -> FastAPI:
    config.ensure_meta()
    app = FastAPI(title="Interview Coach", version=__version__, docs_url="/api/docs", redoc_url=None,
                  openapi_url="/api/openapi.json")
    app.include_router(api.router)
    app.include_router(ws.router)

    @app.middleware("http")
    async def no_store(request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        return response

    dist = config.web_dist_dir()
    if dist.joinpath("index.html").is_file():
        if dist.joinpath("assets").is_dir():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        async def spa(path: str):
            if path.startswith(("api/", "ws/")):
                return JSONResponse({"detail": {"code": "not_found", "message": "Not found."}}, status_code=404)
            target = (dist / path).resolve()
            if path and target.is_file() and dist.resolve() in target.parents:
                return FileResponse(target)
            return FileResponse(dist / "index.html")
    else:
        @app.get("/", include_in_schema=False)
        async def root():
            return JSONResponse({"app": "Interview Coach API", "version": __version__,
                                 "ui": "Not built yet. Build app/web (npm run build) or run its dev server.",
                                 "docs": "/api/docs"})
    return app


app = create_app()
