exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Método no permitido. Use GET.'
            })
        };
    }

    try {
        const adminUser = process.env.ADMIN_USER;
        const adminPass = process.env.ADMIN_PASS;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: {
                    adminUserExists: !!adminUser,
                    adminPassExists: !!adminPass,
                    adminUserLength: adminUser ? adminUser.length : 0,
                    adminPassLength: adminPass ? adminPass.length : 0,
                    adminUserValue: adminUser, // SOLO para debugging - REMOVER en producción
                    adminPassFirstChar: adminPass ? adminPass.charAt(0) : 'N/A',
                    adminPassLastChar: adminPass ? adminPass.charAt(adminPass.length - 1) : 'N/A'
                }
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message
            })
        };
    }
};
