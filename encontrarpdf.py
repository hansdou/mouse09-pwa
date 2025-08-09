"""
SEDAPAL BUSCADOR INTERACTIVO - VERSIÓN CORREGIDA
- Pide suministro al usuario
- Muestra últimos 40 recibos ordenados (2025 al final)
- Descarga PDF del recibo que elijas
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

sys.path.append('/app')  # En Railway
sys.path.append('/app')  # Backup
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/..')  # Directorio padre

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
            # CONTEXTO RECIBOS (para pagos)
            'recibos_deuda': f"{self.base_url}/recibos/lista-recibos-deudas-nis",
            'recibos_pagados': f"{self.base_url}/recibos/lista-recibos-pagados-nis",
            'pdf_recibo_pagado': f"{self.base_url}/recibos/recibo-pdf",
            
            # CONTEXTO SUMINISTROS (para consultas)
            'suministros_lista': f"{self.base_url}/suministros/lista-nis",
            'suministros_pdf': f"{self.base_url}/suministros/recibo-pdf",
            'suministros_generar_pdf': f"{self.base_url}/suministros/generar-pdf-recibo",
            
            # ENDPOINTS ALTERNATIVOS
            'pdf_general': f"{self.base_url}/reportes/generar-recibo-pdf",
            'pdf_factura': f"{self.base_url}/facturas/obtener-pdf"
        }
        
    def configurar_driver(self):
        """Configurar driver de Chrome"""
        try:
            print("🌐 Configurando Chrome...")
            
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--start-maximized')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            # ✅ ESTAS LÍNEAS DEBEN ESTAR:
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--remote-debugging-port=9222')
            chrome_options.binary_location = '/usr/bin/google-chrome'  # ← IMPORTANTE
            
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.service import Service
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            
            print("✅ Chrome configurado exitosamente")
            return True
            
        except Exception as e:
            print(f"❌ Error configurando Chrome: {e}")
            return False
    
    def login_automatico(self):
        """Login y obtención del token"""
        try:
            print("🔑 Haciendo login...")
            
            # Ir a login
            self.driver.get("https://webapp16.sedapal.com.pe/socv/#/iniciar-sesion")
            time.sleep(3)
            
            # Llenar credenciales
            email_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
            )
            password_input = self.driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            
            email_input.send_keys(self.email)
            password_input.send_keys(self.password)
            
            # Login
            login_button = self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            login_button.click()
            
            # Esperar redirección
            for i in range(10):
                time.sleep(1)
                if "iniciar-sesion" not in self.driver.current_url:
                    break
            
            # Obtener token del localStorage
            time.sleep(2)
            sedtoken_raw = self.driver.execute_script("return localStorage.getItem('sedtoken');")
            
            if sedtoken_raw:
                sedtoken_obj = json.loads(sedtoken_raw)
                self.sedtoken = sedtoken_obj.get('token')
                print("✅ Login exitoso - Token obtenido")
                return True
            else:
                print("❌ Login falló - No se obtuvo token")
                return False
                
        except Exception as e:
            print(f"❌ Error en login: {e}")
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
            nis_rad_correcto = int(nis_buscar)  # Guardar el NIS correcto
            
            # 1. Obtener recibos de DEUDA
            print("📄 Obteniendo recibos pendientes...")
            payload_deuda = {
                "nis_rad": nis_rad_correcto,
                "page_num": 1,
                "page_size": 100
            }
            
            response_deuda = requests.post(self.endpoints['recibos_deuda'], headers=headers, json=payload_deuda, timeout=15)
            
            if response_deuda.status_code == 200:
                data_deuda = response_deuda.json()
                recibos_deuda = data_deuda.get('bRESP', [])
                
                # Marcar como deuda y CORREGIR el nis_rad
                for recibo in recibos_deuda:
                    recibo['estado_pago'] = 'PENDIENTE'
                    recibo['color_estado'] = '🔴'
                    recibo['es_deuda'] = True
                    recibo['nis_rad'] = nis_rad_correcto  # CORREGIR EL NIS_RAD
                    recibo['datos_originales_deuda'] = recibo.copy()  # Backup de datos originales
                
                todos_los_recibos.extend(recibos_deuda)
                print(f"   ✅ {len(recibos_deuda)} recibos pendientes")
            else:
                print(f"   ❌ Error obteniendo deudas: {response_deuda.status_code}")
            
            # 2. Obtener recibos PAGADOS (con paginación)
            print("✅ Obteniendo recibos pagados...")
            
            pagina = 1
            total_pagados = 0
            
            while True:
                payload_pagados = {
                    "nis_rad": nis_rad_correcto,
                    "page_num": pagina,
                    "page_size": 100
                }
                
                response_pagados = requests.post(self.endpoints['recibos_pagados'], headers=headers, json=payload_pagados, timeout=15)
                
                if response_pagados.status_code == 200:
                    data_pagados = response_pagados.json()
                    recibos_pagados = data_pagados.get('bRESP', [])
                    
                    if not recibos_pagados:  # No hay más datos
                        break
                    
                    # Marcar como pagado y CORREGIR el nis_rad
                    for recibo in recibos_pagados:
                        recibo['estado_pago'] = 'PAGADO'
                        recibo['color_estado'] = '✅'
                        recibo['es_deuda'] = False
                        recibo['nis_rad'] = nis_rad_correcto  # CORREGIR EL NIS_RAD
                    
                    todos_los_recibos.extend(recibos_pagados)
                    total_pagados += len(recibos_pagados)
                    
                    print(f"   📄 Página {pagina}: {len(recibos_pagados)} recibos")
                    
                    # Si obtenemos menos de 100, es la última página
                    if len(recibos_pagados) < 100:
                        break
                    
                    pagina += 1
                    
                    # Límite de seguridad
                    if pagina > 20:
                        print("   ⚠️ Límite de páginas alcanzado")
                        break
                        
                else:
                    print(f"   ❌ Error página {pagina}: {response_pagados.status_code}")
                    break
            
            print(f"   ✅ {total_pagados} recibos pagados total")
            
            # 3. Ordenar por fecha (más antiguos primero, 2025 al final)
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
            print(f"   📅 Rango: {ultimos_40[0]['f_fact']} → {ultimos_40[-1]['f_fact']}")
            
            self.recibos_completos = ultimos_40
            return True
            
        except Exception as e:
            print(f"❌ Error obteniendo recibos: {e}")
            return False
    
    def mostrar_lista_recibos(self):
        """Muestra la lista numerada de recibos"""
        print("\n" + "="*80)
        print("📋 LISTA DE RECIBOS (Ordenados cronológicamente - 2025 al final)")
        print("="*80)
        
        for i, recibo in enumerate(self.recibos_completos, 1):
            fecha_emision = recibo.get('f_fact', 'N/A')
            fecha_vencimiento = recibo.get('vencimiento', 'N/A')
            monto = recibo.get('total_fact', 0)
            numero_recibo = recibo.get('recibo', 'N/A')
            estado = recibo.get('color_estado', '❓')
            tipo = recibo.get('tipo_recibo', 'Consumo de agua')
            
            print(f"{i:2d}. {estado} Recibo: {numero_recibo} | Emisión: {fecha_emision} | Venc: {fecha_vencimiento} | S/{monto}")
        
        print("="*80)
        print(f"📊 Total: {len(self.recibos_completos)} recibos | Último (más reciente): #{len(self.recibos_completos)}")
    
    def descargar_pdf_recibo(self, numero_recibo):
        """Descarga el PDF de un recibo específico - VERSIÓN MEJORADA"""
        try:
            # Buscar el recibo en la lista
            recibo_seleccionado = None
            for recibo in self.recibos_completos:
                if str(recibo.get('recibo', '')) == str(numero_recibo) or \
                self.recibos_completos.index(recibo) + 1 == int(numero_recibo):
                    recibo_seleccionado = recibo
                    break
            
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
            
            # Determinar si es deuda o pagado
            es_deuda = recibo_seleccionado.get('es_deuda', recibo_seleccionado.get('estado_pago') == 'PENDIENTE')
            
            print(f"🔍 Tipo de recibo detectado: {'DEUDA' if es_deuda else 'PAGADO'}")
            
            if es_deuda:
                return self._descargar_pdf_deuda(recibo_seleccionado, headers)
            else:
                return self._descargar_pdf_pagado(recibo_seleccionado, headers)
                
        except Exception as e:
            print(f"❌ Error descargando PDF: {e}")
            return False
    
    def _descargar_pdf_deuda(self, recibo, headers):
        """Descarga PDF de recibo con deuda - USANDO PAYLOAD EXACTO DEL NAVEGADOR"""
        print("📡 Procesando recibo de DEUDA...")
        
        # ESTRATEGIA PRINCIPAL: Payload exacto como en el navegador
        try:
            print("🔄 Estrategia PRINCIPAL: Payload exacto del navegador...")
            
            # Payload EXACTO como funciona en el navegador
            payload_exacto = {
                "nis_rad": recibo.get('nis_rad'),  # Ya debe estar corregido
                "sec_nis": recibo.get('sec_nis'),
                "cod_cli": recibo.get('cod_cli', 0),
                "sec_rec": recibo.get('sec_rec'),
                "f_fact": recibo.get('f_fact'),
                "mes": recibo.get('mes', recibo.get('f_fact')),
                "nro_factura": recibo.get('nro_factura'),
                "recibo": recibo.get('recibo'),
                "select": False,  # Como en el navegador
                "tip_rec": recibo.get('tip_rec'),
                "tipo_recibo": recibo.get('tipo_recibo'),
                "deuda": recibo.get('total_fact'),
                "total_fact": recibo.get('total_fact'),
                "vencimiento": recibo.get('vencimiento'),
                "volumen": recibo.get('volumen'),
                "est_act": recibo.get('est_act'),
                "imp_cta": recibo.get('imp_cta', 0)
            }
            
            print(f"   📤 Payload exacto: {json.dumps(payload_exacto, indent=2)}")
            print(f"   🔍 NIS_RAD: {payload_exacto['nis_rad']} (debe ser != 0)")
            
            response = requests.post(
                self.endpoints['pdf_recibo_pagado'],  # Usar endpoint estándar
                headers=headers, 
                json=payload_exacto, 
                timeout=30
            )
            
            print(f"   📊 Respuesta: {response.status_code}")
            
            if response.status_code == 200:
                resultado = self._procesar_respuesta_pdf(response, recibo)
                if resultado:
                    print("   ✅ ¡Estrategia principal exitosa!")
                    return resultado
                
                # Debug de la respuesta
                try:
                    data = response.json()
                    print(f"   📄 Respuesta JSON: {json.dumps(data, indent=2)[:500]}...")
                    
                    # Si el mensaje es sobre información no encontrada, el payload está mal
                    if "No se encontró información" in data.get('cRESP_SP', ''):
                        print("   ⚠️ El recibo existe pero el payload no es correcto")
                        print(f"   🔍 Verificar campos: nis_rad={payload_exacto['nis_rad']}, recibo={payload_exacto['recibo']}")
                        
                except:
                    print(f"   📄 Respuesta no-JSON: {response.text[:200]}...")
            else:
                print(f"   ❌ Error HTTP {response.status_code}: {response.text[:200]}...")
            
        except Exception as e:
            print(f"   ❌ Estrategia principal falló: {e}")
        
        # ESTRATEGIA ALTERNATIVA: Si el NIS sigue siendo incorrecto
        print("🔄 Estrategia ALTERNATIVA: Búsqueda manual de NIS...")
        try:
            # Buscar el NIS correcto desde el input original
            nis_correcto = None
            for r in self.recibos_completos:
                if r.get('recibo') == recibo.get('recibo'):
                    nis_correcto = r.get('nis_rad')
                    break
            
            if nis_correcto and nis_correcto != 0:
                print(f"   🔍 NIS correcto encontrado: {nis_correcto}")
                
                payload_corregido = payload_exacto.copy()
                payload_corregido['nis_rad'] = nis_correcto
                
                response = requests.post(
                    self.endpoints['pdf_recibo_pagado'],
                    headers=headers, 
                    json=payload_corregido, 
                    timeout=30
                )
                
                if response.status_code == 200:
                    resultado = self._procesar_respuesta_pdf(response, recibo)
                    if resultado:
                        print("   ✅ ¡Estrategia alternativa exitosa!")
                        return resultado
            
        except Exception as e:
            print(f"   ❌ Estrategia alternativa falló: {e}")
        
        print("❌ Todas las estrategias para deuda fallaron")
        print("💡 Posibles causas:")
        print("   - Token expirado")
        print("   - Recibo requiere proceso especial")
        print("   - Faltan permisos para este tipo de recibo")
        return False
    
    def _descargar_pdf_pagado(self, recibo, headers):
        """Descarga PDF de recibo pagado"""
        print("📡 Procesando recibo PAGADO...")
        
        # Payload completo para recibos pagados
        payload_pagado = {
            "cod_cli": recibo.get('cod_cli'),
            "deuda": recibo.get('total_fact', 0),
            "est_act": recibo.get('est_act'),
            "f_fact": recibo.get('f_fact'),
            "imp_cta": recibo.get('imp_cta', 0),
            "mes": recibo.get('mes', recibo.get('f_fact')),
            "nis_rad": recibo.get('nis_rad'),
            "nro_factura": recibo.get('nro_factura'),
            "recibo": recibo.get('recibo'),
            "sec_nis": recibo.get('sec_nis'),
            "sec_rec": recibo.get('sec_rec'),
            "select": False,
            "tip_rec": recibo.get('tip_rec'),
            "tipo_recibo": recibo.get('tipo_recibo'),
            "total_fact": recibo.get('total_fact'),
            "vencimiento": recibo.get('vencimiento'),
            "volumen": recibo.get('volumen', 0)
        }
        
        response = requests.post(
            self.endpoints['pdf_recibo_pagado'], 
            headers=headers, 
            json=payload_pagado, 
            timeout=30
        )
        
        print(f"📊 Respuesta: {response.status_code}")
        
        if response.status_code == 200:
            return self._procesar_respuesta_pdf(response, recibo)
        else:
            print(f"❌ Error {response.status_code}: {response.text[:200]}...")
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
                    filename = f"recibo_{recibo['recibo']}_{recibo['f_fact']}.pdf"
                    with open(filename, 'wb') as f:
                        f.write(pdf_bytes)
                    print(f"✅ PDF descargado exitosamente!")
                    print(f"   📁 Archivo: {filename}")
                    print(f"   📊 Tamaño: {len(pdf_bytes):,} bytes")
                    return filename
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
    
    def menu_interactivo(self):
        """Menú principal interactivo"""
        print("\n" + "="*60)
        print("🚀 SEDAPAL BUSCADOR INTERACTIVO")
        print("="*60)
        
        # Pedir suministro
        while True:
            try:
                nis_buscar = input("📝 Ingresa el número de suministro a buscar: ").strip()
                if nis_buscar.isdigit() and len(nis_buscar) >= 6:
                    break
                else:
                    print("❌ Ingresa un número válido (mínimo 6 dígitos)")
            except KeyboardInterrupt:
                print("\n👋 ¡Hasta luego!")
                return
        
        # Obtener recibos
        if not self.obtener_todos_los_recibos(nis_buscar):
            print("💔 No se pudieron obtener los recibos")
            return
        
        if not self.recibos_completos:
            print("❌ No se encontraron recibos para este suministro")
            return
        
        # Mostrar lista
        self.mostrar_lista_recibos()
        
        # Menú de opciones
        while True:
            try:
                print(f"\n📋 OPCIONES:")
                print(f"   1-{len(self.recibos_completos)}: Descargar PDF del recibo #X")
                print(f"   L: Mostrar lista nuevamente")
                print(f"   S: Buscar otro suministro")
                print(f"   Q: Salir")
                
                opcion = input(f"\n¿Qué recibo quieres descargar? (1-{len(self.recibos_completos)}, L, S, Q): ").strip().upper()
                
                if opcion == 'Q':
                    print("👋 ¡Hasta luego!")
                    break
                elif opcion == 'S':
                    return self.menu_interactivo()  # Reiniciar
                elif opcion == 'L':
                    self.mostrar_lista_recibos()
                elif opcion.isdigit():
                    numero = int(opcion)
                    if 1 <= numero <= len(self.recibos_completos):
                        print(f"\n🔄 Descargando recibo #{numero}...")
                        resultado = self.descargar_pdf_recibo(numero)
                        if resultado:
                            print(f"🎉 ¡Recibo #{numero} descargado exitosamente!")
                        else:
                            print(f"💔 No se pudo descargar el recibo #{numero}")
                    else:
                        print(f"❌ Número inválido. Debe estar entre 1 y {len(self.recibos_completos)}")
                else:
                    print("❌ Opción inválida")
                    
            except KeyboardInterrupt:
                print("\n👋 ¡Hasta luego!")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def ejecutar(self):
        """Ejecuta el programa completo"""
        try:
            # Configurar navegador
            if not self.configurar_driver():
                return
            
            # Login
            if not self.login_automatico():
                print("💔 No se pudo hacer login")
                return
            
            # Menú interactivo
            self.menu_interactivo()
            
        finally:
            # Cerrar navegador
            if self.driver:
                self.driver.quit()
                print("🔒 Navegador cerrado")


# ============ EJECUCIÓN PRINCIPAL ============
if __name__ == "__main__":
    # Credenciales fijas (puedes cambiarlas)
    EMAIL = "francovas2407@hotmail.com"
    PASSWORD = "Atilio123"
    
    print("🎯 SEDAPAL BUSCADOR INTERACTIVO - VERSIÓN MEJORADA")
    print("📋 Te mostraré los últimos 40 recibos ordenados")
    print("📄 Podrás descargar el PDF de cualquier recibo")
    print("🔧 Múltiples estrategias para recibos con deuda")
    print()
    
    # Crear y ejecutar
    buscador = SedapalBuscadorInteractivo(EMAIL, PASSWORD)
    buscador.ejecutar()
