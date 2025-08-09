import { WebView } from 'react-native-webview';

class LoginService {
    constructor() {
        this.sedtoken = null;
        this.loginURL = "https://webapp16.sedapal.com.pe/socv/#/iniciar-sesion";
        this.credentials = {
            email: "francovas2407@hotmail.com",
            password: "Atilio123"
        };
        this.loginInProgress = false;
        this.tokenExpiry = null;
    }

    async obtenerTokenReal() {
        // Evitar múltiples logins simultáneos
        if (this.loginInProgress) {
            console.log('⏳ Login ya en progreso...');
            return this.waitForLogin();
        }

        // Si tenemos token válido, usarlo
        if (this.isTokenValid()) {
            console.log('✅ Token existente válido');
            return this.sedtoken;
        }

        this.loginInProgress = true;
        console.log('🔐 Iniciando login automático FRESCO...');
        
        try {
            const loginScript = `
                (function() {
                    console.log('🌐 Iniciando login automático en WebView...');
                    
                    let intentos = 0;
                    const maxIntentos = 10;
                    
                    function intentarLogin() {
                        intentos++;
                        console.log('🔄 Intento de login #' + intentos);
                        
                        // Buscar campos de login con múltiples selectores
                        const selectors = {
                            email: [
                                'input[type="email"]',
                                'input[name="email"]', 
                                'input[id="email"]',
                                'input[placeholder*="email"]',
                                'input[placeholder*="correo"]',
                                '.email-input',
                                '#email',
                                '[data-cy="email"]'
                            ],
                            password: [
                                'input[type="password"]',
                                'input[name="password"]',
                                'input[id="password"]', 
                                'input[placeholder*="password"]',
                                'input[placeholder*="contraseña"]',
                                '.password-input',
                                '#password',
                                '[data-cy="password"]'
                            ],
                            button: [
                                'button[type="submit"]',
                                'input[type="submit"]',
                                '.btn-login',
                                '.login-button',
                                'button:contains("Iniciar")',
                                'button:contains("Login")',
                                '[data-cy="login"]',
                                '.submit-btn'
                            ]
                        };
                        
                        let emailField = null;
                        let passwordField = null;
                        let loginButton = null;
                        
                        // Buscar campo email
                        for (let selector of selectors.email) {
                            emailField = document.querySelector(selector);
                            if (emailField) break;
                        }
                        
                        // Buscar campo password
                        for (let selector of selectors.password) {
                            passwordField = document.querySelector(selector);
                            if (passwordField) break;
                        }
                        
                        // Buscar botón
                        for (let selector of selectors.button) {
                            loginButton = document.querySelector(selector);
                            if (loginButton) break;
                        }
                        
                        console.log('📋 Campos encontrados:', {
                            email: !!emailField,
                            password: !!passwordField, 
                            button: !!loginButton
                        });
                        
                        if (emailField && passwordField && loginButton) {
                            console.log('✅ Todos los campos encontrados, procediendo...');
                            
                            // Limpiar campos primero
                            emailField.value = '';
                            passwordField.value = '';
                            
                            // Rellenar con credenciales
                            emailField.value = '${this.credentials.email}';
                            passwordField.value = '${this.credentials.password}';
                            
                            // Disparar eventos para activar validaciones
                            ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
                                emailField.dispatchEvent(new Event(eventType, { bubbles: true }));
                                passwordField.dispatchEvent(new Event(eventType, { bubbles: true }));
                            });
                            
                            console.log('🔄 Haciendo click en login...');
                            
                            // Hacer click y esperar respuesta
                            loginButton.click();
                            
                            // Esperar redirección y capturar token
                            let tokenCheckInterval = setInterval(() => {
                                console.log('🔍 Buscando token...');
                                
                                // Verificar si salimos de la página de login
                                const currentUrl = window.location.href;
                                console.log('📍 URL actual:', currentUrl);
                                
                                if (!currentUrl.includes('iniciar-sesion')) {
                                    console.log('✅ Redirección detectada, buscando token...');
                                    
                                    // Buscar token en múltiples ubicaciones
                                    let token = null;
                                    
                                    // 1. localStorage
                                    const localStorageToken = localStorage.getItem('sedtoken');
                                    if (localStorageToken) {
                                        try {
                                            const tokenObj = JSON.parse(localStorageToken);
                                            token = tokenObj.token || tokenObj;
                                        } catch {
                                            token = localStorageToken;
                                        }
                                    }
                                    
                                    // 2. sessionStorage
                                    if (!token) {
                                        const sessionToken = sessionStorage.getItem('sedtoken');
                                        if (sessionToken) {
                                            try {
                                                const tokenObj = JSON.parse(sessionToken);
                                                token = tokenObj.token || tokenObj;
                                            } catch {
                                                token = sessionToken;
                                            }
                                        }
                                    }
                                    
                                    // 3. cookies
                                    if (!token) {
                                        const cookieMatch = document.cookie.match(/sedtoken=([^;]+)/);
                                        if (cookieMatch) {
                                            token = cookieMatch[1];
                                        }
                                    }
                                    
                                    // 4. variables globales
                                    if (!token) {
                                        token = window.sedtoken || window.authToken || window.accessToken;
                                    }
                                    
                                    // 5. Headers de red (interceptar fetch/xhr)
                                    if (!token && window.lastAuthHeaders) {
                                        token = window.lastAuthHeaders['X-Auth-Token'] || 
                                               window.lastAuthHeaders['Authorization'];
                                    }
                                    
                                    clearInterval(tokenCheckInterval);
                                    
                                    if (token && token.length > 10) {
                                        console.log('🎉 Token encontrado:', token.substring(0, 20) + '...');
                                        window.ReactNativeWebView.postMessage(JSON.stringify({
                                            type: 'TOKEN_SUCCESS',
                                            token: token,
                                            timestamp: Date.now()
                                        }));
                                    } else {
                                        console.log('❌ Token no encontrado después del login');
                                        window.ReactNativeWebView.postMessage(JSON.stringify({
                                            type: 'TOKEN_ERROR',
                                            error: 'Login exitoso pero token no encontrado'
                                        }));
                                    }
                                }
                            }, 1000);
                            
                            // Timeout para el token check
                            setTimeout(() => {
                                clearInterval(tokenCheckInterval);
                                if (window.location.href.includes('iniciar-sesion')) {
                                    console.log('⏰ Timeout: Login no completado');
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'LOGIN_ERROR',
                                        error: 'Login timeout - verificar credenciales'
                                    }));
                                }
                            }, 15000);
                            
                        } else {
                            console.log('❌ Campos no encontrados, reintentando...');
                            
                            if (intentos < maxIntentos) {
                                setTimeout(intentarLogin, 2000);
                            } else {
                                console.log('❌ Max intentos alcanzado');
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'LOGIN_ERROR',
                                    error: 'No se encontraron campos de login después de ' + maxIntentos + ' intentos'
                                }));
                            }
                        }
                    }
                    
                    // Interceptar requests para capturar headers de autenticación
                    const originalFetch = window.fetch;
                    window.fetch = function(...args) {
                        return originalFetch.apply(this, args).then(response => {
                            const authHeader = response.headers.get('X-Auth-Token') || 
                                             response.headers.get('Authorization');
                            if (authHeader) {
                                window.lastAuthHeaders = { 'X-Auth-Token': authHeader };
                            }
                            return response;
                        });
                    };
                    
                    // Empezar intentos después de que la página cargue
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', () => {
                            setTimeout(intentarLogin, 1000);
                        });
                    } else {
                        setTimeout(intentarLogin, 1000);
                    }
                    
                })();
            `;

            this.loginScript = loginScript;
            
            return new Promise((resolve, reject) => {
                this.loginResolve = resolve;
                this.loginReject = reject;
                console.log('📱 Script de login avanzado preparado');
            });

        } catch (error) {
            this.loginInProgress = false;
            console.error('❌ Error preparando login:', error);
            throw error;
        }
    }

    handleWebViewMessage(message) {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'TOKEN_SUCCESS':
                    console.log('✅ Token fresco obtenido exitosamente!');
                    this.sedtoken = data.token;
                    this.tokenExpiry = Date.now() + (60 * 60 * 1000); // Expira en 1 hora
                    this.loginInProgress = false;
                    
                    if (this.loginResolve) {
                        this.loginResolve(data.token);
                    }
                    break;
                    
                case 'TOKEN_ERROR':
                case 'LOGIN_ERROR':
                case 'SCRIPT_ERROR':
                    console.error('❌ Error en login:', data.error);
                    this.loginInProgress = false;
                    
                    if (this.loginReject) {
                        this.loginReject(new Error(data.error));
                    }
                    break;
                    
                default:
                    console.log('📄 Mensaje WebView:', data);
            }
        } catch (error) {
            console.error('❌ Error procesando mensaje WebView:', error);
            this.loginInProgress = false;
        }
    }

    isTokenValid() {
        return this.sedtoken && 
               this.tokenExpiry && 
               Date.now() < this.tokenExpiry;
    }

    async waitForLogin() {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (!this.loginInProgress) {
                    clearInterval(checkInterval);
                    if (this.sedtoken) {
                        resolve(this.sedtoken);
                    } else {
                        reject(new Error('Login failed'));
                    }
                }
            }, 100);
            
            // Timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Login timeout'));
            }, 30000);
        });
    }

    clearToken() {
        console.log('🗑️ Limpiando token...');
        this.sedtoken = null;
        this.tokenExpiry = null;
        this.loginInProgress = false;
    }

    getToken() {
        return this.sedtoken;
    }
}

export const loginService = new LoginService();