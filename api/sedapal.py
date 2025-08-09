from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import base64
import tempfile
from datetime import datetime

# ✅ ARREGLO PARA RAILWAY:
sys.path.append('/app')
sys.path.append('.')
sys.path.append('..')
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')

try:
    from encontrarpdf import SedapalBuscadorInteractivo
    print("✅ encontrarpdf.py importado exitosamente")
except ImportError as e:
    print(f"❌ ERROR IMPORTANDO encontrarpdf.py: {e}")
    # Continuar sin crash
    SedapalBuscadorInteractivo = None

app = Flask(__name__)
CORS(app)

# Credenciales desde variables de entorno
EMAIL = os.environ.get('SEDAPAL_EMAIL')
PASSWORD = os.environ.get('SEDAPAL_PASSWORD')
PORT = int(os.environ.get('PORT', 5000))

print(f"🚀 === RAILWAY BACKEND REAL INICIANDO ===")
print(f"🔑 EMAIL configurado: {EMAIL is not None}")
print(f"🔑 PASSWORD configurado: {PASSWORD is not None}")

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({
        "success": True,
        "message": "🔥 RAILWAY con DATOS REALES funcionando",
        "timestamp": datetime.now().isoformat(),
        "email_configured": EMAIL is not None,
        "encontrarpdf_available": True,
        "backend_type": "REAL_DATA_RAILWAY"
    })

@app.route('/api/recibos/<suministro>', methods=['GET'])
def obtener_recibos_reales(suministro):
    try:
        # ✅ VERIFICAR SI SE IMPORTÓ
        if SedapalBuscadorInteractivo is None:
            return jsonify({"error": "encontrarpdf.py no se pudo importar"}), 500
        
        print(f"\n🔍 === BÚSQUEDA REAL RAILWAY ===")
        print(f"📋 Suministro: {suministro}")
        print(f"🔑 Email: {EMAIL}")
        
        print("🌐 Configurando navegador para Render...")
        if not buscador.configurar_driver():
            return jsonify({"error": "Error configurando navegador en Render"}), 500
        
        if not EMAIL or not PASSWORD:
            return jsonify({"error": "Credenciales no configuradas en Render"}), 500
        
        print("🔐 Haciendo login REAL a SEDAPAL...")
        if not buscador.login_automatico():
            return jsonify({"error": "Error en login REAL - credenciales incorrectas"}), 500
        
        print("📋 Obteniendo recibos REALES de SEDAPAL...")
        if buscador.obtener_todos_los_recibos(suministro):
            
            # Convertir TUS recibos REALES al formato PWA
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
                    "datos_reales": True,  # ✅ 100% REAL
                    "fuente": "RENDER + ENCONTRARPDF.PY - 100% REAL",
                    "index": i + 1
                }
                recibos_para_pwa.append(recibo_pwa)
            
            recibos_para_pwa.reverse()  # Más recientes primero
            
            print(f"✅ {len(recibos_para_pwa)} recibos REALES obtenidos exitosamente")
            
            return jsonify({
                "success": True,
                "recibos": recibos_para_pwa,
                "total": len(recibos_para_pwa),
                "message": f"✅ {len(recibos_para_pwa)} recibos REALES de SEDAPAL",
                "fuente": "RENDER REAL DATA"
            })
        else:
            return jsonify({"error": f"No se encontraron recibos para suministro {suministro}"}), 404
            
    except Exception as e:
        print(f"❌ ERROR REAL: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "details": "Error obteniendo datos REALES de SEDAPAL",
            "suministro": suministro
        }), 500
        
    finally:
        if buscador and hasattr(buscador, 'driver') and buscador.driver:
            try:
                buscador.driver.quit()
                print("🔒 Navegador cerrado correctamente")
            except:
                pass

@app.route('/api/pdf/<suministro>/<recibo_id>', methods=['GET'])
def descargar_pdf_real_railway(suministro, recibo_id):
    """PDF REAL usando encontrarpdf.py en Railway"""
    buscador = None
    try:
        print(f"\n📄 === DESCARGA PDF REAL RAILWAY ===")
        print(f"📋 Suministro: {suministro}")
        print(f"🧾 Recibo ID: {recibo_id}")
        
        # Mismo código que funciona en local
        buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
        
        if not buscador.configurar_driver():
            return jsonify({"error": "Error configurando navegador"}), 500
        
        if not buscador.login_automatico():
            return jsonify({"error": "Error en login"}), 500
        
        if not buscador.obtener_todos_los_recibos(suministro):
            return jsonify({"error": "Error obteniendo lista de recibos"}), 500
        
        # Buscar el índice correcto del recibo
        indice_recibo = None
        for i, recibo in enumerate(buscador.recibos_completos):
            if str(recibo.get('recibo')) == str(recibo_id):
                indice_recibo = i + 1
                break
        
        if not indice_recibo:
            return jsonify({"error": f"Recibo {recibo_id} no encontrado"}), 404
        
        # Crear directorio temporal
        temp_dir = tempfile.mkdtemp()
        original_dir = os.getcwd()
        
        try:
            os.chdir(temp_dir)
            print(f"🔄 Descargando PDF REAL usando índice #{indice_recibo}...")
            
            # ✅ USAR ENCONTRARPDF.PY REAL
            resultado = buscador.descargar_pdf_recibo(indice_recibo)
            
            if resultado:
                # Buscar archivo PDF generado
                archivos_pdf = [f for f in os.listdir('.') if f.endswith('.pdf')]
                
                if archivos_pdf:
                    archivo_pdf = archivos_pdf[0]
                    
                    with open(archivo_pdf, 'rb') as f:
                        pdf_bytes = f.read()
                        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                    
                    if len(pdf_bytes) > 5000:  # PDF real
                        return jsonify({
                            "success": True,
                            "pdf_base64": pdf_base64,
                            "filename": archivo_pdf,
                            "message": "PDF REAL descargado de SEDAPAL",
                            "tamaño": len(pdf_bytes),
                            "fuente": "RAILWAY + SEDAPAL REAL",
                            "tipo": "PDF_REAL_SEDAPAL"
                        })
                        
        finally:
            os.chdir(original_dir)
            import shutil
            try:
                shutil.rmtree(temp_dir)
            except:
                pass
                
    except Exception as e:
        print(f"❌ ERROR PDF: {e}")
        return jsonify({"error": str(e)}), 500
        
    finally:
        if buscador and hasattr(buscador, 'driver') and buscador.driver:
            try:
                buscador.driver.quit()
            except:
                pass

if __name__ == '__main__':
    print("🔥 === RAILWAY BACKEND REAL INICIANDO ===")
    print(f"📧 Email: {EMAIL}")
    print(f"🔑 Password configurado: {PASSWORD is not None}")
    print(f"🌐 Puerto: {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)