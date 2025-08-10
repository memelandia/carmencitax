const { codesTable, corsHeaders } = require('./utils/airtable');

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
        const { codigoId } = JSON.parse(event.body);
        
        if (!codigoId) {
            return { 
                statusCode: 400, 
                headers: corsHeaders, 
                body: JSON.stringify({ success: false, message: 'El campo codigoId es requerido.' }) 
            };
        }

        // Buscar el código en Airtable
        const records = await codesTable.select({ 
            maxRecords: 1, 
            filterByFormula: `{ID} = '${codigoId}'` 
        }).firstPage();
        
        if (records.length === 0) {
            return { 
                statusCode: 404, 
                headers: corsHeaders, 
                body: JSON.stringify({ success: false, message: 'Código no encontrado para reactivar' }) 
            };
        }
        
        const record = records[0];
        const tiradasTotales = record.fields['Tiradas Totales'] || 0;
        
        // Reactivar el código usando sintaxis robusta
        await codesTable.update([{
            id: records[0].id,
            fields: { 
                "Usado": false,
                "Tiradas Restantes": tiradasTotales
            }
        }]);

        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: true, message: 'Código reactivado con éxito.' }) 
        };
    } catch (error) {
        console.error('Error en reactivate-code:', error);
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