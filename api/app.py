from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from api.http_sedapal import SedapalHTTP
import os

app = FastAPI(title="SEDAPAL Backend (HTTP)")
origins = [
    "http://localhost:8080",
    "https://hansdou.github.io",
    "https://hansdou.github.io/sedapal-pwa",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = SedapalHTTP()

@app.get("/api/test")
def test():
    return {
        "ok": True,
        "mode": "HTTP-DIRECT",
        "page_size": int(os.getenv("SEDAPAL_PAGE_SIZE", "42")),
        "target_max": int(os.getenv("TARGET_MAX_RECIBOS", "30")),
    }

@app.get("/api/recibos/{nis}")
def recibos(nis: int):
    try:
        items = client.fetch_all_recibos(nis)
        return {"ok": True, "total": len(items), "items": items, "source": "SEDAPAL_HTTP"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pdf/{nis}/{recibo}")
def pdf(nis: int, recibo: str):
    try:
        items = client.fetch_all_recibos(nis)
        item = next((x for x in items if str(x.get("recibo")) == str(recibo)), None)
        if not item:
            raise HTTPException(status_code=404, detail="Recibo no encontrado")
        pdf_bytes = client.fetch_pdf_bytes(
            nis=nis,
            sec_nis=int(item.get("sec_nis", 0)),
            sec_rec=int(item.get("sec_rec", 0)),
            f_fact=str(item.get("f_fact") or item.get("mes")),
        )
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Cache-Control": "public, max-age=86400"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))