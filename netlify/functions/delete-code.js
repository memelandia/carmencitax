const { codesTable, corsHeaders } = require('./utils/airtable');

exports.handler = async (event) => {
    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders };
    }

    if (event.httpMethod !== 'DELETE') {
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
                body: JSON.stringify({ success: false, message: 'Código no encontrado para eliminar' }) 
            };
        }

        // Eliminar el código
        await codesTable.destroy(records[0].id);

        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: true, message: 'Código eliminado con éxito.' }) 
        };
    } catch (error) {
        console.error('Error en delete-code:', error);
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