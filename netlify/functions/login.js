exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-control-Allow-Origin': '*',
        'Access-control-Allow-Headers': 'Content-Type',
        'Access-control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Manejar preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Solo aceptar métodos POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Método no permitido. Use POST.'
            })
        };
    }

    try {
        // Parsear el body de la petición
        const { username, password } = JSON.parse(event.body);

        // Validar que se enviaron ambos campos
        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Username y password son requeridos.'
                })
            };
        }

        // Obtener credenciales desde variables de entorno
        const validUsername = process.env.ADMIN_USER;
        const validPassword = process.env.ADMIN_PASS;

        // Verificar que las variables de entorno estén configuradas
        if (!validUsername || !validPassword) {
            console.error('ALERTA: Las variables de entorno ADMIN_USER o ADMIN_PASS no están configuradas en Netlify.');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Error de configuración del servidor. Faltan variables de entorno.'
                })
            };
        }

        // Log para diagnóstico (mantener para futuras depuraciones)
        console.log(`[LOGIN] Intento de login recibido.`);
        console.log(`[LOGIN] Usuario esperado: '${validUsername}'`);
        console.log(`[LOGIN] Usuario recibido: '${username}'`);
        console.log(`[LOGIN] Contraseña esperada: '${validPassword}'`);
        console.log(`[LOGIN] Contraseña recibida: '${password}'`);
        console.log(`[LOGIN] Longitud contraseña esperada: ${validPassword.length}`);
        console.log(`[LOGIN] Longitud contraseña recibida: ${password.length}`);
        
        // Verificar credenciales
        if (username === validUsername && password === validPassword) {
            console.log(`[LOGIN] ¡ÉXITO! Credenciales correctas.`);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Login exitoso',
                    user: username
                })
            };
        } else {
            console.log(`[LOGIN] ¡FALLO! Credenciales incorrectas.`);
            console.log(`[LOGIN] Usuario coincide: ${username === validUsername}`);
            console.log(`[LOGIN] Contraseña coincide: ${password === validPassword}`);
            console.log(`[LOGIN] Comparación directa usuario: "${username}" === "${validUsername}"`);
            console.log(`[LOGIN] Comparación directa contraseña: "${password}" === "${validPassword}"`);
            
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Credenciales incorrectas'
                })
            };
        }

    } catch (error) {
        console.error('Error catastrófico en la función login:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: `Error interno del servidor: ${error.message}`
            })
        };
    }
};