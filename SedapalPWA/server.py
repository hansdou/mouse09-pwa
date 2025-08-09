import http.server
import socketserver
import webbrowser
import os

PORT = 8080

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Agregar headers necesarios para PWA
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cross-Origin-Embedder-Policy', 'cross-origin')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()
    
    def guess_type(self, path):
        mimetype = super().guess_type(path)
        # Asegurar que el manifest se sirva correctamente
        if path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.js'):
            return 'application/javascript'
        return mimetype

# Cambiar al directorio del PWA
os.chdir(r'C:\Users\Home\Desktop\RecibosSedapal\SedapalPWA')

# Crear servidor
with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    print(f"🌐 Servidor PWA ejecutándose en:")
    print(f"   http://localhost:{PORT}")
    print(f"   http://192.168.1.xxx:{PORT} (para probar en móvil)")
    print(f"\n📱 Para probar en iPhone:")
    print(f"   1. Conecta iPhone al mismo WiFi")
    print(f"   2. Abre Safari en iPhone")
    print(f"   3. Ve a la IP de tu PC:{PORT}")
    print(f"   4. Botón Compartir > Agregar a pantalla de inicio")
    print(f"\n⏹️  Ctrl+C para detener")
    
    # Abrir automáticamente en el navegador
    webbrowser.open(f'http://localhost:{PORT}')
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 Servidor detenido")