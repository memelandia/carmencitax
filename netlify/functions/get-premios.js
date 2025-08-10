const Airtable = require('airtable');

// Función auxiliar para convertir string de premios a array
function premiosStringToArray(premiosString) {
    if (!premiosString || typeof premiosString !== 'string') {
        return [];
    }
    return premiosString.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

exports.handler = async (event, context) => {
    // Configurar headers CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight OK' })
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Método no permitido' })
        };
    }

    try {
        // Configurar conexión a Airtable
        const base = new Airtable({
            apiKey: process.env.AIRTABLE_API_KEY
        }).base(process.env.AIRTABLE_BASE_ID);

        const configTable = base('Configuraciones');

        // Obtener configuración desde la tabla centralizada
        const records = await configTable.select({
            maxRecords: 1
        }).firstPage();

        if (records.length === 0) {
            // No hay configuración, retornar premios por defecto
            const premiosPorDefecto = [
                { id: 'default-1', nombre: 'Premio Sorpresa' },
                { id: 'default-2', nombre: 'Pack Fotos Hot' },
                { id: 'default-3', nombre: 'Videollamada 5 minutos' }
            ];

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: premiosPorDefecto
                })
            };
        }

        // Obtener premios de la configuración
        const configRecord = records[0];
        const premiosString = configRecord.fields['Premios'] || '';
        const premiosArray = premiosStringToArray(premiosString);

        // Convertir a formato esperado por el frontend (con ID)
        const premiosFormateados = premiosArray.map((premio, index) => ({
            id: `premio-${index + 1}`,
            nombre: premio
        }));

        // Si no hay premios configurados, usar por defecto
        if (premiosFormateados.length === 0) {
            const premiosPorDefecto = [
                { id: 'default-1', nombre: 'Premio Sorpresa' },
                { id: 'default-2', nombre: 'Pack Fotos Hot' },
                { id: 'default-3', nombre: 'Videollamada 5 minutos' }
            ];

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: premiosPorDefecto
                })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                data: premiosFormateados
            })
        };

    } catch (error) {
        console.error('Error al obtener premios:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Error interno del servidor: ' + error.message
            })
        };
    }
};
