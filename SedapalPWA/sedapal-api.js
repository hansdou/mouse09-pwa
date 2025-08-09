class SedapalAPISimple {
 constructor() {
  // SIEMPRE usar el backend de Render
  this.pythonURL = 'https://sedapal-backend.onrender.com';
  console.log('🌐 Entorno:', window.location.hostname);
  console.log('🔗 API URL:', this.pythonURL);
  this.verificarConexion();
}

    async verificarConexion() {
  try {
    console.log('🔍 Verificando conexión...');
    const response = await fetch(`${this.pythonURL}/api/test`);
    const data = await response.json();
    console.log('✅ Backend conectado:', data.mode || data.message || JSON.stringify(data));
    return true;
  } catch (error) {
    console.log('⚠️ Backend no disponible:', error.message);
    return false;
  }
}

    async buscarRecibos(suministro) {
  try {
    console.log(`🔍 Buscando recibos REALES: ${suministro}`);
    const response = await fetch(`${this.pythonURL}/api/recibos/${suministro}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();

    // Nueva API HTTP-direct (ok + items)
    if (data && data.ok === true && Array.isArray(data.items)) {
      const lista = data.items.map((it, idx) => ({
        ...it,
        periodo: it.mes || it.f_fact || '',
        es_deuda: (it.estado || it.est_rec || '').toLowerCase().includes('impag'),
        color_estado: (it.estado || it.est_rec || '').toLowerCase().includes('impag') ? '🟡 PENDIENTE' : '✅ PAGADO',
        datos_reales: true,
        fuente: data.source || 'SEDAPAL_HTTP',
        index: idx + 1,
      }));
      return { success: true, recibos: lista, total: lista.length, mensaje: 'OK', esReal: true };
    }

    // Compatibilidad con backend anterior (success + recibos)
    if (data && data.success && Array.isArray(data.recibos)) {
      return { success: true, recibos: data.recibos, total: data.total ?? data.recibos.length, mensaje: data.message, esReal: true };
    }

    throw new Error('Respuesta desconocida del backend');
  } catch (error) {
    console.error('❌ Error backend:', error.message);
    console.log('🧪 Fallback: Datos simulados...');
    return {
      success: true,
      recibos: this.generarDatosPrueba(suministro),
      total: 5,
      mensaje: '🧪 Datos simulados (backend no disponible)',
      esReal: false
    };
  }
}

    async descargarPDF(recibo) {
  try {
    console.log('📄 Descargando PDF REAL...', recibo.recibo);
    const response = await fetch(`${this.pythonURL}/api/pdf/${recibo.nis_rad}/${recibo.recibo}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEDAPAL_${recibo.recibo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return { success: true, type: 'real', message: '✅ PDF REAL descargado' };
  } catch (error) {
    console.error('❌ Error PDF:', error.message);
    return await this.generarPDFMejorado(recibo);
  }
}

    async generarPDFMejorado(recibo) {
        const fecha = new Date().toLocaleDateString('es-PE');
        
        // PDF simulado pero más realista
        const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 400>>stream
BT
/F1 14 Tf 72 720 Td (SEDAPAL - SERVICIO DE AGUA POTABLE) Tj
0 -25 Td (=============================================) Tj
0 -20 Td (RECIBO DE AGUA) Tj
0 -25 Td (Numero de Recibo: ${recibo.recibo}) Tj
0 -15 Td (Numero de Suministro: ${recibo.nis_rad}) Tj
0 -15 Td (Periodo de Facturacion: ${recibo.periodo}) Tj
0 -15 Td (Fecha de Emision: ${recibo.f_fact}) Tj
0 -15 Td (Fecha de Vencimiento: ${recibo.vencimiento}) Tj
0 -15 Td (Monto Total: S/ ${recibo.total_fact}) Tj
0 -15 Td (Estado: ${recibo.estado}) Tj
0 -25 Td (${recibo.datos_reales ? '✅ DATOS REALES DE SEDAPAL' : '🧪 VERSION SIMULADA'}) Tj
0 -15 Td (Generado: ${fecha}) Tj
0 -15 Td (Fuente: ${recibo.fuente || 'PWA SEDAPAL'}) Tj
0 -25 Td (Para descargar el PDF oficial, use la) Tj
0 -15 Td (aplicacion en modo local con Python.) Tj
ET
endstream endobj
xref 0 5
0000000000 65535 f 0000000009 00000 n 0000000058 00000 n 0000000115 00000 n 0000000206 00000 n 
trailer<</Size 5/Root 1 0 R>>startxref 629 %%EOF`;

        const blob = new Blob([pdfContent], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = `SEDAPAL_${recibo.recibo}_${recibo.f_fact || fecha}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        
        return { 
            success: true, 
            type: 'simulado',
            filename: `SEDAPAL_${recibo.recibo}.pdf`,
            message: '📄 PDF simulado generado (para PDF real usar modo local)'
        };
    }

    generarDatosPrueba(suministro) {
        console.log('🧪 Generando datos simulados para:', suministro);
        
        const recibos = [];
        const fechas = [
            { mes: 'Enero 2024', f_fact: '2024-01-15', vencimiento: '2024-02-15' },
            { mes: 'Febrero 2024', f_fact: '2024-02-15', vencimiento: '2024-03-15' },
            { mes: 'Marzo 2024', f_fact: '2024-03-15', vencimiento: '2024-04-15' },
            { mes: 'Abril 2024', f_fact: '2024-04-15', vencimiento: '2024-05-15' },
            { mes: 'Mayo 2024', f_fact: '2024-05-15', vencimiento: '2024-06-15' }
        ];
        
        fechas.forEach((periodo, i) => {
            recibos.push({
                recibo: `${suministro}${String(i + 1).padStart(2, '0')}`,
                color_estado: i === 0 ? '🟡 PENDIENTE' : '✅ PAGADO',
                f_fact: periodo.f_fact,
                vencimiento: periodo.vencimiento,
                total_fact: (Math.random() * 100 + 30).toFixed(2),
                periodo: periodo.mes,
                estado: i === 0 ? 'Pendiente' : 'Pagado',
                nis_rad: parseInt(suministro),
                tipo_recibo: 'Simulado',
                es_deuda: i === 0,
                datos_reales: false,
                fuente: 'SIMULACION PWA',
                index: i + 1
            });
        });
        
        return recibos.reverse(); // Más recientes primero
    }
}

window.sedapalAPI = new SedapalAPISimple();
console.log('📱 sedapal-api.js v6.0 - RENDER BACKEND REAL');