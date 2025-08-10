const { getTable, premiosStringToArray, premiosArrayToString, corsHeaders } = require('./utils/airtable');

// La tabla 'Configuraciones' debe tener los campos: 'Nombre Modelo' (Single line text), 'avatarURL' (Long text), 'Premios' (Long text).
// y debe contener una única fila de registro para que esto funcione.

exports.handler = async (event) => {
    // Manejar preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders };
    }

    const configTable = getTable('Configuraciones');

    try {
        // Obtenemos siempre la primera (y única) fila de configuración.
        const records = await configTable.select({ maxRecords: 1 }).firstPage();
        
        let record;
        // Si no existe ninguna fila de configuración, creamos una al vuelo.
        if (records.length === 0) {
            const [newRecord] = await configTable.create([{
                fields: {
                    'Nombre Modelo': 'Nombre por Defecto',
                    'avatarURL': '',
                    'Premios': 'Premio A, Premio B, Premio C'
                }
            }]);
            record = newRecord;
        } else {
            record = records[0];
        }
        
        const recordId = record.id; // ID interno de Airtable (ej: recXXXXXXXX)

        // ===== LÓGICA GET (Leer Configuración) =====
        if (event.httpMethod === 'GET') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: {
                        nombreModelo: record.fields['Nombre Modelo'],
                        avatarURL: record.fields.avatarURL || '',
                        premios: premiosStringToArray(record.fields.Premios)
                    }
                })
            };
        }

        // ===== LÓGICA POST (Actualizar Configuración) =====
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { nuevoNombreModelo, nuevaAvatarURL, nuevaListaPremios } = body;
            const fieldsToUpdate = {};

            // Construir el objeto de actualización solo con los campos que se enviaron
            if (nuevoNombreModelo !== undefined) {
                fieldsToUpdate['Nombre Modelo'] = nuevoNombreModelo;
            }
            if (nuevaAvatarURL !== undefined) {
                // El nombre aquí DEBE coincidir con el nombre de la columna en Airtable
                fieldsToUpdate['avatarURL'] = nuevaAvatarURL; 
            }
            if (nuevaListaPremios !== undefined) {
                fieldsToUpdate['Premios'] = premiosArrayToString(nuevaListaPremios);
            }

            // Si hay algo que actualizar, procedemos
            if (Object.keys(fieldsToUpdate).length > 0) {
                // Usamos la sintaxis de array que es más robusta.
                await configTable.update([{
                    id: recordId,
                    fields: fieldsToUpdate
                }]);
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, message: 'Configuración actualizada con éxito.' })
            };
        }

        return { 
            statusCode: 405, 
            headers: corsHeaders, 
            body: JSON.stringify({ success: false, message: 'Método no permitido' }) 
        };

    } catch (error) {
        console.error("Error en config-manager:", error);
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
