import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import match_router, status_router

load_dotenv()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Hire Me Maybe - ML Matching Service",
        description="Resume-to-JD matching engine with BM25 + semantic (MiniLM) fusion scoring.",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    async def root():
        return {
            "service": "hire-me-maybe-ml",
            "version": "1.0.0",
            "endpoints": {
                "health": "/status/health",
                "services": "/status/services",
                "models": "/status/models",
                "stages": "/status/stages",
                "match": "POST /match (multipart/form-data: jd + resumes[])",
                "match_text": "POST /match/text",
            },
        }

    app.include_router(match_router)
    app.include_router(status_router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
