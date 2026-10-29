"""Radiology AI Copilot service.

Internal service called only by the Node.js API (never directly by the
browser), so it exposes no CORS policy. Run with:

    uvicorn app:app --host 127.0.0.1 --port 8001
"""

from fastapi import FastAPI

from router import router

app = FastAPI(title="Radiology AI Copilot", version="1.0.0")

app.include_router(router)


@app.get("/")
async def root():
    return {"success": True, "service": "Radiology AI Copilot", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
