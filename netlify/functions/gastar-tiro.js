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

        // Buscar el registro del código
        const records = await codesTable.select({
            maxRecords: 1,
            filterByFormula: `{ID} = '${codigoId}'`
        }).firstPage();

        if (records.length === 0) {
            return { 
                statusCode: 404, 
                headers: corsHeaders, 
                body: JSON.stringify({ success: false, message: 'Código no encontrado' }) 
            };
        }

        const record = records[0];
        const tiradasRestantesActuales = record.fields['Tiradas Restantes'] || 0;

        if (tiradasRestantesActuales <= 0) {
            return { 
                statusCode: 400, 
                headers: corsHeaders, 
                body: JSON.stringify({ success: false, message: 'No quedan tiradas disponibles' }) 
            };
        }

        // Calcular nuevas tiradas restantes
        const nuevasTiradasRestantes = tiradasRestantesActuales - 1;
        
        // Preparar datos a actualizar
        const updateData = {
            'Tiradas Restantes': nuevasTiradasRestantes
        };

        // Si llega a 0, marcar como usado
        if (nuevasTiradasRestantes === 0) {
            updateData['Usado'] = true;
        }

        // Actualizar el registro usando sintaxis robusta
        await codesTable.update([{
            id: record.id,
            fields: updateData
        }]);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Tiro gastado exitosamente',
                tiradasRestantes: nuevasTiradasRestantes,
                codigoExpirado: nuevasTiradasRestantes === 0
            })
        };

    } catch (error) {
        console.error('Error en gastar-tiro:', error);
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
