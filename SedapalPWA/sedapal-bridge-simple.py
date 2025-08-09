from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import base64
import tempfile
from datetime import datetime

# Agregar el directorio donde está encontrarpdf.py
sys.path.append(r'C:\Users\Home\Desktop\RecibosSedapal')

# Importar TU clase que SÍ funciona
from encontrarpdf import SedapalBuscadorInteractivo

app = Flask(__name__)
CORS(app)

# TUS credenciales que funcionan
EMAIL = "francovas2407@hotmail.com"
PASSWORD = "Atilio123"

# Variable global para reutilizar buscador
buscador_global = None
ultima_actividad = None

@app.route('/api/recibos/<suministro>', methods=['GET'])
def obtener_recibos_simple(suministro):
    """Usa DIRECTAMENTE tu script que funciona"""
    buscador = None
    try:
        print(f"\n🔍 === BÚSQUEDA SIMPLE INICIADA ===")
        print(f"📋 Suministro: {suministro}")
        print(f"🐍 Usando encontrarpdf.py directamente")
        
        # Crear buscador con TUS credenciales
        buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
        
        # Configurar (tu código)
        if not buscador.configurar_driver():
            return jsonify({"error": "Error configurando navegador"}), 500
        
        # Login (tu código)
        if not buscador.login_automatico():
            return jsonify({"error": "Error en login"}), 500
        
        # Obtener recibos (tu código que funciona)
        if buscador.obtener_todos_los_recibos(suministro):
            
            # Convertir TUS recibos al formato PWA
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
                    "fuente": "ENCONTRARPDF.PY - REAL",
                    "index": i + 1
                }
                recibos_para_pwa.append(recibo_pwa)
            
            # INVERTIR ORDEN (más recientes primero)
            recibos_para_pwa.reverse()
            
            print(f"✅ {len(recibos_para_pwa)} recibos convertidos para PWA (más recientes primero)")
            
            return jsonify({
                "success": True,
                "recibos": recibos_para_pwa,
                "total": len(recibos_para_pwa),
                "message": f"✅ Recibos REALES obtenidos",
                "fuente": "encontrarpdf.py"
            })
        else:
            return jsonify({"error": f"No se encontraron recibos para {suministro}"}), 404
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return jsonify({"error": str(e)}), 500
        
    finally:
        # SIEMPRE cerrar el navegador
        if buscador and hasattr(buscador, 'driver') and buscador.driver:
            try:
                buscador.driver.quit()
                print("🔒 Navegador cerrado")
            except:
                pass

# ✅ NUEVO ENDPOINT PARA PDF REAL
@app.route('/api/pdf/<suministro>/<recibo_id>', methods=['GET'])
def descargar_pdf_real(suministro, recibo_id):
    global buscador_global, ultima_actividad
    
    try:
        print(f"\n📄 === DESCARGA PDF REAL ===")
        
        # ✅ REUTILIZAR SESIÓN SI ES RECIENTE (< 5 minutos)
        import time
        ahora = time.time()
        
        if (buscador_global and ultima_actividad and 
            (ahora - ultima_actividad) < 300):  # 5 minutos
            print("🔄 Reutilizando sesión existente (más rápido)")
            buscador = buscador_global
        else:
            print("🌐 Creando nueva sesión...")
            if buscador_global:
                try:
                    buscador_global.driver.quit()
                except:
                    pass
            
            buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
            
            if not buscador.configurar_driver():
                return jsonify({"error": "Error configurando navegador"}), 500
            
            if not buscador.login_automatico():
                return jsonify({"error": "Error en login"}), 500
            
            buscador_global = buscador
        
        ultima_actividad = ahora
        
        # Obtener recibos
        print("📋 Obteniendo lista de recibos...")
        if not buscador.obtener_todos_los_recibos(suministro):
            return jsonify({"error": "Error obteniendo lista de recibos"}), 500
        
        # ✅ BUSCAR EL ÍNDICE CORRECTO (no el ID)
        indice_recibo = None
        recibo_encontrado = None
        
        for i, recibo in enumerate(buscador.recibos_completos):
            # Buscar por número de recibo
            if str(recibo.get('recibo')) == str(recibo_id):
                indice_recibo = i + 1  # Los índices van de 1 a N
                recibo_encontrado = recibo
                break
        
        if not recibo_encontrado:
            return jsonify({"error": f"Recibo {recibo_id} no encontrado en la lista"}), 404
        
        print(f"✅ Recibo encontrado en índice #{indice_recibo}")
        print(f"📄 Recibo: {recibo_encontrado['recibo']}")
        print(f"💰 Monto: S/{recibo_encontrado['total_fact']}")
        print(f"📅 Fecha: {recibo_encontrado['f_fact']}")
        print(f"🎯 Estado: {recibo_encontrado['estado_pago']}")
        
        # Crear directorio temporal
        temp_dir = tempfile.mkdtemp()
        original_dir = os.getcwd()
        
        try:
            os.chdir(temp_dir)
            print(f"📁 Directorio temporal: {temp_dir}")
            
            # ✅ USAR EL ÍNDICE, NO EL ID
            print(f"🔄 Descargando PDF usando índice #{indice_recibo}...")
            resultado = buscador.descargar_pdf_recibo(indice_recibo)  # ← CORRECCIÓN CLAVE
            
            if resultado:
                print(f"✅ PDF generado: {resultado}")
                
                # Buscar archivo PDF
                archivos_pdf = [f for f in os.listdir('.') if f.endswith('.pdf')]
                
                if archivos_pdf:
                    archivo_pdf = archivos_pdf[0]
                    print(f"📄 Archivo encontrado: {archivo_pdf}")
                    
                    # Leer y convertir a base64
                    with open(archivo_pdf, 'rb') as f:
                        pdf_bytes = f.read()
                        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
                    
                    print(f"📊 PDF procesado - Tamaño: {len(pdf_bytes):,} bytes")
                    
                    # ✅ VERIFICAR QUE ES UN PDF REAL
                    if len(pdf_bytes) > 5000:  # PDFs reales son > 5KB
                        print("🎯 ¡PDF REAL de SEDAPAL confirmado!")
                        return jsonify({
                            "success": True,
                            "pdf_base64": pdf_base64,
                            "filename": archivo_pdf,
                            "message": "PDF REAL descargado exitosamente",
                            "tamaño": len(pdf_bytes),
                            "recibo": recibo_encontrado['recibo'],
                            "monto": recibo_encontrado['total_fact'],
                            "fecha": recibo_encontrado['f_fact'],
                            "estado": recibo_encontrado['estado_pago'],
                            "fuente": "SEDAPAL REAL via encontrarpdf.py",
                            "tipo": "PDF_REAL_SEDAPAL",
                            "indice_usado": indice_recibo
                        })
                    else:
                        print(f"⚠️ PDF muy pequeño ({len(pdf_bytes)} bytes) - posible error")
                        return jsonify({"error": f"PDF generado pero parece inválido (tamaño: {len(pdf_bytes)} bytes)"}), 500
                else:
                    print("❌ No se encontró archivo PDF generado")
                    
                    # Debug: listar archivos generados
                    archivos = os.listdir('.')
                    print(f"📁 Archivos en directorio: {archivos}")
                    
                    return jsonify({"error": "PDF no generado correctamente"}), 500
            else:
                print("❌ descargar_pdf_recibo retornó False")
                return jsonify({"error": "No se pudo generar el PDF (método retornó False)"}), 500
                
        finally:
            # Volver al directorio original
            os.chdir(original_dir)
            
            # Limpiar directorio temporal
            import shutil
            try:
                shutil.rmtree(temp_dir)
                print(f"🧹 Directorio temporal limpiado")
            except:
                pass
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "details": "Error en descarga de PDF real",
            "recibo_solicitado": recibo_id
        }), 500
        
    finally:
        if buscador and hasattr(buscador, 'driver') and buscador.driver:
            try:
                buscador.driver.quit()
                print("🔒 Navegador cerrado")
            except:
                pass

@app.route('/api/test', methods=['GET'])
def test_simple():
    return jsonify({
        "success": True,
        "message": "🐍 Bridge SIMPLE funcionando",
        "script": "encontrarpdf.py",
        "endpoints": [
            "GET /api/test - Test de conexión",
            "GET /api/recibos/<suministro> - Obtener recibos",
            "GET /api/pdf/<suministro>/<recibo_id> - Descargar PDF REAL"
        ],
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("🐍 === BRIDGE SIMPLE PARA SEDAPAL ===")
    print("📋 Usando SOLO encontrarpdf.py (tu script que funciona)")
    print("📄 ✅ NUEVO: Endpoint PDF real agregado")
    print("🌐 Puerto: 5000")
    print("📋 Endpoints:")
    print("   GET /api/test")
    print("   GET /api/recibos/<suministro>")
    print("   GET /api/pdf/<suministro>/<recibo_id>  ← NUEVO")
    app.run(host='0.0.0.0', port=5000, debug=True)