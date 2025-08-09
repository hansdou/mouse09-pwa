import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Modal, Portal, Button, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { loginService } from '../services/loginService';

export default function LoginWebView({ visible, onClose, onTokenReceived }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('Cargando página...');
    const [showWebView, setShowWebView] = useState(false);

    // ✅ NUEVO: Auto-cerrar si no hay progreso en 20 segundos
    useEffect(() => {
        if (!visible) return;
        
        setLoading(true);
        setError('');
        setProgress('Iniciando...');
        setShowWebView(false);
        
        // Delay para mostrar WebView (evita pantalla blanca)
        const showTimer = setTimeout(() => {
            setShowWebView(true);
            setProgress('Cargando SEDAPAL...');
        }, 1000);
        
        // Auto-timeout si tarda mucho
        const timeoutTimer = setTimeout(() => {
            if (loading) {
                setError('Tiempo de espera agotado. Verifica tu conexión.');
                setProgress('Error de conexión');
            }
        }, 20000);
        
        return () => {
            clearTimeout(showTimer);
            clearTimeout(timeoutTimer);
        };
    }, [visible]);

    const handleWebViewLoad = () => {
        console.log('🌐 WebView cargado correctamente');
        setLoading(false);
        setProgress('Ejecutando login automático...');
    };

    const handleLoadStart = () => {
        console.log('🔄 Iniciando carga de WebView...');
        setProgress('Conectando con SEDAPAL...');
    };

    const handleLoadProgress = ({ nativeEvent }) => {
        const progressPercent = Math.round(nativeEvent.progress * 100);
        setProgress(`Cargando... ${progressPercent}%`);
    };

    const handleLoadError = (error) => {
        console.error('❌ Error cargando WebView:', error);
        setError('Error de conexión. Verifica tu internet.');
        setLoading(false);
    };

    const handleMessage = (event) => {
        const message = event.nativeEvent.data;
        console.log('📨 Mensaje recibido del WebView:', message);
        
        loginService.handleWebViewMessage(message);
        
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'TOKEN_SUCCESS':
                    console.log('✅ Token recibido exitosamente');
                    setProgress('¡Login exitoso!');
                    onTokenReceived(data.token);
                    handleClose();
                    break;
                    
                case 'TOKEN_ERROR':
                    setError(`Error obteniendo token: ${data.error}`);
                    setProgress('Error en autenticación');
                    break;
                    
                case 'LOGIN_ERROR':
                    setError(`Error en login: ${data.error}`);
                    setProgress('Error en credenciales');
                    break;
                    
                case 'SCRIPT_ERROR':
                    setError(`Error técnico: ${data.error}`);
                    setProgress('Error en proceso');
                    break;
                    
                default:
                    console.log('📄 Mensaje no reconocido:', data);
            }
        } catch (err) {
            console.log('⚠️ Error parseando mensaje:', err);
        }
    };

    const handleClose = () => {
        console.log('🚪 Cerrando modal de login');
        setLoading(true);
        setError('');
        setProgress('');
        setShowWebView(false);
        loginService.loginInProgress = false; // ✅ IMPORTANTE: Resetear estado
        onClose();
    };

    const handleRetry = () => {
        console.log('🔄 Reintentando login...');
        setError('');
        setLoading(true);
        setProgress('Reintentando...');
        setShowWebView(false);
        
        // Reiniciar WebView después de un momento
        setTimeout(() => {
            setShowWebView(true);
        }, 1500);
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleClose}
                contentContainerStyle={styles.modal}
                dismissable={false} // ✅ Evita cerrar accidentalmente
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>🔐 Conectando con SEDAPAL</Text>
                        <IconButton
                            icon="close"
                            size={20}
                            onPress={handleClose}
                            style={styles.closeButton}
                        />
                    </View>
                    
                    {loading && !error && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#E91E63" />
                            <Text style={styles.progressText}>{progress}</Text>
                        </View>
                    )}
                    
                    {error && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>❌ {error}</Text>
                        </View>
                    )}
                </View>

                {/* ✅ NUEVO: Solo mostrar WebView cuando esté listo */}
                {showWebView && !error ? (
                    <WebView
                        source={{ uri: loginService.loginURL }}
                        style={styles.webview}
                        onLoad={handleWebViewLoad}
                        onLoadStart={handleLoadStart}
                        onLoadProgress={handleLoadProgress}
                        onLoadEnd={() => setLoading(false)}
                        onError={handleLoadError}
                        onMessage={handleMessage}
                        injectedJavaScript={loginService.loginScript}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={false}
                        scalesPageToFit={true}
                        mixedContentMode="compatibility"
                        allowsBackForwardNavigationGestures={false}
                        // ✅ Configuración específica para iOS
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                    />
                ) : (
                    <View style={styles.placeholderContainer}>
                        {!error && (
                            <View style={styles.placeholderContent}>
                                <ActivityIndicator size="large" color="#E91E63" />
                                <Text style={styles.placeholderText}>
                                    Preparando conexión segura...
                                </Text>
                                <Text style={styles.placeholderSubtext}>
                                    Esto puede tomar unos segundos
                                </Text>
                            </View>
                        )}
                        
                        {error && (
                            <View style={styles.errorContent}>
                                <Text style={styles.errorTitle}>⚠️ Error de Conexión</Text>
                                <Text style={styles.errorDescription}>{error}</Text>
                                <Button 
                                    mode="contained" 
                                    onPress={handleRetry}
                                    style={styles.retryButton}
                                >
                                    🔄 Reintentar
                                </Button>
                            </View>
                        )}
                    </View>
                )}

                <View style={styles.footer}>
                    {error ? (
                        <View style={styles.buttonRow}>
                            <Button 
                                mode="outlined" 
                                onPress={handleClose}
                                style={styles.cancelButton}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                mode="contained" 
                                onPress={handleRetry}
                                style={styles.retryButton}
                            >
                                Reintentar
                            </Button>
                        </View>
                    ) : (
                        <Button 
                            mode="outlined" 
                            onPress={handleClose}
                            disabled={loading}
                        >
                            {loading ? 'Procesando...' : 'Cancelar'}
                        </Button>
                    )}
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modal: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        height: '85%',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    closeButton: {
        margin: 0,
        padding: 0,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
    },
    progressText: {
        fontSize: 14,
        color: '#E91E63',
        fontWeight: '500',
    },
    errorContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#ffebee',
        borderRadius: 8,
    },
    errorText: {
        color: '#d32f2f',
        fontSize: 14,
        fontWeight: '500',
    },
    webview: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    placeholderContent: {
        alignItems: 'center',
        gap: 16,
        padding: 32,
    },
    placeholderText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    placeholderSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    errorContent: {
        alignItems: 'center',
        gap: 16,
        padding: 32,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#d32f2f',
        textAlign: 'center',
    },
    errorDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        backgroundColor: '#f8f9fa',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        borderColor: '#999',
    },
    retryButton: {
        flex: 1,
        backgroundColor: '#E91E63',
    },
});