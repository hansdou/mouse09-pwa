from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import base64
import tempfile
from datetime import datetime

# Importar desde directorio padre
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from encontrarpdf import SedapalBuscadorInteractivo

app = Flask(__name__)
CORS(app)

# Credenciales desde variables de entorno (más seguro)
EMAIL = os.environ.get('SEDAPAL_EMAIL', 'francovas2407@hotmail.com')
PASSWORD = os.environ.get('SEDAPAL_PASSWORD', 'Atilio123')

@app.route('/api/recibos/<suministro>', methods=['GET'])
def obtener_recibos(suministro):
    buscador = None
    try:
        print(f"🔍 Búsqueda para suministro: {suministro}")
        
        buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
        
        if not buscador.configurar_driver():
            return jsonify({"error": "Error configurando navegador"}), 500
        
        if not buscador.login_automatico():
            return jsonify({"error": "Error en login"}), 500
        
        if buscador.obtener_todos_los_recibos(suministro):
            recibos_para_pwa = []
            for i, recibo in enumerate(buscador.recibos_completos):
                recibo_pwa = {
                    "recibo": recibo.get('recibo', f'REC-{i+1}'),
                    "color_estado": recibo.get('color_estado', '📄'),
                    "f_fact": recibo.get('f_fact', ''),
                    "vencimiento": recibo.get('vencimiento', ''),
                    "total_fact": str(recibo.get('total_fact', 0)),
                    "periodo": recibo.get('mes', ''),
                    "estado": recibo.get('estado_pago', ''),
                    "nis_rad": int(suministro),
                    "tipo_recibo": "Consumo de agua",
                    "es_deuda": recibo.get('es_deuda', False),
                    "datos_reales": True,
                    "fuente": "ENCONTRARPDF.PY - VERCEL",
                    "index": i + 1
                }
                recibos_para_pwa.append(recibo_pwa)
            
            recibos_para_pwa.reverse()
            
            return jsonify({
                "success": True,
                "recibos": recibos_para_pwa,
                "total": len(recibos_para_pwa),
                "message": f"✅ {len(recibos_para_pwa)} recibos obtenidos",
                "fuente": "Vercel Cloud"
            })
        else:
            return jsonify({"error": f"No se encontraron recibos para {suministro}"}), 404
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return jsonify({"error": str(e)}), 500
        
    finally:
        if buscador and hasattr(buscador, 'driver') and buscador.driver:
            try:
                buscador.driver.quit()
            except:
                pass

@app.route('/api/pdf/<suministro>/<recibo_id>', methods=['GET'])
def descargar_pdf(suministro, recibo_id):
    # Mismo código que tienes, adaptado para Vercel
    # ... (tu código del PDF)
    pass

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        "success": True,
        "message": "🚀 SEDAPAL API funcionando en Vercel",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/api/test",
            "/api/recibos/<suministro>",
            "/api/pdf/<suministro>/<recibo_id>"
        ]
    })

# Para Vercel
if __name__ == '__main__':
    app.run(debug=True)