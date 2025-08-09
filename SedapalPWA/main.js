class SedapalPWA {
    constructor() {
        this.API = window.sedapalAPI;
        this.currentResults = [];
        this.initializeApp();
    }

    initializeApp() {
        console.log('🚀 Inicializando SEDAPAL PWA...');
        
        // Esperar a que cargue la página
        document.addEventListener('DOMContentLoaded', () => {
            this.setupEventListeners();
            this.updateStatus();
            console.log('✅ PWA inicializada');
        });
    }

    setupEventListeners() {
        // Botón de búsqueda principal
        const searchBtn = document.getElementById('search-btn');
        const suministroInput = document.getElementById('suministro');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.buscarRecibos());
        }
        
        if (suministroInput) {
            // Enter en input
            suministroInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.buscarRecibos();
                }
            });
        }

        // Chips de números frecuentes (si existen)
        document.querySelectorAll('.chip, .quick-search').forEach(chip => {
            chip.addEventListener('click', () => {
                const numero = chip.dataset.numero || chip.textContent.trim();
                if (suministroInput) {
                    suministroInput.value = numero;
                    this.buscarRecibos();
                }
            });
        });

        console.log('✅ Event listeners configurados');
    }

    async buscarRecibos() {
        const suministroInput = document.getElementById('suministro');
        if (!suministroInput) {
            console.error('❌ Input de suministro no encontrado');
            return;
        }

        const suministro = suministroInput.value.trim();
        
        if (!suministro) {
            this.showMessage('📝 Ingrese un número de suministro', 'error');
            return;
        }

        if (suministro.length < 6) {
            this.showMessage('📝 El número debe tener al menos 6 dígitos', 'error');
            return;
        }

        this.showLoading(true);
        this.clearResults();
        this.updateStatus(`🔍 Buscando suministro: ${suministro}`);

        try {
            console.log('🔍 Iniciando búsqueda:', suministro);
            const resultado = await this.API.buscarRecibos(suministro);
            
            if (resultado.success && resultado.recibos.length > 0) {
                this.currentResults = resultado.recibos;
                this.showResults(resultado);
                this.updateStatus(`✅ ${resultado.total} recibos encontrados (${resultado.esReal ? 'REALES' : 'simulados'})`);
            } else {
                this.showMessage('❌ No se encontraron recibos para ese suministro', 'error');
                this.updateStatus('❌ Sin resultados');
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            this.showMessage('❌ Error al buscar recibos. Intente nuevamente.', 'error');
            this.updateStatus(`❌ Error: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showResults(resultado) {
        // Buscar contenedor de resultados
        let resultsContainer = document.getElementById('results-container');
        
        // Si no existe, crearlo
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'results-container';
            resultsContainer.className = 'results-section';
            
            // Insertarlo después del formulario
            const form = document.querySelector('.search-form') || document.querySelector('main');
            if (form && form.parentNode) {
                form.parentNode.insertBefore(resultsContainer, form.nextSibling);
            } else {
                document.body.appendChild(resultsContainer);
            }
        }
        
        // Título
        const title = document.createElement('h2');
        title.innerHTML = `
            📋 ${resultado.total} recibos encontrados
            <div style="font-size: 14px; color: #666; margin-top: 5px; font-weight: normal;">
                ${resultado.mensaje}
            </div>
        `;
        
        // Lista de recibos
        const list = document.createElement('div');
        list.className = 'recibos-list';
        
        resultado.recibos.forEach((recibo, index) => {
            const reciboElement = this.createReciboElement(recibo, index);
            list.appendChild(reciboElement);
        });
        
        // Limpiar y agregar contenido
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(title);
        resultsContainer.appendChild(list);
        
        resultsContainer.style.display = 'block';
        
        // Scroll a resultados
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
        
        console.log(`✅ ${resultado.recibos.length} recibos mostrados`);
    }

    createReciboElement(recibo, index) {
        const div = document.createElement('div');
        div.className = 'recibo-item';
        
        const estadoClass = recibo.es_deuda ? 'pendiente' : 'pagado';
        const estadoIcon = recibo.es_deuda ? '🔴' : '✅';
        const estadoText = recibo.es_deuda ? 'PENDIENTE' : 'PAGADO';
        
        div.innerHTML = `
            <div class="recibo-header">
                <span class="recibo-numero">📄 ${recibo.recibo}</span>
                <span class="estado ${estadoClass}">${estadoIcon} ${estadoText}</span>
            </div>
            <div class="recibo-details">
                <div class="detail-row">
                    <span class="label">📅 Fecha:</span>
                    <span class="value">${recibo.f_fact}</span>
                </div>
                <div class="detail-row">
                    <span class="label">💰 Monto:</span>
                    <span class="value">S/ ${recibo.total_fact}</span>
                </div>
                <div class="detail-row">
                    <span class="label">📋 Período:</span>
                    <span class="value">${recibo.periodo || recibo.f_fact}</span>
                </div>
                ${recibo.vencimiento ? `
                <div class="detail-row">
                    <span class="label">⏰ Vencimiento:</span>
                    <span class="value">${recibo.vencimiento}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                    <span class="label">🔍 Fuente:</span>
                    <span class="value tipo-${recibo.datos_reales ? 'real' : 'simulado'}">
                        ${recibo.datos_reales ? '✅ DATOS REALES' : '🧪 SIMULADO'}
                    </span>
                </div>
            </div>
            <button class="pdf-button" data-index="${index}">
                📥 Descargar PDF
            </button>
        `;
        
        // Agregar event listener al botón
        const button = div.querySelector('.pdf-button');
        button.addEventListener('click', () => this.descargarPDF(index));
        
        return div;
    }

    async descargarPDF(index) {
        if (index < 0 || index >= this.currentResults.length) {
            this.showMessage('❌ Recibo no válido', 'error');
            return;
        }

        const recibo = this.currentResults[index];
        
        try {
            console.log('📄 Descargando PDF para:', recibo.recibo);
            
            // Mostrar feedback
            const button = document.querySelector(`.pdf-button[data-index="${index}"]`);
            const originalText = button.textContent;
            button.textContent = '⏳ Descargando...';
            button.disabled = true;
            
            const resultado = await this.API.descargarPDF(recibo);
            
            if (resultado.success) {
                button.textContent = `✅ ${resultado.type === 'real' ? 'PDF Real' : 'PDF Simulado'}`;
                this.updateStatus(`✅ PDF descargado: ${resultado.filename}`);
                
                // Mostrar notificación
                this.showMessage(resultado.message, 'success');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 3000);
            } else {
                throw new Error('Error generando PDF');
            }
            
        } catch (error) {
            console.error('❌ Error PDF:', error);
            this.showMessage('❌ Error al descargar PDF', 'error');
            this.updateStatus(`❌ Error PDF: ${error.message}`);
            
            // Restaurar botón
            const button = document.querySelector(`.pdf-button[data-index="${index}"]`);
            if (button) {
                button.textContent = '📥 Descargar PDF';
                button.disabled = false;
            }
        }
    }

    showLoading(show) {
        // Buscar indicador de loading
        let loading = document.getElementById('loading-indicator');
        
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'loading-indicator';
            loading.className = 'loading-spinner';
            loading.innerHTML = '⏳ Cargando...';
            loading.style.cssText = `
                text-align: center;
                padding: 20px;
                font-size: 16px;
                color: #666;
                display: none;
            `;
            
            const form = document.querySelector('.search-form') || document.querySelector('main');
            if (form && form.parentNode) {
                form.parentNode.insertBefore(loading, form.nextSibling);
            }
        }
        
        loading.style.display = show ? 'block' : 'none';
    }

    showMessage(message, type = 'info') {
        // Crear o reutilizar contenedor de mensajes
        let messageContainer = document.getElementById('message-container');
        
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'message-container';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                max-width: 90%;
                width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message message-${type}`;
        messageElement.textContent = message;
        messageElement.style.cssText = `
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        messageContainer.appendChild(messageElement);
        
        // Auto-remover después de 4 segundos
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 4000);
    }

    clearResults() {
        const results = document.getElementById('results-container');
        if (results) {
            results.style.display = 'none';
        }
    }

    updateStatus(status) {
        // Actualizar estado en consola y debug info si existe
        console.log('📊 Estado:', status);
        
        const debugInfo = document.getElementById('debug-info') || document.getElementById('status');
        if (debugInfo) {
            debugInfo.textContent = status;
        }
    }
}

// Inicializar cuando la página cargue
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new SedapalPWA();
        console.log('📱 SEDAPAL PWA main.js inicializada');
    });
} else {
    // Si ya cargó, inicializar inmediatamente
    window.app = new SedapalPWA();
    console.log('📱 SEDAPAL PWA main.js inicializada (documento ya cargado)');
}

// CSS dinámico para estilos de recibos
const styles = `
<style>
.results-section {
    margin: 20px 0;
    padding: 20px;
}

.recibo-item {
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-left: 4px solid #2196F3;
}

.recibo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
}

.recibo-numero {
    font-weight: bold;
    font-size: 16px;
    color: #333;
}

.estado {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: bold;
}

.estado.pendiente {
    background: #ffebee;
    color: #c62828;
}

.estado.pagado {
    background: #e8f5e8;
    color: #2e7d32;
}

.recibo-details {
    margin-bottom: 12px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: 14px;
}

.label {
    color: #666;
    font-weight: 500;
    flex: 1;
}

.value {
    color: #333;
    font-weight: bold;
    flex: 2;
    text-align: right;
}

.tipo-real {
    color: #4CAF50;
}

.tipo-simulado {
    color: #ff9800;
}

.pdf-button {
    width: 100%;
    background: #2196F3;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 8px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.3s;
    font-size: 14px;
}

.pdf-button:hover {
    background: #1976D2;
}

.pdf-button:disabled {
    background: #ccc;
    cursor: not-allowed;
}

@keyframes slideIn {
    from {
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}

@media (max-width: 600px) {
    .recibo-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
    
    .detail-row {
        flex-direction: column;
        gap: 2px;
    }
    
    .value {
        text-align: left;
        font-size: 16px;
    }
}
</style>
`;

// Agregar estilos al head
if (document.head) {
    document.head.insertAdjacentHTML('beforeend', styles);
}