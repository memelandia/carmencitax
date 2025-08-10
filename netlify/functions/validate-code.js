const { codesTable, premiosStringToArray, corsHeaders } = require('./utils/airtable');

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
        
        // Buscar código en Airtable
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
        
        const codeData = records[0].fields;
        const tiradasRestantes = codeData['Tiradas Restantes'] || 0;
        
        // Verificar si el código tiene tiradas disponibles
        if (codeData.Usado || tiradasRestantes <= 0) {
            return { 
                statusCode: 403, 
                headers: corsHeaders, 
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Este código ya ha sido utilizado o no tiene tiradas disponibles' 
                }) 
            };
        }
        
        // Retornar datos del código válido
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: {
                    nombreFan: codeData['Nombre Fan'],
                    premios: premiosStringToArray(codeData.Premios),
                    tiradasRestantes: tiradasRestantes
                }
            })
        };
    } catch (error) {
        console.error('Error en validate-code:', error);
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