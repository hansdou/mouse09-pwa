class SedapalApp {
    constructor() {
        this.suministro = '';
        this.recibos = [];
        this.loading = false;
        this.downloadingRecibo = null;
        this.error = '';
        this.ultimasBusquedas = ['2061720', '5297349', '3631439'];
        this.initializing = true;
        
        console.log('🚀 SedapalApp PWA iniciada');
        this.init();
    }

    // Inicializar app (igual que tu useEffect en HomeScreen.js)
    async init() {
        try {
            this.updateDebugInfo('Iniciando...');
            this.showLoading(true);
            
            // Obtener info del navegador
            const browserInfo = this.getBrowserInfo();
            document.getElementById('browser-info').textContent = browserInfo;
            
            console.log('🚀 Iniciando app con token real...');
            await window.sedapalAPI.obtenerTokenReal();
            console.log('✅ App lista con conexión real');
            
            this.updateDebugInfo('✅ Listo');
            
        } catch (error) {
            console.log('⚠️ Error inicial, continuando...');
            this.updateDebugInfo('⚠️ Error inicial');
        } finally {
            this.initializing = false;
            this.showLoading(false);
            this.setupEventListeners();
        }
    }

    // Configurar event listeners (igual que tus onPress en HomeScreen.js)
    setupEventListeners() {
        // Input de suministro
        const input = document.getElementById('suministro-input');
        input.addEventListener('input', (e) => {
            this.setSuministro(e.target.value);
        });
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Chips de búsquedas recientes
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const numero = chip.dataset.numero;
                this.usarBusquedaReciente(numero);
            });
        });

        // Botón de búsqueda
        const searchBtn = document.getElementById('search-btn');
        searchBtn.addEventListener('click', () => {
            this.handleSearch();
        });
    }

    // Actualizar suministro (igual que tu setSuministro)
    setSuministro(value) {
        this.suministro = value;
        document.getElementById('suministro-debug').textContent = value;
        
        // Actualizar chips seleccionados
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            if (chip.dataset.numero === value) {
                chip.classList.add('selected');
            } else {
                chip.classList.remove('selected');
            }
        });
    }

    // Buscar recibos (igual que tu handleSearch)
    async handleSearch() {
        if (!this.suministro.trim()) {
            this.setError('Ingrese un número de suministro');
            return;
        }

        this.setLoading(true);
        this.setError('');
        this.setRecibos([]);
        this.updateDebugInfo('Búsqueda iniciada');

        try {
            console.log('Buscando recibos para:', this.suministro);
            
            const data = await window.sedapalAPI.buscarRecibos(this.suministro);
            
            if (data.length > 0) {
                this.setRecibos(data);
                this.setError('');
                
                // Actualizar últimas búsquedas
                if (!this.ultimasBusquedas.includes(this.suministro)) {
                    this.ultimasBusquedas = [this.suministro, ...this.ultimasBusquedas.slice(0, 2)];
                    this.updateChips();
                }
                
                this.updateDebugInfo(`✅ ${data.length} recibos encontrados`);
            } else {
                this.setError('No se encontraron recibos para este suministro');
                this.updateDebugInfo('❌ Sin resultados');
            }
        } catch (err) {
            console.error('Error en búsqueda:', err);
            this.setError('Error al buscar recibos. Verifique el número de suministro.');
            this.updateDebugInfo('❌ Error en búsqueda');
        } finally {
            this.setLoading(false);
        }
    }

    // Usar búsqueda reciente (igual que tu función)
    usarBusquedaReciente(numero) {
        console.log('🔍 Usando búsqueda reciente:', numero);
        this.updateDebugInfo(`Chip ${numero} presionado`);
        
        document.getElementById('suministro-input').value = numero;
        this.setSuministro(numero);
        this.setError('');
    }

    // Descargar PDF (igual que tu handleDownloadPDF)
    async handleDownloadPDF(recibo) {
        this.downloadingRecibo = recibo.recibo;
        this.updateDebugInfo(`Descargando ${recibo.recibo}`);
        
        try {
            console.log('📱 Iniciando descarga de PDF para:', recibo.recibo);
            
            const result = await window.sedapalAPI.descargarPDF(recibo);
            
            if (result.success) {
                let mensaje = '';
                let titulo = '';
                
                switch (result.type) {
                    case 'browser':
                        titulo = '📱 PDF Abierto';
                        mensaje = `✅ El PDF se abrió en una nueva pestaña.\n\nRecibo: ${recibo.recibo}\nMonto: S/${recibo.total_fact}`;
                        break;
                    default:
                        titulo = '✅ Proceso Completo';
                        mensaje = `PDF procesado: ${result.filename}`;
                }
                    
                alert(`${titulo}\n\n${mensaje}`);
                this.updateDebugInfo('✅ PDF descargado');
            } else {
                throw new Error('No se pudo procesar el archivo');
            }
            
        } catch (err) {
            console.error('❌ Error descargando PDF:', err);
            const retry = confirm(`❌ Error de Descarga\n\nNo se pudo procesar el recibo.\n\nError: ${err.message}\n\n¿Reintentar?`);
            if (retry) {
                this.handleDownloadPDF(recibo);
            }
            this.updateDebugInfo('❌ Error descarga');
        } finally {
            this.downloadingRecibo = null;
        }
    }

    // Funciones auxiliares para actualizar UI
    showLoading(show) {
        const loading = document.getElementById('loading');
        const mainApp = document.getElementById('main-app');
        
        if (show) {
            loading.style.display = 'flex';
            mainApp.style.display = 'none';
        } else {
            loading.style.display = 'none';
            mainApp.style.display = 'block';
        }
    }

    setLoading(loading) {
        this.loading = loading;
        const searchBtn = document.getElementById('search-btn');
        const searchLoading = document.getElementById('search-loading');
        
        if (loading) {
            searchBtn.disabled = true;
            searchBtn.textContent = '🔄 Buscando...';
            searchLoading.style.display = 'block';
        } else {
            searchBtn.disabled = false;
            searchBtn.textContent = '🔍 BUSCAR RECIBOS';
            searchLoading.style.display = 'none';
        }
    }

    setError(error) {
        this.error = error;
        const errorContainer = document.getElementById('error-container');
        const errorText = document.getElementById('error-text');
        
        if (error) {
            errorText.textContent = `❌ ${error}`;
            errorContainer.style.display = 'block';
        } else {
            errorContainer.style.display = 'none';
        }
    }

    setRecibos(recibos) {
        this.recibos = recibos;
        const resultsContainer = document.getElementById('results-container');
        const resultsTitle = document.getElementById('results-title');
        const recibosList = document.getElementById('recibos-list');
        
        if (recibos.length > 0) {
            resultsTitle.textContent = `📋 ${recibos.length} recibos encontrados (más recientes primero)`;
            recibosList.innerHTML = '';
            
            recibos.forEach((recibo, index) => {
                const reciboCard = this.createReciboCard(recibo, index);
                recibosList.appendChild(reciboCard);
            });
            
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    // Crear card de recibo (igual que tu renderizado en HomeScreen.js)
    createReciboCard(recibo, index) {
        const card = document.createElement('div');
        card.className = 'recibo-card';
        
        const esReciente = this.esReciboReciente(recibo.f_fact);
        if (esReciente) {
            card.style.borderLeftColor = '#4CAF50';
        }
        
        card.innerHTML = `
            <div class="recibo-text">
                <strong>${recibo.color_estado} #${recibo.recibo}</strong>
                ${esReciente ? ' <span style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px;">RECIENTE</span>' : ''}
            </div>
            <div class="recibo-text">📅 Emisión: ${this.formatearFecha(recibo.f_fact)}</div>
            <div class="recibo-text">⏰ Vencimiento: ${this.formatearFecha(recibo.vencimiento)}</div>
            <div class="recibo-text" style="color: #E91E63; font-weight: bold;">💰 Monto: S/${recibo.total_fact}</div>
            <button class="download-button" data-recibo-index="${index}">
                📄 Ver recibo de agua
            </button>
        `;
        
        // Agregar event listener al botón de descarga
        const downloadBtn = card.querySelector('.download-button');
        downloadBtn.addEventListener('click', () => {
            this.handleDownloadPDF(recibo);
        });
        
        return card;
    }

    // Utilidades (igual que tus funciones en HomeScreen.js)
    formatearFecha(fecha) {
        try {
            return new Date(fecha).toLocaleDateString('es-PE');
        } catch {
            return fecha;
        }
    }

    esReciboReciente(fecha) {
        try {
            const fechaRecibo = new Date(fecha);
            const ahora = new Date();
            const diferenciaMeses = (ahora.getFullYear() - fechaRecibo.getFullYear()) * 12 + (ahora.getMonth() - fechaRecibo.getMonth());
            return diferenciaMeses <= 3;
        } catch {
            return false;
        }
    }

    updateDebugInfo(info) {
        const debugInfo = document.getElementById('debug-info');
        debugInfo.textContent = info;
    }

    updateChips() {
        // Actualizar chips con nuevas búsquedas
        const chipsContainer = document.querySelector('.chips-container');
        const chipsTitle = chipsContainer.querySelector('.chips-title');
        
        // Limpiar chips existentes excepto el título
        const existingChips = chipsContainer.querySelectorAll('.chip');
        existingChips.forEach(chip => chip.remove());
        
        // Crear nuevos chips
        this.ultimasBusquedas.forEach(numero => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.dataset.numero = numero;
            chip.textContent = numero;
            chip.addEventListener('click', () => {
                this.usarBusquedaReciente(numero);
            });
            chipsContainer.appendChild(chip);
        });
    }

    getBrowserInfo() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        const isChrome = /Chrome/.test(navigator.userAgent);
        
        if (isIOS && isSafari) return 'Safari iOS';
        if (isIOS && isChrome) return 'Chrome iOS';
        if (isIOS) return 'iOS WebView';
        if (isSafari) return 'Safari Desktop';
        if (isChrome) return 'Chrome Desktop';
        return navigator.userAgent.split(' ')[0];
    }
}

// Inicializar app cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 DOM listo, iniciando SedapalApp PWA...');
    window.sedapalApp = new SedapalApp();
});