const { codesTable, premiosArrayToString, corsHeaders } = require('./utils/airtable');

exports.handler = async (event) => {
    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: false, message: 'Método no permitido' }) 
        };
    }

    try {
        const { codigoId, nombreFan, premios } = JSON.parse(event.body);
        
        // Validación de datos requeridos
        if (!codigoId || !nombreFan || !premios || !Array.isArray(premios)) {
            return { 
                statusCode: 400, 
                headers: corsHeaders, 
                body: JSON.stringify({ success: false, message: 'Faltan datos requeridos o formato incorrecto.' }) 
            };
        }

        const totalTiradas = premios.length;
        const data = {
            "ID": codigoId,
            "Nombre Fan": nombreFan,
            "Premios": premiosArrayToString(premios),
            "Tiradas Totales": totalTiradas,
            "Tiradas Restantes": totalTiradas,
            "Usado": false
        };

        // Verificar si el código ya existe
        const existingRecords = await codesTable.select({ 
            maxRecords: 1, 
            filterByFormula: `{ID} = '${codigoId}'` 
        }).firstPage();
        
        let operation;
        if (existingRecords.length > 0) {
            // Actualizar código existente usando sintaxis robusta
            await codesTable.update([{
                id: existingRecords[0].id,
                fields: data
            }]);
            operation = 'updated';
        } else {
            // Crear nuevo código usando sintaxis de array
            await codesTable.create([{ fields: data }]);
            operation = 'created';
        }

        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ 
                success: true, 
                message: `Código ${operation} con éxito`, 
                operation 
            }) 
        };
    } catch (error) {
        console.error('Error en create-code:', error);
        return { 
            statusCode: 500, 
            headers: corsHeaders, 
            body: JSON.stringify({ 
                success: false, 
                message: 'Error interno del servidor: ' + error.message 
            }) 
        };
    }
};