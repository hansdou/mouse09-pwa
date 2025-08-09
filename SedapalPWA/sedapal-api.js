class SedapalAPISimple {
    constructor() {
        // ✅ Detectar si estamos en desarrollo o producción
        this.pythonURL = window.location.hostname === 'localhost' 
            ? 'http://localhost:5000'  // Desarrollo
            : '';  // Producción (mismo dominio)
        
        console.log('🌐 API URL:', this.pythonURL || 'Mismo dominio');
        this.verificarConexion();
    }

    async verificarConexion() {
        try {
            const response = await fetch(`${this.pythonURL}/api/test`);
            const data = await response.json();
            console.log('✅ Python Bridge:', data.message);
        } catch (error) {
            console.log('❌ Python Bridge no disponible');
        }
    }

    async obtenerTokenReal() {
        return 'PYTHON_BRIDGE_ONLY';
    }

    async buscarRecibos(suministro) {
        try {
            console.log(`🔍 Buscando recibos: ${suministro}`);
            
            const response = await fetch(`${this.pythonURL}/api/recibos/${suministro}`);
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ ${data.total} recibos obtenidos de ${data.fuente}`);
                return data.recibos;
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            return this.generarDatosPrueba(suministro);
        }
    }

    async descargarPDF(recibo) {
        try {
            console.log('📄 Iniciando descarga de PDF REAL...');
            
            // ✅ MOSTRAR LOADING AL USUARIO
            this.mostrarProgreso('🌐 Configurando navegador...');
            
            if (recibo.datos_reales) {
                const response = await fetch(`${this.pythonURL}/api/pdf/${recibo.nis_rad}/${recibo.recibo}`);
                const data = await response.json();
                
                if (data.success) {
                    this.mostrarProgreso('✅ PDF descargado exitosamente');
                    
                    // Convertir y descargar...
                    const pdfBytes = atob(data.pdf_base64);
                    const pdfArray = new Uint8Array(pdfBytes.length);
                    for (let i = 0; i < pdfBytes.length; i++) {
                        pdfArray[i] = pdfBytes.charCodeAt(i);
                    }
                    
                    const blob = new Blob([pdfArray], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.download = `SEDAPAL_REAL_${recibo.recibo}_${recibo.f_fact}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    this.ocultarProgreso();
                    
                    return {
                        success: true,
                        type: 'real_sedapal_pdf',
                        filename: `SEDAPAL_REAL_${recibo.recibo}_${recibo.f_fact}.pdf`,
                        tamaño: data.tamaño,
                        message: `✅ PDF REAL descargado (${(data.tamaño/1024).toFixed(1)}KB)`
                    };
                }
            }
        } catch (error) {
            this.ocultarProgreso();
            console.error('❌ Error:', error);
            return await this.generarPDFSimple(recibo);
        }
    }

    generarDatosPrueba(suministro) {
        return [{
            recibo: `SIM-${Math.floor(Math.random() * 999999)}`,
            color_estado: '🧪 SIMULADO',
            f_fact: '2024-01-15',
            vencimiento: '2024-02-15',
            total_fact: '45.80',
            periodo: 'Enero 2024',
            nis_rad: parseInt(suministro),
            datos_reales: false
        }];
    }

    // ✅ MÉTODOS PARA MOSTRAR PROGRESO
    mostrarProgreso(mensaje) {
        // Buscar elemento de progreso o crearlo
        let progressDiv = document.getElementById('download-progress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.id = 'download-progress';
            progressDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 20px;
                border-radius: 10px;
                z-index: 9999;
                text-align: center;
                font-family: Arial, sans-serif;
            `;
            document.body.appendChild(progressDiv);
        }
        progressDiv.innerHTML = `
            <div style="margin-bottom: 10px;">📄 Descargando PDF Real</div>
            <div style="font-size: 14px; opacity: 0.8;">${mensaje}</div>
            <div style="margin-top: 10px;">
                <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #007bff, #00d4aa); animation: progress 2s infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(0%); }
                }
            </style>
        `;
    }

    ocultarProgreso() {
        const progressDiv = document.getElementById('download-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }
}

window.sedapalAPI = new SedapalAPISimple();
console.log('📱 sedapal-api.js v4.0 cargado - SOLO Bridge Python');