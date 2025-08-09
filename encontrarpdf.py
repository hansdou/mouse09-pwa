"""
SEDAPAL BUSCADOR INTERACTIVO - VERSIÓN RENDER
- Configurado específicamente para Render.com
- Chrome optimizado para contenedores Docker
- APIs de SEDAPAL 100% funcionales
"""

import requests
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from datetime import datetime   
import os
import sys

sys.path.append('/app')

class SedapalBuscadorInteractivo:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.sedtoken = None
        self.driver = None
        self.recibos_completos = []
        
        # APIs
        self.base_url = "https://webapp16.sedapal.com.pe/OficinaComercialVirtual/api"
        self.endpoints = {
            'recibos_deuda': f"{self.base_url}/recibos/lista-recibos-deudas-nis",
            'recibos_pagados': f"{self.base_url}/recibos/lista-recibos-pagados-nis",
            'pdf_recibo_pagado': f"{self.base_url}/recibos/recibo-pdf",
            'suministros_lista': f"{self.base_url}/suministros/lista-nis",
            'suministros_pdf': f"{self.base_url}/suministros/recibo-pdf",
            'suministros_generar_pdf': f"{self.base_url}/suministros/generar-pdf-recibo",
            'pdf_general': f"{self.base_url}/reportes/generar-recibo-pdf",
            'pdf_factura': f"{self.base_url}/facturas/obtener-pdf"
        }
        
    def configurar_driver(self):
        """Configurar driver de Chrome para RENDER"""
        try:
            print("🌐 Configurando Chrome para Render...")
            
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--disable-extensions')
            chrome_options.add_argument('--disable-plugins')
            chrome_options.add_argument('--disable-images')
            chrome_options.add_argument('--remote-debugging-port=9222')
            chrome_options.add_argument('--window-size=1280,720')
            chrome_options.add_argument('--memory-pressure-off')
            chrome_options.add_argument('--disable-web-security')
            chrome_options.add_argument('--disable-features=VizDisplayCompositor')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            # ✅ RENDER.COM SPECIFIC CONFIG:
            chrome_options.binary_location = '/usr/bin/google-chrome'
            
            # Importar aquí para evitar errores
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.service import Service
            
            # ✅ RENDER: Usar WebDriverManager
            try:
                service = Service(ChromeDriverManager().install())
                print("✅ ChromeDriver instalado vía WebDriverManager")
            except Exception as e:
                print(f"⚠️ WebDriverManager falló: {e}")
                # Fallback: usar chromedriver sistema
                service = Service('/usr/bin/chromedriver')
                print("✅ Usando ChromeDriver del sistema")
            
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.set_page_load_timeout(60)
            
            print("✅ Chrome configurado exitosamente para Render")
            return True
            
        except Exception as e:
            print(f"❌ Error configurando Chrome en Render: {e}")
            print(f"❌ Detalles: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            return False
    
    def login_automatico(self):
        """Login y obtención del token"""
        try:
            print("🔑 Haciendo login a SEDAPAL...")
            
            # Ir a login
            self.driver.get("https://webapp16.sedapal.com.pe/socv/#/iniciar-sesion")
            time.sleep(3)
            
            # Llenar credenciales
            email_input = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
            )
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            
            email_input.clear()
            email_input.send_keys(self.email)
            password_input.clear()
            password_input.send_keys(self.password)
            
            # Login
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # Esperar redirección
            print("⏳ Esperando redirección...")
            for i in range(15):
                time.sleep(1)
                current_url = self.driver.current_url
                if "iniciar-sesion" not in current_url:
                    print(f"✅ Redirección exitosa a: {current_url}")
                    break
                if i == 14:
                    print("❌ Timeout esperando redirección")
                    return False
            
            # Obtener token del localStorage
            time.sleep(3)
            sedtoken_raw = self.driver.execute_script("return localStorage.getItem('sedtoken');")
            
            if sedtoken_raw:
                sedtoken_obj = json.loads(sedtoken_raw)
                self.sedtoken = sedtoken_obj.get('token')
                print("✅ Login exitoso - Token obtenido")
                print(f"🔑 Token: {self.sedtoken[:20]}...")
                return True
            else:
                print("❌ Login falló - No se obtuvo token")
                print(f"🌐 URL actual: {self.driver.current_url}")
                return False
                
        except Exception as e:
            print(f"❌ Error en login: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def obtener_todos_los_recibos(self, nis_buscar):
        """Obtiene TODOS los recibos (deudas + pagados)"""
        try:
            print(f"📋 Buscando recibos para suministro: {nis_buscar}")
            
            headers = {
                "X-Auth-Token": self.sedtoken,
                "Content-Type": "application/json",
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://webapp16.sedapal.com.pe",
                "Referer": "https://webapp16.sedapal.com.pe/socv/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            todos_los_recibos = []
            nis_rad_correcto = int(nis_buscar)
            
            # 1. Obtener recibos de DEUDA
            print("📄 Obteniendo recibos pendientes...")
            payload_deuda = {
                "nis_rad": nis_rad_correcto,
                "page_num": 1,
                "page_size": 100
            }
            
            try:
                response_deuda = requests.post(
                    self.endpoints['recibos_deuda'], 
                    headers=headers, 
                    json=payload_deuda, 
                    timeout=20
                )
                
                if response_deuda.status_code == 200:
                    data_deuda = response_deuda.json()
                    recibos_deuda = data_deuda.get('bRESP', [])
                    
                    for recibo in recibos_deuda:
                        recibo['estado_pago'] = 'PENDIENTE'
                        recibo['color_estado'] = '🔴'
                        recibo['es_deuda'] = True
                        recibo['nis_rad'] = nis_rad_correcto
                    
                    todos_los_recibos.extend(recibos_deuda)
                    print(f"   ✅ {len(recibos_deuda)} recibos pendientes")
                else:
                    print(f"   ⚠️ Error obteniendo deudas: {response_deuda.status_code}")
            except Exception as e:
                print(f"   ⚠️ Error en recibos deuda: {e}")
            
            # 2. Obtener recibos PAGADOS
            print("✅ Obteniendo recibos pagados...")
            
            pagina = 1
            total_pagados = 0
            
            while pagina <= 10:  # Límite para Render
                payload_pagados = {
                    "nis_rad": nis_rad_correcto,
                    "page_num": pagina,
                    "page_size": 50  # Reducido para Render
                }
                
                try:
                    response_pagados = requests.post(
                        self.endpoints['recibos_pagados'], 
                        headers=headers, 
                        json=payload_pagados, 
                        timeout=20
                    )
                    
                    if response_pagados.status_code == 200:
                        data_pagados = response_pagados.json()
                        recibos_pagados = data_pagados.get('bRESP', [])
                        
                        if not recibos_pagados:
                            break
                        
                        for recibo in recibos_pagados:
                            recibo['estado_pago'] = 'PAGADO'
                            recibo['color_estado'] = '✅'
                            recibo['es_deuda'] = False
                            recibo['nis_rad'] = nis_rad_correcto
                        
                        todos_los_recibos.extend(recibos_pagados)
                        total_pagados += len(recibos_pagados)
                        
                        print(f"   📄 Página {pagina}: {len(recibos_pagados)} recibos")
                        
                        if len(recibos_pagados) < 50:
                            break
                        
                        pagina += 1
                    else:
                        print(f"   ⚠️ Error página {pagina}: {response_pagados.status_code}")
                        break
                        
                except Exception as e:
                    print(f"   ⚠️ Error página {pagina}: {e}")
                    break
            
            print(f"   ✅ {total_pagados} recibos pagados total")
            
            # 3. Ordenar por fecha
            print("🔄 Ordenando recibos por fecha...")
            
            def extraer_fecha(recibo):
                fecha_str = recibo.get('f_fact', '1900-01-01')
                try:
                    return datetime.strptime(fecha_str, '%Y-%m-%d')
                except:
                    return datetime.strptime('1900-01-01', '%Y-%m-%d')
            
            todos_los_recibos.sort(key=extraer_fecha)
            
            # 4. Tomar los últimos 40
            ultimos_40 = todos_los_recibos[-40:] if len(todos_los_recibos) > 40 else todos_los_recibos
            
            print(f"📊 RESUMEN:")
            print(f"   📦 Total recibos encontrados: {len(todos_los_recibos)}")
            print(f"   📋 Mostrando últimos: {len(ultimos_40)}")
            if ultimos_40:
                print(f"   📅 Rango: {ultimos_40[0]['f_fact']} → {ultimos_40[-1]['f_fact']}")
            
            self.recibos_completos = ultimos_40
            return True
            
        except Exception as e:
            print(f"❌ Error obteniendo recibos: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def descargar_pdf_recibo(self, numero_recibo):
        """Descarga el PDF de un recibo específico"""
        try:
            # Buscar el recibo en la lista
            recibo_seleccionado = None
            if isinstance(numero_recibo, int) and 1 <= numero_recibo <= len(self.recibos_completos):
                recibo_seleccionado = self.recibos_completos[numero_recibo - 1]
            
            if not recibo_seleccionado:
                print(f"❌ No se encontró el recibo #{numero_recibo}")
                return False
            
            print(f"📥 Descargando PDF del recibo: {recibo_seleccionado['recibo']}")
            print(f"   📅 Fecha: {recibo_seleccionado['f_fact']}")
            print(f"   💰 Monto: S/{recibo_seleccionado['total_fact']}")
            print(f"   📊 Estado: {recibo_seleccionado['estado_pago']}")
            
            # Headers para PDF
            headers = {
                "X-Auth-Token": self.sedtoken,
                "Content-Type": "application/json",
                "Accept": "application/pdf, application/json, */*",
                "Origin": "https://webapp16.sedapal.com.pe",
                "Referer": "https://webapp16.sedapal.com.pe/socv/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            # Payload completo
            payload = {
                "nis_rad": recibo_seleccionado.get('nis_rad'),
                "sec_nis": recibo_seleccionado.get('sec_nis'),
                "cod_cli": recibo_seleccionado.get('cod_cli', 0),
                "sec_rec": recibo_seleccionado.get('sec_rec'),
                "f_fact": recibo_seleccionado.get('f_fact'),
                "recibo": recibo_seleccionado.get('recibo'),
                "total_fact": recibo_seleccionado.get('total_fact'),
                "tipo_recibo": recibo_seleccionado.get('tipo_recibo'),
                "nro_factura": recibo_seleccionado.get('nro_factura'),
                "vencimiento": recibo_seleccionado.get('vencimiento'),
                "tip_rec": recibo_seleccionado.get('tip_rec'),
                "volumen": recibo_seleccionado.get('volumen', 0),
                "est_act": recibo_seleccionado.get('est_act'),
                "imp_cta": recibo_seleccionado.get('imp_cta', 0),
                "select": False
            }
            
            response = requests.post(
                self.endpoints['pdf_recibo_pagado'],
                headers=headers, 
                json=payload, 
                timeout=30
            )
            
            print(f"📊 Respuesta: {response.status_code}")
            
            if response.status_code == 200:
                return self._procesar_respuesta_pdf(response, recibo_seleccionado)
            else:
                print(f"❌ Error {response.status_code}: {response.text[:200]}...")
                return False
                
        except Exception as e:
            print(f"❌ Error descargando PDF: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _procesar_respuesta_pdf(self, response, recibo):
        """Procesa la respuesta y guarda el PDF"""
        try:
            content_type = response.headers.get('content-type', '').lower()
            
            # Si es PDF directo
            if 'application/pdf' in content_type or response.content.startswith(b'%PDF'):
                filename = f"recibo_{recibo['recibo']}_{recibo['f_fact']}.pdf"
                with open(filename, 'wb') as f:
                    f.write(response.content)
                
                print(f"✅ PDF descargado exitosamente!")
                print(f"   📁 Archivo: {filename}")
                print(f"   📊 Tamaño: {len(response.content):,} bytes")
                return filename
            
            # Si es JSON con PDF en base64
            try:
                data = response.json()
                
                if data.get('bRESP'):
                    import base64
                    pdf_bytes = base64.b64decode(data['bRESP'])
                    
                    if len(pdf_bytes) > 1000:  # Verificar que sea un PDF real
                        filename = f"recibo_{recibo['recibo']}_{recibo['f_fact']}.pdf"
                        with open(filename, 'wb') as f:
                            f.write(pdf_bytes)
                        print(f"✅ PDF descargado exitosamente!")
                        print(f"   📁 Archivo: {filename}")
                        print(f"   📊 Tamaño: {len(pdf_bytes):,} bytes")
                        return filename
                    else:
                        print(f"❌ PDF muy pequeño: {len(pdf_bytes)} bytes")
                        return False
                else:
                    print(f"❌ Respuesta no contiene PDF: {json.dumps(data, indent=2)[:300]}...")
                    return False
                    
            except Exception as e:
                print(f"❌ Error procesando JSON: {e}")
                print(f"   📄 Contenido: {response.text[:200]}...")
                return False
            
        except Exception as e:
            print(f"❌ Error procesando respuesta: {e}")
            return False

# ============ PARA USO DIRECTO ============
if __name__ == "__main__":
    EMAIL = "francovas2407@hotmail.com"
    PASSWORD = "Atilio123"
    
    print("🎯 SEDAPAL BUSCADOR - VERSIÓN RENDER")
    print("🔧 Optimizado para contenedores Docker")
    print()
    
    buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
    
    try:
        if not buscador.configurar_driver():
            print("💔 No se pudo configurar Chrome")
            exit(1)
        
        if not buscador.login_automatico():
            print("💔 No se pudo hacer login")
            exit(1)
        
        # Ejemplo de uso
        nis = input("📝 Ingresa número de suministro: ").strip()
        
        if buscador.obtener_todos_los_recibos(nis):
            print(f"✅ Se encontraron {len(buscador.recibos_completos)} recibos")
            
            for i, recibo in enumerate(buscador.recibos_completos, 1):
                print(f"{i:2d}. {recibo['color_estado']} {recibo['recibo']} - {recibo['f_fact']} - S/{recibo['total_fact']}")
        
    finally:
        if buscador.driver:
            buscador.driver.quit()
            print("🔒 Navegador cerrado")