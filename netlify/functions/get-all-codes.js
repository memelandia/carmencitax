const { codesTable, premiosStringToArray, corsHeaders } = require('./utils/airtable');

exports.handler = async (event) => {
    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders };
    }

    try {
        const records = await codesTable.select().all();
        const formattedCodes = records.map((record) => ({
            codigoId: record.fields.ID,
            nombre: record.fields['Nombre Fan'],
            premios: premiosStringToArray(record.fields.Premios),
            usado: record.fields.Usado || false,
            tiradasTotales: record.fields['Tiradas Totales'] || 0,
            tiradasRestantes: record.fields['Tiradas Restantes'] || 0
        }));

        return { 
            statusCode: 200, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: true, data: formattedCodes }) 
        };
    } catch (error) {
        console.error('Error en get-all-codes:', error);
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