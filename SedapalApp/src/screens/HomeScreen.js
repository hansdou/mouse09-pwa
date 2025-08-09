import React, { useState, useEffect } from 'react';
import { 
    View, 
    ScrollView, 
    StyleSheet, 
    Alert, 
    Platform, 
    SafeAreaView,
    TextInput as RNTextInput,
    TouchableOpacity,
    Text as RNText,
    ActivityIndicator as RNActivityIndicator,
    Pressable,
    Dimensions
} from 'react-native';
import { 
    TextInput, 
    Button, 
    Text, 
    Card, 
    ActivityIndicator,
    Chip,
    Divider,
    Badge
} from 'react-native-paper';
import { sedapalAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
    const [suministro, setSuministro] = useState('');
    const [recibos, setRecibos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [downloadingRecibo, setDownloadingRecibo] = useState(null);
    const [error, setError] = useState('');
    const [ultimasBusquedas, setUltimasBusquedas] = useState(['2061720', '5297349', '3631439']);
    const [initializing, setInitializing] = useState(true);
    const [debugInfo, setDebugInfo] = useState(''); // ✅ NUEVO: Debug info

    useEffect(() => {
        const iniciarApp = async () => {
            try {
                console.log('🚀 Iniciando app con token real...');
                setDebugInfo('Iniciando...'); // ✅ DEBUG
                await sedapalAPI.obtenerTokenReal();
                console.log('✅ App lista con conexión real');
                setDebugInfo('✅ Listo'); // ✅ DEBUG
            } catch (error) {
                console.log('⚠️ Error inicial, continuando...');
                setDebugInfo('⚠️ Error inicial'); // ✅ DEBUG
            } finally {
                setInitializing(false);
            }
        };

        iniciarApp();
    }, []);

    // ✅ FUNCIONES DE DEBUG
    const handleDebugPress = (action) => {
        console.log(`🔍 DEBUG: ${action} presionado`);
        Alert.alert('DEBUG', `${action} funciona!`);
        setDebugInfo(`${action} - ${new Date().toLocaleTimeString()}`);
    };

    const handleTextInputFocus = () => {
        console.log('🔍 TextInput focused');
        setDebugInfo('TextInput focused');
    };

    const handleSearch = async () => {
        console.log('🔍 SEARCH presionado');
        setDebugInfo('Búsqueda iniciada');
        
        if (!suministro.trim()) {
            setError('Ingrese un número de suministro');
            return;
        }

        setLoading(true);
        setError('');
        setRecibos([]);

        try {
            console.log('Buscando recibos para:', suministro);
            
            const data = await sedapalAPI.buscarRecibos(suministro);
            
            if (data.length > 0) {
                setRecibos(data);
                setError('');
                
                if (!ultimasBusquedas.includes(suministro)) {
                    setUltimasBusquedas(prev => [suministro, ...prev.slice(0, 2)]);
                }
            } else {
                setError('No se encontraron recibos para este suministro');
            }
        } catch (err) {
            console.error('Error en búsqueda:', err);
            setError('Error al buscar recibos. Verifique el número de suministro.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (recibo) => {
        setDownloadingRecibo(recibo.recibo);
        
        try {
            console.log('📱 Iniciando descarga de PDF para:', recibo.recibo);
            
            const result = await sedapalAPI.descargarPDF(recibo);
            
            if (result.success) {
                let mensaje = '';
                let titulo = '';
                
                switch (result.type) {
                    case 'system':
                        titulo = '📱 PDF Abierto';
                        mensaje = `✅ El PDF se abrió en tu app predeterminada.\n\nRecibo: ${recibo.recibo}\nMonto: S/${recibo.total_fact}`;
                        break;
                    case 'sharing':
                        titulo = '📄 Selecciona App';
                        mensaje = `✅ El PDF está listo.\n\n📱 Selecciona la app con la que quieres abrirlo`;
                        break;
                    case 'saved':
                        titulo = '💾 PDF Guardado';
                        mensaje = `✅ PDF guardado correctamente\n\nArchivo: ${result.filename}`;
                        break;
                    default:
                        titulo = '✅ Proceso Completo';
                        mensaje = `PDF procesado: ${result.filename}`;
                }
                    
                Alert.alert(titulo, mensaje, [
                    { text: 'OK', onPress: () => console.log('✅ Descarga completada') }
                ]);
            } else {
                throw new Error('No se pudo procesar el archivo');
            }
            
        } catch (err) {
            console.error('❌ Error descargando PDF:', err);
            Alert.alert(
                '❌ Error de Descarga', 
                `No se pudo procesar el recibo.\n\nError: ${err.message}`,
                [
                    { text: 'Reintentar', onPress: () => handleDownloadPDF(recibo) },
                    { text: 'Cancelar', style: 'cancel' }
                ]
            );
        } finally {
            setDownloadingRecibo(null);
        }
    };

    const usarBusquedaReciente = (numero) => {
        console.log('🔍 Usando búsqueda reciente:', numero);
        setDebugInfo(`Chip ${numero} presionado`);
        setSuministro(numero);
        setError('');
    };

    const formatearFecha = (fecha) => {
        try {
            return new Date(fecha).toLocaleDateString('es-PE');
        } catch {
            return fecha;
        }
    };

    const esReciboReciente = (fecha) => {
        try {
            const fechaRecibo = new Date(fecha);
            const ahora = new Date();
            const diferenciaMeses = (ahora.getFullYear() - fechaRecibo.getFullYear()) * 12 + (ahora.getMonth() - fechaRecibo.getMonth());
            return diferenciaMeses <= 3;
        } catch {
            return false;
        }
    };

    if (initializing) {
        return (
            <SafeAreaView style={styles.simpleLoadingContainer}>
                <RNActivityIndicator size="large" color="#E91E63" />
                <RNText style={styles.simpleLoadingText}>Conectando con SEDAPAL...</RNText>
            </SafeAreaView>
        );
    }

    // ✅ VERSIÓN SUPER SIMPLE PARA DEBUG EN iOS
    if (Platform.OS === 'ios') {
        return (
            <SafeAreaView style={styles.debugContainer}>
                {/* ✅ DEBUG INFO */}
                <View style={styles.debugPanel}>
                    <RNText style={styles.debugText}>
                        🔍 DEBUG: {debugInfo || 'Ninguna acción'}
                    </RNText>
                    <RNText style={styles.debugText}>
                        📱 iOS - Dimensiones: {width}x{height}
                    </RNText>
                    <RNText style={styles.debugText}>
                        🎯 Suministro: "{suministro}"
                    </RNText>
                </View>

                <ScrollView 
                    style={styles.debugScrollView}
                    contentContainerStyle={styles.debugScrollContent}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={true}
                >
                    {/* ✅ TESTS SIMPLES */}
                    <View style={styles.testContainer}>
                        <RNText style={styles.testTitle}>🧪 TESTS DE FUNCIONALIDAD</RNText>
                        
                        {/* Test 1: Pressable simple */}
                        <Pressable 
                            style={styles.testButton}
                            onPress={() => handleDebugPress('Pressable Simple')}
                        >
                            <RNText style={styles.testButtonText}>1️⃣ TEST PRESSABLE</RNText>
                        </Pressable>

                        {/* Test 2: TouchableOpacity */}
                        <TouchableOpacity 
                            style={styles.testButton}
                            onPress={() => handleDebugPress('TouchableOpacity')}
                            activeOpacity={0.7}
                        >
                            <RNText style={styles.testButtonText}>2️⃣ TEST TOUCHABLE</RNText>
                        </TouchableOpacity>

                        {/* Test 3: TextInput */}
                        <RNTextInput
                            style={styles.testTextInput}
                            placeholder="🧪 Test TextInput - ¿Funciona?"
                            value={suministro}
                            onChangeText={(text) => {
                                console.log('🔍 TextInput onChange:', text);
                                setSuministro(text);
                                setDebugInfo(`Escribiendo: ${text}`);
                            }}
                            onFocus={handleTextInputFocus}
                            keyboardType="number-pad"
                            autoFocus={false}
                        />

                        {/* Test 4: Chips de números */}
                        <View style={styles.testChipsContainer}>
                            <RNText style={styles.testSubtitle}>🔢 TEST CHIPS:</RNText>
                            {ultimasBusquedas.map((numero, index) => (
                                <Pressable
                                    key={index}
                                    style={[
                                        styles.testChip,
                                        numero === suministro && styles.testChipSelected
                                    ]}
                                    onPress={() => {
                                        console.log(`🔍 Chip ${numero} presionado`);
                                        handleDebugPress(`Chip ${numero}`);
                                        usarBusquedaReciente(numero);
                                    }}
                                >
                                    <RNText style={[
                                        styles.testChipText,
                                        numero === suministro && styles.testChipTextSelected
                                    ]}>
                                        {numero}
                                    </RNText>
                                </Pressable>
                            ))}
                        </View>

                        {/* Test 5: Botón de búsqueda */}
                        <Pressable 
                            style={[styles.testSearchButton, loading && styles.testSearchButtonDisabled]}
                            onPress={() => {
                                console.log('🔍 Botón búsqueda presionado');
                                handleDebugPress('Búsqueda');
                                handleSearch();
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <View style={styles.testButtonContent}>
                                    <RNActivityIndicator size="small" color="white" />
                                    <RNText style={styles.testSearchButtonText}>Buscando...</RNText>
                                </View>
                            ) : (
                                <RNText style={styles.testSearchButtonText}>🔍 BUSCAR RECIBOS</RNText>
                            )}
                        </Pressable>
                    </View>

                    {/* ✅ RESULTADOS */}
                    {error ? (
                        <View style={styles.testErrorContainer}>
                            <RNText style={styles.testErrorText}>❌ {error}</RNText>
                        </View>
                    ) : null}

                    {loading && (
                        <View style={styles.testLoadingContainer}>
                            <RNActivityIndicator size="large" color="#E91E63" />
                            <RNText style={styles.testLoadingText}>Buscando recibos...</RNText>
                        </View>
                    )}

                    {recibos.length > 0 && (
                        <View style={styles.testResultsContainer}>
                            <RNText style={styles.testResultsTitle}>
                                📋 {recibos.length} recibos encontrados
                            </RNText>
                            {recibos.slice(0, 3).map((recibo, index) => (
                                <View key={index} style={styles.testReciboCard}>
                                    <RNText style={styles.testReciboText}>
                                        {recibo.color_estado} #{recibo.recibo} - S/{recibo.total_fact}
                                    </RNText>
                                    <Pressable
                                        style={styles.testDownloadButton}
                                        onPress={() => {
                                            console.log('🔍 Download presionado:', recibo.recibo);
                                            handleDebugPress(`Download ${recibo.recibo}`);
                                            handleDownloadPDF(recibo);
                                        }}
                                    >
                                        <RNText style={styles.testDownloadButtonText}>
                                            📄 Descargar
                                        </RNText>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ✅ Versión Android normal
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollContainer}>
                <Card style={styles.searchCard}>
                    <Card.Content>
                        <Text style={styles.title}>Ingrese suministro</Text>

                        <TextInput
                            label="Busca tu suministro"
                            value={suministro}
                            onChangeText={setSuministro}
                            keyboardType="numeric"
                            style={styles.input}
                            mode="outlined"
                            returnKeyType="search"
                            onSubmitEditing={handleSearch}
                            maxLength={10}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Button
                            mode="contained"
                            onPress={handleSearch}
                            loading={loading}
                            style={styles.searchButton}
                            disabled={loading}
                        >
                            {loading ? 'Buscando...' : 'Buscar'}
                        </Button>

                        <Text style={styles.recentLabel}>Tus últimas búsquedas</Text>
                        <View style={styles.chipsContainer}>
                            {ultimasBusquedas.map((numero, index) => (
                                <Chip
                                    key={index}
                                    mode="outlined"
                                    onPress={() => usarBusquedaReciente(numero)}
                                    style={[
                                        styles.chip,
                                        numero === suministro && styles.chipSelected
                                    ]}
                                >
                                    {numero}
                                </Chip>
                            ))}
                        </View>
                    </Card.Content>
                </Card>

                {recibos.length > 0 && (
                    <Text style={styles.resultInfo}>
                        📋 {recibos.length} recibos encontrados (más recientes primero)
                    </Text>
                )}

                {error ? (<Text style={styles.error}>{error}</Text>) : null}

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#E91E63" />
                        <Text style={styles.loadingText}>Buscando recibos...</Text>
                    </View>
                )}

                {recibos.map((recibo, index) => (
                    <Card key={index} style={[
                        styles.reciboCard,
                        esReciboReciente(recibo.f_fact) && styles.reciboReciente
                    ]}>
                        <Card.Content>
                            <View style={styles.reciboHeader}>
                                <View style={styles.estadoContainer}>
                                    <Text style={styles.estadoBadge}>
                                        {recibo.color_estado}
                                    </Text>
                                    {esReciboReciente(recibo.f_fact) && (
                                        <Badge style={styles.nuevoBadge}>RECIENTE</Badge>
                                    )}
                                </View>
                                <Text style={styles.numeroRecibo}>
                                    #{recibo.recibo}
                                </Text>
                            </View>
                            
                            <Divider style={styles.divider} />
                            
                            <Text style={styles.fechaEmision}>
                                📅 Emisión: {formatearFecha(recibo.f_fact)}
                            </Text>
                            
                            <Text style={styles.fechaVencimiento}>
                                ⏰ Vencimiento: {formatearFecha(recibo.vencimiento)}
                            </Text>
                            
                            <Text style={styles.monto}>
                                💰 Monto: S/{recibo.total_fact}
                            </Text>
                        </Card.Content>
                        
                        <Card.Actions>
                            <Button
                                mode="contained"
                                onPress={() => handleDownloadPDF(recibo)}
                                style={styles.downloadButton}
                                disabled={loading || downloadingRecibo === recibo.recibo}
                                loading={downloadingRecibo === recibo.recibo}
                                icon="file-pdf-box"
                            >
                                {downloadingRecibo === recibo.recibo ? 'Procesando...' : 'Ver recibo de agua'}
                            </Button>
                        </Card.Actions>
                    </Card>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    simpleLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    simpleLoadingText: {
        marginTop: 8,
        fontSize: 16,
        color: '#666',
    },

    // ✅ ESTILOS DEBUG PARA iOS
    debugContainer: {
        flex: 1,
        backgroundColor: '#f0f8ff',
    },
    debugPanel: {
        backgroundColor: '#000',
        padding: 10,
        margin: 10,
        borderRadius: 8,
    },
    debugText: {
        color: '#00ff00',
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 2,
    },
    debugScrollView: {
        flex: 1,
    },
    debugScrollContent: {
        padding: 16,
    },
    testContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#E91E63',
    },
    testTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#E91E63',
    },
    testSubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    testButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#2E7D32',
    },
    testButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    testTextInput: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E91E63',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        minHeight: 50,
    },
    testChipsContainer: {
        marginBottom: 16,
    },
    testChip: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E91E63',
        padding: 12,
        borderRadius: 20,
        marginBottom: 8,
        marginRight: 8,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    testChipSelected: {
        backgroundColor: '#E91E63',
    },
    testChipText: {
        color: '#E91E63',
        fontSize: 16,
        fontWeight: 'bold',
    },
    testChipTextSelected: {
        color: 'white',
    },
    testSearchButton: {
        backgroundColor: '#E91E63',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#C2185B',
    },
    testSearchButtonDisabled: {
        backgroundColor: '#999',
        borderColor: '#666',
    },
    testButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    testSearchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    testErrorContainer: {
        backgroundColor: '#ffebee',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f44336',
    },
    testErrorText: {
        color: '#d32f2f',
        fontSize: 14,
        textAlign: 'center',
    },
    testLoadingContainer: {
        backgroundColor: '#e3f2fd',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    testLoadingText: {
        marginTop: 8,
        color: '#1976d2',
        fontSize: 14,
    },
    testResultsContainer: {
        backgroundColor: '#e8f5e8',
        padding: 16,
        borderRadius: 8,
        marginBottom: 16,
    },
    testResultsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
        color: '#2e7d32',
    },
    testReciboCard: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    testReciboText: {
        fontSize: 14,
        marginBottom: 8,
        color: '#333',
    },
    testDownloadButton: {
        backgroundColor: '#ff9800',
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    testDownloadButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },

    // ✅ Estilos Android (existentes)
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollContainer: {
        flex: 1,
        padding: 16,
    },
    searchCard: {
        marginBottom: 16,
        backgroundColor: '#1a1a1a',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    searchButton: {
        marginBottom: 16,
        backgroundColor: '#E91E63',
        minHeight: 48,
    },
    recentLabel: {
        fontSize: 14,
        marginBottom: 8,
        color: 'white',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        marginRight: 8,
        marginBottom: 8,
        minHeight: 40,
    },
    chipSelected: {
        backgroundColor: '#E91E63',
    },
    resultInfo: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
        color: '#666',
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#ffebee',
        borderRadius: 8,
        fontSize: 14,
    },
    loadingContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
        fontSize: 14,
    },
    reciboCard: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    reciboReciente: {
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    reciboHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    estadoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    estadoBadge: {
        fontSize: 16,
    },
    nuevoBadge: {
        backgroundColor: '#4CAF50',
    },
    numeroRecibo: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
    },
    divider: {
        marginVertical: 8,
    },
    fechaEmision: {
        fontSize: 14,
        marginBottom: 4,
    },
    fechaVencimiento: {
        fontSize: 14,
        marginBottom: 4,
    },
    monto: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#E91E63',
    },
    downloadButton: {
        flex: 1,
        backgroundColor: '#E91E63',
        minHeight: 48,
    },
});