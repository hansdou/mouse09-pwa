import os, json, base64, time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
import requests

BASE = "https://webapp16.sedapal.com.pe/OficinaComercialVirtual/api"
ORIGIN = "https://webapp16.sedapal.com.pe"
REFERER = "https://webapp16.sedapal.com.pe/socv/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36"

MAX_PAGE_SIZE = int(os.getenv("SEDAPAL_PAGE_SIZE", "42"))
TARGET_MAX = int(os.getenv("TARGET_MAX_RECIBOS", "30"))

_RECIBOS_CACHE: Dict[int, Dict[str, Any]] = {}
_PDF_CACHE: Dict[Tuple[int, str], Dict[str, Any]] = {}

class SedapalHTTP:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers.update({
            "Accept": "application/json, text/plain, */*",
            "Origin": ORIGIN,
            "Referer": REFERER,
            "User-Agent": UA,
        })
        self.token: Optional[str] = None
        self.token_exp: Optional[datetime] = None
        self.user = os.getenv("SEDAPAL_USER", "")
        self.password = os.getenv("SEDAPAL_PASS", "")
        self.login_app_auth = os.getenv("SEDAPAL_LOGIN_APP_AUTH", "")

    def _token_alive(self) -> bool:
        return self.token and self.token_exp and datetime.utcnow() < (self.token_exp - timedelta(minutes=2))

    def _set_token(self, token: str):
        self.token = token
        try:
            parts = token.split(".")
            if len(parts) == 3:
                pad = "=" * ((4 - len(parts[1]) % 4) % 4)
                payload = json.loads(base64.urlsafe_b64decode(parts[1] + pad).decode())
                exp = int(payload.get("exp", 0))
                self.token_exp = datetime.utcfromtimestamp(exp)
            else:
                self.token_exp = datetime.utcnow() + timedelta(minutes=30)
        except Exception:
            self.token_exp = datetime.utcnow() + timedelta(minutes=30)
        self.s.headers["Authorization"] = self.token

    def login(self):
        if not self.user or not self.password or not self.login_app_auth:
            raise RuntimeError("Faltan SEDAPAL_USER, SEDAPAL_PASS y SEDAPAL_LOGIN_APP_AUTH")
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": self.login_app_auth,
        }
        data = f"username={self.user}&password={self.password}"
        r = self.s.post(f"{BASE}/login", headers=headers, data=data, timeout=30)
        r.raise_for_status()
        payload = r.json()
        token = (payload or {}).get("bRESP", {}).get("token")
        if not token:
            raise RuntimeError("Login sin token")
        self._set_token(token)

    def ensure_session(self):
        if not self._token_alive():
            self.login()

    def _post_json(self, url: str, body: dict, timeout=40) -> dict:
        self.ensure_session()
        r = self.s.post(url, json=body, timeout=timeout)
        if r.status_code in (401, 403):
            self.login()
            r = self.s.post(url, json=body, timeout=timeout)
        r.raise_for_status()
        return r.json()

    def _list_generic(self, url: str, nis: int, page_num: int, page_size: int) -> List[dict]:
        body = {"nis_rad": nis, "page_num": page_num, "page_size": page_size}
        resp = self._post_json(url, body)
        return (resp or {}).get("bRESP", []) or []

    def fetch_all_recibos(self, nis: int) -> List[dict]:
        cached = _RECIBOS_CACHE.get(nis)
        if cached and cached["exp"] > datetime.utcnow():
            return cached["data"]

        deudas_url = f"{BASE}/recibos/lista-recibos-deudas-nis"
        pagos_url  = f"{BASE}/recibos/lista-recibos-pagados-nis"
        results: List[dict] = []

        try:
            results.extend(self._list_generic(deudas_url, nis, 1, MAX_PAGE_SIZE))
        except Exception:
            pass

        page = 1
        while len(results) < TARGET_MAX and page <= 10:
            items = self._list_generic(pagos_url, nis, page, MAX_PAGE_SIZE)
            if not items:
                break
            results.extend(items)
            page += 1

        def keyf(it):
            val = it.get("f_fact") or it.get("mes") or ""
            try:
                return datetime.fromisoformat(str(val)[:10])
            except Exception:
                return datetime.min
        results.sort(key=keyf, reverse=True)
        results = results[:TARGET_MAX]

        _RECIBOS_CACHE[nis] = {"data": results, "exp": datetime.utcnow() + timedelta(minutes=10)}
        return results

    def fetch_pdf_bytes(self, nis: int, sec_nis: int, sec_rec: int, f_fact: str) -> bytes:
        k = (nis, f"{sec_nis}-{sec_rec}-{f_fact}")
        c = _PDF_CACHE.get(k)
        if c and c["exp"] > datetime.utcnow():
            return c["bytes"]

        url = f"{BASE}/recibos/recibo-pdf"
        body = {"nis_rad": nis, "sec_nis": sec_nis, "sec_rec": sec_rec, "f_fact": f_fact}
        resp = self._post_json(url, body, timeout=60)
        blob = (resp or {}).get("bresp") or (resp or {}).get("bRESP")

        if isinstance(blob, str):
            pdf = base64.b64decode(blob)
        elif isinstance(blob, dict) and "content" in blob:
            pdf = base64.b64decode(blob["content"])
        else:
            raise RuntimeError("Respuesta PDF inesperada")

        _PDF_CACHE[k] = {"bytes": pdf, "exp": datetime.utcnow() + timedelta(hours=12)}
        return pdf